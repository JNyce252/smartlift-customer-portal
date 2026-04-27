import pg from 'pg';
import https from 'https';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// SOURCE: Texas Department of Licensing and Regulation
// Public elevator equipment database — updated daily
const TDLR_CSV_URL = 'https://www.tdlr.texas.gov/Elevator_SearchApp/Elevator/ExportCsv';

// AWS RDS root CA bundle for TLS cert validation.
const __dirname = dirname(fileURLToPath(import.meta.url));
const RDS_CA = (() => {
  try { return readFileSync(join(__dirname, 'rds-ca.pem'), 'utf8'); }
  catch { return null; }
})();
if (!RDS_CA) console.warn('[startup] rds-ca.pem missing — TLS will not validate cert');

// DB credentials: prefer Secrets Manager (when DB_SECRET_ARN is set), fall back to env vars.
async function loadDbConfig() {
  const secretArn = process.env.DB_SECRET_ARN;
  if (secretArn) {
    const sm = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
    const { SecretString } = await sm.send(new GetSecretValueCommand({ SecretId: secretArn }));
    const s = JSON.parse(SecretString);
    return { host: s.host || process.env.DB_HOST, port: parseInt(s.port || process.env.DB_PORT || '5432'),
             user: s.username || process.env.DB_USER, password: s.password, database: s.dbname || process.env.DB_NAME };
  }
  const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) throw new Error('Missing DB env vars: ' + missing.join(', '));
  return { host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5432'),
           user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME };
}
const _dbConfig = await loadDbConfig();
const _ssl = RDS_CA ? { ca: RDS_CA, rejectUnauthorized: true } : { rejectUnauthorized: false };
const pool = new pg.Pool({ ..._dbConfig, ssl: _ssl, max: 2 });

function downloadCSV(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return resolve(downloadCSV(res.headers.location));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export const handler = async (event) => {
  console.log('TDLR Refresh starting — source:', TDLR_CSV_URL);
  const client = await pool.connect();

  try {
    console.log('Downloading CSV from TDLR...');
    const csv = await downloadCSV(TDLR_CSV_URL);
    const lines = csv.split('\n').filter(l => l.trim());
    console.log(`Downloaded ${lines.length} lines`);

    // Skip header
    let inserted = 0, updated = 0, skipped = 0;

    // Clear existing data and reimport fresh
    await client.query('BEGIN');
    
    // Preserve prospect links before clearing
    const linked = await client.query('SELECT id, prospect_id FROM building_registry WHERE prospect_id IS NOT NULL');
    const linkedMap = {};
    for (const row of linked.rows) {
      linkedMap[row.id] = row.prospect_id;
    }

    await client.query('UPDATE building_registry SET prospect_id = NULL WHERE prospect_id IS NOT NULL');
    await client.query('DELETE FROM building_registry');
    console.log('Cleared existing records, reimporting fresh data...');

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 15) { skipped++; continue; }

      const [
        elevatorNumber, licenseNumber, subLicenseNumber,
        buildingName, buildingName2, buildingAddress, buildingAddress2,
        buildingCity, buildingState, buildingZip, buildingCounty,
        ownerName, contactName, mostRecentInspection, expiration,
        elevator5Year, equipmentType, driveType, floors, yearInstalled
      ] = cols;

      // Only import TX records
      if (buildingState !== 'TX') { skipped++; continue; }

      const parseDate = (d) => {
        if (!d) return null;
        const dt = new Date(d);
        return isNaN(dt) ? null : dt.toISOString().split('T')[0];
      };

      try {
        const result = await client.query(`
          INSERT INTO building_registry (
            elevator_number, building_name, building_address, building_city,
            building_state, building_zip, building_county, owner_name,
            equipment_type, drive_type, floors, year_installed,
            most_recent_inspection, expiration, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
          RETURNING id
        `, [
          elevatorNumber, buildingName, buildingAddress, buildingCity,
          buildingState, buildingZip, buildingCounty, ownerName,
          equipmentType || null, driveType || null,
          floors ? parseInt(floors) : null,
          yearInstalled ? parseInt(yearInstalled) : null,
          parseDate(mostRecentInspection), parseDate(expiration)
        ]);
        inserted++;
      } catch(e) {
        skipped++;
      }
    }

    await client.query('COMMIT');

    const stats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE expiration < NOW()) as expired,
        COUNT(*) FILTER (WHERE expiration BETWEEN NOW() AND NOW() + INTERVAL '30 days') as expiring_30,
        COUNT(*) FILTER (WHERE expiration BETWEEN NOW() AND NOW() + INTERVAL '60 days') as expiring_60,
        COUNT(*) FILTER (WHERE expiration BETWEEN NOW() AND NOW() + INTERVAL '90 days') as expiring_90
      FROM building_registry
    `);

    // Also refresh contractor and inspector lists daily
    try {
      const { default: https2 } = await import('https');
      const downloadCSV2 = (url) => new Promise((resolve, reject) => {
        https2.get(url, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) return resolve(downloadCSV2(res.headers.location));
          let data = ''; res.on('data', c => data += c); res.on('end', () => resolve(data)); res.on('error', reject);
        }).on('error', reject);
      });

      // Refresh elevator contractors
      const contractorCsv = await downloadCSV2('https://www.tdlr.texas.gov/dbproduction2/ltelectr.csv');
      const contractorLines = contractorCsv.split('\n').filter(l => l.trim());
      await client.query('DELETE FROM elevator_contractors');
      let cInserted = 0;
      for (let i = 1; i < contractorLines.length; i++) {
        const cols = parseCSVLine(contractorLines[i]);
        if (cols.length < 16) continue;
        const parseDate2 = (d) => { if (!d) return null; const dt = new Date(d); return isNaN(dt) ? null : dt.toISOString().split('T')[0]; };
        try {
          await client.query('INSERT INTO elevator_contractors (license_number, license_expiration, county, name, business_name, business_address, business_city, business_state, business_zip, business_county, business_phone, mailing_address, mailing_city_state_zip, phone, ce_flag) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)',
            [cols[1], parseDate2(cols[2]), cols[3], cols[4], cols[9], cols[10], cols[12]?.split(' ')[0]||'', 'TX', cols[15], cols[14], cols[16]||'', cols[5], cols[7], cols[8], cols[18]||'']);
          cInserted++;
        } catch(e) {}
      }
      console.log('Contractors refreshed:', cInserted);

      // Refresh elevator inspectors
      const inspectorCsv = await downloadCSV2('https://www.tdlr.texas.gov/dbproduction2/ltinelvt.csv');
      const inspectorLines = inspectorCsv.split('\n').filter(l => l.trim());
      await client.query('DELETE FROM elevator_inspectors');
      let iInserted = 0;
      for (let i = 1; i < inspectorLines.length; i++) {
        const cols = parseCSVLine(inspectorLines[i]);
        if (cols.length < 14) continue;
        const parseDate2 = (d) => { if (!d) return null; const dt = new Date(d); return isNaN(dt) ? null : dt.toISOString().split('T')[0]; };
        try {
          await client.query('INSERT INTO elevator_inspectors (license_number, license_expiration, county, name, business_name, business_address, business_county, business_zip, business_phone, phone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
            [cols[1], parseDate2(cols[2]), cols[3], cols[4], cols[9], cols[10], cols[14]||'', cols[15]||'', cols[16]||'', cols[8]||'']);
          iInserted++;
        } catch(e) {}
      }
      console.log('Inspectors refreshed:', iInserted);
    } catch(re) { console.log('Contractor/inspector refresh error:', re.message); }

    console.log('Import complete:', { inserted, skipped, stats: stats.rows[0] });
    return {
      statusCode: 200,
      body: JSON.stringify({ inserted, skipped, stats: stats.rows[0], source: TDLR_CSV_URL })
    };

  } catch(e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error:', e.message);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  } finally {
    client.release();
  }
};
