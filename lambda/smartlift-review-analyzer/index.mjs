import pg from 'pg';
const { Pool } = pg;

// Server-side Google Maps API key (Place Details). Set as Lambda env var GOOGLE_MAPS_KEY.
// Recommend restricting this key by API + IP allowlist (Lambda outbound CIDRs) in GCP.
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY;
if (!GOOGLE_MAPS_KEY) throw new Error('Missing required env var: GOOGLE_MAPS_KEY');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

export const handler = async (event) => {
  const { prospect_id, place_id } = event;
  console.log('Analyzing reviews for prospect:', prospect_id, 'place_id:', place_id);
  try {
    const reviewRes = await fetch('https://maps.googleapis.com/maps/api/place/details/json?place_id=' + encodeURIComponent(place_id) + '&fields=reviews,name&key=' + GOOGLE_MAPS_KEY);
    const reviewData = await reviewRes.json();
    if (!reviewData.result || !reviewData.result.reviews || !reviewData.result.reviews.length) {
      console.log('No reviews found'); return { status: 'no_reviews' };
    }
    const reviews = reviewData.result.reviews;
    const reviewText = reviews.map((r, i) => 'Review ' + (i+1) + ' (' + r.rating + '/5, ' + r.relative_time_description + '): ' + r.text).join(' ||| ');
    console.log('Found', reviews.length, 'reviews');
    const { BedrockRuntimeClient, InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');
    const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });
    const prompt = 'You are analyzing Google reviews for a commercial building to find elevator-related intelligence for an elevator service sales team. REVIEWS: ' + reviewText.substring(0, 4000) + ' Analyze and return ONLY this JSON with no markdown: {"elevator_complaints":<number>,"complaint_details":["<complaint>"],"competitor_mentions":["<names>"],"maintenance_signals":["<signals>"],"management_quality":"<excellent|good|fair|poor>","opportunity_score":<0-100>,"sales_angle":"<1-2 sentence pitch>","urgency_signals":["<signals>"]}';
    const resp = await bedrock.send(new InvokeModelCommand({
      modelId: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
      contentType: 'application/json', accept: 'application/json',
      body: JSON.stringify({ anthropic_version: 'bedrock-2023-05-31', max_tokens: 800, messages: [{ role: 'user', content: prompt }] })
    }));
    const aiText = JSON.parse(new TextDecoder().decode(resp.body)).content[0].text;
    const intel = JSON.parse(aiText.replace(/```json|```/g, '').trim());
    console.log('Intelligence parsed, opportunity_score:', intel.opportunity_score);
    await pool.query(
      'UPDATE elevator_intelligence SET review_intelligence=$1, elevator_complaints=$2, competitor_mentions=$3, maintenance_signals=$4, updated_at=NOW() WHERE prospect_id=$5',
      [JSON.stringify(intel), intel.elevator_complaints||0, intel.competitor_mentions||[], intel.maintenance_signals||[], prospect_id]
    );
    console.log('Review intelligence saved for prospect:', prospect_id);
    return { status: 'success', opportunity_score: intel.opportunity_score };
  } catch(e) {
    console.error('Review analysis error:', e.message);
    return { status: 'error', message: e.message };
  }
};
