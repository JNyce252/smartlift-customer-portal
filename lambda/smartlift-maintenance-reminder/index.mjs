import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import pg from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ses = new SESClient({ region: 'us-east-1' });

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
const pool = new pg.Pool({ ..._dbConfig, ssl: _ssl, max: 1 });

export const handler = async (event) => {
  console.log('Running maintenance reminder check...');
  const client = await pool.connect();
  
  try {
    // Find schedules due in 7 days
    const sevenDays = await client.query(`
      SELECT ms.*, 
        c.company_name as customer_name,
        c.primary_contact_email,
        c.primary_contact_name,
        e.elevator_identifier,
        comp.name as service_company,
        t.name as technician_name,
        t.email as technician_email
      FROM maintenance_schedules ms
      LEFT JOIN customers c ON c.id = ms.customer_id
      LEFT JOIN elevators e ON e.id = ms.elevator_id
      LEFT JOIN companies comp ON comp.id = ms.company_id
      LEFT JOIN technicians t ON t.id = ms.assigned_technician_id
      WHERE ms.status = 'active'
        AND ms.next_due_date IS NOT NULL
        AND ms.next_due_date = CURRENT_DATE + INTERVAL '7 days'
    `);

    // Find schedules due tomorrow
    const tomorrow = await client.query(`
      SELECT ms.*,
        c.company_name as customer_name,
        c.primary_contact_email,
        c.primary_contact_name,
        e.elevator_identifier,
        comp.name as service_company,
        t.name as technician_name,
        t.email as technician_email
      FROM maintenance_schedules ms
      LEFT JOIN customers c ON c.id = ms.customer_id
      LEFT JOIN elevators e ON e.id = ms.elevator_id
      LEFT JOIN companies comp ON comp.id = ms.company_id
      LEFT JOIN technicians t ON t.id = ms.assigned_technician_id
      WHERE ms.status = 'active'
        AND ms.next_due_date IS NOT NULL
        AND ms.next_due_date = CURRENT_DATE + INTERVAL '1 day'
    `);

    // Find overdue schedules
    const overdue = await client.query(`
      SELECT ms.*,
        c.company_name as customer_name,
        c.primary_contact_email,
        e.elevator_identifier,
        comp.name as service_company
      FROM maintenance_schedules ms
      LEFT JOIN customers c ON c.id = ms.customer_id
      LEFT JOIN elevators e ON e.id = ms.elevator_id
      LEFT JOIN companies comp ON comp.id = ms.company_id
      WHERE ms.status = 'active'
        AND ms.next_due_date IS NOT NULL
        AND ms.next_due_date < CURRENT_DATE
        AND ms.next_due_date > CURRENT_DATE - INTERVAL '1 day'
    `);

    const allSchedules = [
      ...sevenDays.rows.map(r => ({ ...r, urgency: '7 days' })),
      ...tomorrow.rows.map(r => ({ ...r, urgency: 'tomorrow' })),
      ...overdue.rows.map(r => ({ ...r, urgency: 'OVERDUE' })),
    ];

    console.log(`Found ${allSchedules.length} schedules to notify`);

    // Group by company
    const byCompany = {};
    for (const s of allSchedules) {
      const key = s.company_id;
      if (!byCompany[key]) byCompany[key] = { company: s.service_company, schedules: [] };
      byCompany[key].schedules.push(s);
    }

    // Get company owner emails
    for (const [companyId, data] of Object.entries(byCompany)) {
      const ownerResult = await client.query(
        'SELECT email FROM company_users WHERE company_id = $1 LIMIT 1',
        [companyId]
      );
      if (!ownerResult.rows.length) continue;
      const ownerEmail = ownerResult.rows[0].email;

      const overdueItems = data.schedules.filter(s => s.urgency === 'OVERDUE');
      const tomorrowItems = data.schedules.filter(s => s.urgency === 'tomorrow');
      const sevenItems = data.schedules.filter(s => s.urgency === '7 days');

      const renderRow = (s, bgColor) => `
        <tr style="background:${bgColor}">
          <td style="padding:10px 12px;color:#fff;font-size:13px">${s.schedule_type}</td>
          <td style="padding:10px 12px;color:#aaa;font-size:13px">${s.customer_name || 'N/A'}</td>
          <td style="padding:10px 12px;color:#aaa;font-size:13px">${s.elevator_identifier || 'All elevators'}</td>
          <td style="padding:10px 12px;color:#aaa;font-size:13px">${s.technician_name || 'Unassigned'}</td>
          <td style="padding:10px 12px;font-size:13px;font-weight:700;color:${s.urgency === 'OVERDUE' ? '#f87171' : s.urgency === 'tomorrow' ? '#fbbf24' : '#60a5fa'}">${s.urgency === 'OVERDUE' ? 'OVERDUE' : s.urgency === 'tomorrow' ? 'Tomorrow' : 'In 7 days'}</td>
        </tr>`;

      const htmlEmail = `
        <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;background:#0a0a10;color:#f5f5f0;padding:20px">
          <div style="border-bottom:2px solid #7C3AED;padding-bottom:16px;margin-bottom:24px">
            <h2 style="color:#A78BFA;margin:0;font-size:20px">🔔 Maintenance Reminder</h2>
            <p style="color:#666;margin:4px 0 0;font-size:13px">Smarterlift · ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>

          ${overdueItems.length > 0 ? `
          <div style="background:#1a0505;border:1px solid #7f1d1d;border-radius:8px;padding:16px;margin-bottom:16px">
            <h3 style="color:#f87171;margin:0 0 12px;font-size:13px;letter-spacing:2px;text-transform:uppercase">⚠ Overdue — Action Required</h3>
            <table style="width:100%;border-collapse:collapse">
              <tr style="background:#0d0d0d"><th style="padding:8px 12px;color:#666;font-size:11px;text-align:left;letter-spacing:1px;text-transform:uppercase">Service</th><th style="padding:8px 12px;color:#666;font-size:11px;text-align:left">Customer</th><th style="padding:8px 12px;color:#666;font-size:11px;text-align:left">Elevator</th><th style="padding:8px 12px;color:#666;font-size:11px;text-align:left">Technician</th><th style="padding:8px 12px;color:#666;font-size:11px;text-align:left">Status</th></tr>
              ${overdueItems.map(s => renderRow(s, '#1a0505')).join('')}
            </table>
          </div>` : ''}

          ${tomorrowItems.length > 0 ? `
          <div style="background:#1a1200;border:1px solid #78350f;border-radius:8px;padding:16px;margin-bottom:16px">
            <h3 style="color:#fbbf24;margin:0 0 12px;font-size:13px;letter-spacing:2px;text-transform:uppercase">⏰ Due Tomorrow</h3>
            <table style="width:100%;border-collapse:collapse">
              <tr style="background:#0d0d0d"><th style="padding:8px 12px;color:#666;font-size:11px;text-align:left;letter-spacing:1px;text-transform:uppercase">Service</th><th style="padding:8px 12px;color:#666;font-size:11px;text-align:left">Customer</th><th style="padding:8px 12px;color:#666;font-size:11px;text-align:left">Elevator</th><th style="padding:8px 12px;color:#666;font-size:11px;text-align:left">Technician</th><th style="padding:8px 12px;color:#666;font-size:11px;text-align:left">Status</th></tr>
              ${tomorrowItems.map(s => renderRow(s, '#1a1200')).join('')}
            </table>
          </div>` : ''}

          ${sevenItems.length > 0 ? `
          <div style="background:#0d0d1a;border:1px solid #1e3a5f;border-radius:8px;padding:16px;margin-bottom:16px">
            <h3 style="color:#60a5fa;margin:0 0 12px;font-size:13px;letter-spacing:2px;text-transform:uppercase">📅 Due in 7 Days</h3>
            <table style="width:100%;border-collapse:collapse">
              <tr style="background:#0d0d0d"><th style="padding:8px 12px;color:#666;font-size:11px;text-align:left;letter-spacing:1px;text-transform:uppercase">Service</th><th style="padding:8px 12px;color:#666;font-size:11px;text-align:left">Customer</th><th style="padding:8px 12px;color:#666;font-size:11px;text-align:left">Elevator</th><th style="padding:8px 12px;color:#666;font-size:11px;text-align:left">Technician</th><th style="padding:8px 12px;color:#666;font-size:11px;text-align:left">Status</th></tr>
              ${sevenItems.map(s => renderRow(s, '#0d0d1a')).join('')}
            </table>
          </div>` : ''}

          <div style="background:#1a1000;border:1px solid #7C3AED;border-radius:8px;padding:16px;text-align:center">
            <a href="https://smarterlift.app/internal/maintenance-scheduling" style="display:inline-block;padding:12px 28px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
              View Maintenance Schedule →
            </a>
          </div>

          <hr style="border-color:#1a1a1a;margin:20px 0"/>
          <p style="color:#444;font-size:11px;text-align:center">Smarterlift · smarterlift.app · Automated maintenance reminder</p>
        </div>
      `;

      await ses.send(new SendEmailCommand({
        Source: 'derald@swcabs.com',
        Destination: { ToAddresses: [ownerEmail] },
        Message: {
          Subject: { Data: `🔔 Maintenance Reminder — ${data.schedules.length} service${data.schedules.length > 1 ? 's' : ''} ${overdueItems.length > 0 ? 'OVERDUE' : 'coming up'}` },
          Body: { Html: { Data: htmlEmail }, Text: { Data: `Maintenance reminder: ${data.schedules.length} services require attention. Visit smarterlift.app for details.` } }
        }
      }));

      console.log(`Sent reminder to ${ownerEmail} for ${data.schedules.length} schedules`);
    }

    return { statusCode: 200, body: JSON.stringify({ notified: allSchedules.length }) };
  } finally {
    client.release();
  }
};
