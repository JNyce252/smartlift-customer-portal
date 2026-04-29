import pg from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const { Pool } = pg;

// AWS RDS root CA bundle for TLS cert validation.
const __dirname = dirname(fileURLToPath(import.meta.url));
const RDS_CA = (() => {
  try { return readFileSync(join(__dirname, 'rds-ca.pem'), 'utf8'); }
  catch { return null; }
})();
if (!RDS_CA) console.warn('[startup] rds-ca.pem missing — TLS will not validate cert');

// Server-side Google Maps API key (Place Details). Set as Lambda env var GOOGLE_MAPS_KEY.
// Recommend restricting this key by API + IP allowlist (Lambda outbound CIDRs) in GCP.
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY;
if (!GOOGLE_MAPS_KEY) throw new Error('Missing required env var: GOOGLE_MAPS_KEY');

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
const pool = new Pool({ ..._dbConfig, ssl: _ssl });

// Hash the actual review text content (deterministic — sorted by relative_time
// + rating to avoid Google's ordering jitter changing the hash). When the hash
// matches what's stored on the prospect, both the Google fetch AND the
// Bedrock call already happened on this exact review set; skip the Bedrock part.
import { createHash } from 'node:crypto';
const computeReviewsHash = (reviews) => {
  const norm = reviews.map(r => ({
    text: r.text || '',
    rating: r.rating || 0,
    when: r.relative_time_description || '',
  })).sort((a, b) => (a.text + a.when).localeCompare(b.text + b.when));
  return createHash('sha256').update(JSON.stringify({ reviews: norm, prompt_version: 'v1-opus-4-7' })).digest('hex');
};

export const handler = async (event) => {
  const { prospect_id, place_id } = event;
  const force = event.force === true;
  console.log('Analyzing reviews for prospect:', prospect_id, 'place_id:', place_id, 'force:', force);
  try {
    const reviewRes = await fetch('https://maps.googleapis.com/maps/api/place/details/json?place_id=' + encodeURIComponent(place_id) + '&fields=reviews,name&key=' + GOOGLE_MAPS_KEY);
    const reviewData = await reviewRes.json();
    if (!reviewData.result || !reviewData.result.reviews || !reviewData.result.reviews.length) {
      console.log('No reviews found'); return { status: 'no_reviews' };
    }
    const reviews = reviewData.result.reviews;
    console.log('Found', reviews.length, 'reviews');

    // Cache check — if the review set hasn't changed since the last time we
    // analyzed this prospect, skip Bedrock and return the prior result.
    const reviewsHash = computeReviewsHash(reviews);
    if (!force && prospect_id) {
      const prior = await pool.query(
        'SELECT reviews_input_hash, reviews_analyzed_at FROM prospects WHERE id = $1',
        [prospect_id]
      );
      if (prior.rows[0]?.reviews_input_hash === reviewsHash) {
        const ei = await pool.query(
          'SELECT review_intelligence FROM elevator_intelligence WHERE prospect_id = $1',
          [prospect_id]
        );
        const cached = ei.rows[0]?.review_intelligence || null;
        console.log('Cache hit — review set unchanged, skipping Bedrock');
        return {
          status: 'cached',
          opportunity_score: cached?.opportunity_score ?? null,
          analyzed_at: prior.rows[0].reviews_analyzed_at,
        };
      }
    }

    const reviewText = reviews.map((r, i) => 'Review ' + (i+1) + ' (' + r.rating + '/5, ' + r.relative_time_description + '): ' + r.text).join(' ||| ');
    const { BedrockRuntimeClient, InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');
    const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });
    const prompt = 'You are analyzing Google reviews for a commercial building to find elevator-related intelligence for an elevator service sales team. REVIEWS: ' + reviewText.substring(0, 4000) + ' Analyze and return ONLY this JSON with no markdown: {"elevator_complaints":<number>,"complaint_details":["<complaint>"],"competitor_mentions":["<names>"],"maintenance_signals":["<signals>"],"management_quality":"<excellent|good|fair|poor>","opportunity_score":<0-100>,"sales_angle":"<1-2 sentence pitch>","urgency_signals":["<signals>"]}';
    const resp = await bedrock.send(new InvokeModelCommand({
      modelId: process.env.CLAUDE_MODEL || 'us.anthropic.claude-opus-4-7',
      contentType: 'application/json', accept: 'application/json',
      body: JSON.stringify({ anthropic_version: 'bedrock-2023-05-31', max_tokens: 800, messages: [{ role: 'user', content: prompt }] })
    }));
    const aiText = JSON.parse(new TextDecoder().decode(resp.body)).content[0].text;
    const intel = JSON.parse(aiText.replace(/```json|```/g, '').trim());
    console.log('Intelligence parsed, opportunity_score:', intel.opportunity_score);

    // Save analysis + the hash so the next call short-circuits if reviews unchanged.
    await pool.query(
      'UPDATE elevator_intelligence SET review_intelligence=$1, elevator_complaints=$2, competitor_mentions=$3, maintenance_signals=$4, updated_at=NOW() WHERE prospect_id=$5',
      [JSON.stringify(intel), intel.elevator_complaints||0, intel.competitor_mentions||[], intel.maintenance_signals||[], prospect_id]
    );
    if (prospect_id) {
      await pool.query(
        'UPDATE prospects SET reviews_input_hash = $1, reviews_analyzed_at = NOW(), updated_at = NOW() WHERE id = $2',
        [reviewsHash, prospect_id]
      );
    }
    console.log('Review intelligence saved for prospect:', prospect_id);
    return { status: 'success', opportunity_score: intel.opportunity_score };
  } catch(e) {
    console.error('Review analysis error:', e.message);
    return { status: 'error', message: e.message };
  }
};
