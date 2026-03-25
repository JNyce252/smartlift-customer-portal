import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

const respond = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

export const handler = async (event) => {
  const path = event.rawPath || event.path || '';
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';

  if (method === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    if (path === '/health' || path === '/') {
      const result = await pool.query('SELECT NOW() as time, current_database() as db');
      return respond(200, { message: 'SmartLift API is running', database: result.rows[0] });
    }

    if (path === '/customers' && method === 'GET') {
      const result = await pool.query(`
        SELECT c.id, c.company_name as name, c.primary_contact_name,
          c.primary_contact_email, c.primary_contact_phone,
          c.address, c.city, c.state, c.account_status,
          COUNT(DISTINCT e.id) as elevator_count
        FROM customers c
        LEFT JOIN elevators e ON e.customer_id = c.id
        GROUP BY c.id ORDER BY c.company_name LIMIT 20
      `);
      return respond(200, result.rows);
    }

    if (path === '/elevators' && method === 'GET') {
      const result = await pool.query(`
        SELECT e.*, c.company_name as customer_name
        FROM elevators e
        LEFT JOIN customers c ON c.id = e.customer_id
        ORDER BY e.id LIMIT 50
      `);
      return respond(200, result.rows);
    }

    if (path === '/prospects' && method === 'GET') {
      const result = await pool.query(`
        SELECT p.*, ei.service_urgency, ei.common_issues, ei.reputation_score,
          ei.sentiment_score, ei.ai_summary, ei.estimated_elevators
        FROM prospects p
        LEFT JOIN elevator_intelligence ei ON ei.prospect_id = p.id
        ORDER BY p.lead_score DESC NULLS LAST LIMIT 50
      `);
      return respond(200, result.rows);
    }

    const prospectMatch = path.match(/^\/prospects\/(\d+)$/);
    if (prospectMatch && method === 'GET') {
      const pid = prospectMatch[1];
      const result = await pool.query(`
        SELECT p.*, ei.sentiment_score, ei.service_urgency, ei.common_issues,
          ei.reputation_score, ei.estimated_floors, ei.estimated_elevators,
          ei.building_age, ei.modernization_candidate, ei.ai_summary,
          ei.ai_recommendation, ei.ai_scored_at
        FROM prospects p
        LEFT JOIN elevator_intelligence ei ON ei.prospect_id = p.id
        WHERE p.id = $1
      `, [pid]);
      if (result.rows.length === 0) return respond(404, { error: 'Prospect not found' });
      return respond(200, result.rows[0]);
    }

    if (path === '/tickets' && method === 'GET') {
      const result = await pool.query(`
        SELECT st.*, c.company_name as customer_name, e.elevator_identifier
        FROM service_tickets st
        LEFT JOIN customers c ON c.id = st.customer_id
        LEFT JOIN elevators e ON e.id = st.elevator_id
        ORDER BY st.created_at DESC NULLS LAST LIMIT 50
      `);
      return respond(200, result.rows);
    }

    if (path === '/tickets' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { elevator_id, customer_id, title, description, priority, reported_by, status } = body;
      if (!elevator_id || !title || !description) {
        return respond(400, { error: 'elevator_id, title, and description are required' });
      }
      let cid = customer_id;
      if (!cid) {
        const elev = await pool.query('SELECT customer_id FROM elevators WHERE id = $1', [elevator_id]);
        cid = elev.rows[0]?.customer_id;
      }
      const count = await pool.query('SELECT COUNT(*) FROM service_tickets');
      const ticketNumber = `TKT-${String(parseInt(count.rows[0].count) + 1).padStart(4, '0')}`;
      const result = await pool.query(`
        INSERT INTO service_tickets
          (ticket_number, elevator_id, customer_id, title, description, priority, status, reported_by, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW()) RETURNING *
      `, [ticketNumber, elevator_id, cid, title, description, priority || 'medium', status || 'open', reported_by || 'Customer Portal']);
      return respond(201, result.rows[0]);
    }

    if (path === '/maintenance' && method === 'GET') {
      const result = await pool.query(`
        SELECT ml.*, e.elevator_identifier, c.company_name as customer_name
        FROM maintenance_logs ml
        LEFT JOIN elevators e ON e.id = ml.elevator_id
        LEFT JOIN customers c ON c.id = e.customer_id
        ORDER BY ml.service_date DESC NULLS LAST LIMIT 50
      `);
      return respond(200, result.rows);
    }

    if (path === '/invoices' && method === 'GET') {
      const result = await pool.query(`
        SELECT i.*, c.company_name as customer_name
        FROM invoices i
        LEFT JOIN customers c ON c.id = i.customer_id
        ORDER BY i.created_at DESC NULLS LAST LIMIT 50
      `);
      return respond(200, result.rows);
    }

    return respond(404, { error: 'Not found', path, method });

  } catch (error) {
    console.error('Error:', error);
    return respond(500, { error: error.message });
  }
};
