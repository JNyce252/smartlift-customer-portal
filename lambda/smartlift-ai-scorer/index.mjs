import pg from 'pg';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

const bedrock = new BedrockRuntimeClient({ region: "us-east-1" });

async function scoreProspectWithAI(prospect) {
  const prompt = `You are an elevator service sales analyst. Analyze this building prospect and provide a detailed assessment.

Prospect Data:
- Name: ${prospect.name}
- Type: ${prospect.type}
- Location: ${prospect.city}, ${prospect.state}
- Google Rating: ${prospect.rating || 'Unknown'} (${prospect.total_reviews || 0} reviews)
- Current Lead Score: ${prospect.lead_score || 'Unknown'}
- Status: ${prospect.status}

Based on this information, provide your analysis in the following JSON format only, no other text:
{
  "sentiment_score": <number 0-10, how positive the prospect's situation is for elevator services>,
  "service_urgency": "<high|medium|low>",
  "estimated_floors": <estimated number of floors for this building type and rating>,
  "estimated_elevators": <estimated number of elevators needed>,
  "building_age": <estimated building age in years>,
  "modernization_candidate": <true|false>,
  "reputation_score": <number 0-10 based on rating and reviews>,
  "common_issues": ["issue1", "issue2", "issue3"],
  "ai_summary": "<2-3 sentence summary of this prospect's elevator service potential>",
  "ai_recommendation": "<1-2 sentence actionable recommendation for the sales team>",
  "lead_score": <refined lead score 0-100>
}`;

  const command = new InvokeModelCommand({
    modelId: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const text = responseBody.content[0].text;
  
  // Clean and parse JSON
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

export const handler = async (event) => {
  console.log('AI Scorer starting, event:', JSON.stringify(event));
  
  const singleProspectId = event.prospect_id || null;
  const results = [];
  
  try {
    const prospectsResult = singleProspectId
      ? await pool.query('SELECT * FROM prospects WHERE id = $1', [singleProspectId])
      : await pool.query('SELECT * FROM prospects ORDER BY lead_score DESC NULLS LAST');
    
    const prospects = prospectsResult.rows;
    console.log(`Scoring ${prospects.length} prospects...`);
    
    for (const prospect of prospects) {
      try {
        console.log(`Scoring: ${prospect.name}`);
        const ai = await scoreProspectWithAI(prospect);
        
        // Upsert elevator_intelligence
        await pool.query(`
          INSERT INTO elevator_intelligence (
            prospect_id, sentiment_score, service_urgency, estimated_floors,
            estimated_elevators, building_age, modernization_candidate,
            reputation_score, common_issues, ai_summary, ai_recommendation,
            analysis_date, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
          ON CONFLICT (prospect_id) DO UPDATE SET
            sentiment_score = EXCLUDED.sentiment_score,
            service_urgency = EXCLUDED.service_urgency,
            estimated_floors = EXCLUDED.estimated_floors,
            estimated_elevators = EXCLUDED.estimated_elevators,
            building_age = EXCLUDED.building_age,
            modernization_candidate = EXCLUDED.modernization_candidate,
            reputation_score = EXCLUDED.reputation_score,
            common_issues = EXCLUDED.common_issues,
            ai_summary = EXCLUDED.ai_summary,
            ai_recommendation = EXCLUDED.ai_recommendation,
            ai_scored_at = NOW(),
            updated_at = NOW()
        `, [
          prospect.id,
          ai.sentiment_score,
          ai.service_urgency,
          ai.estimated_floors,
          ai.estimated_elevators,
          ai.building_age,
          ai.modernization_candidate,
          ai.reputation_score,
          JSON.stringify(ai.common_issues),
          ai.ai_summary,
          ai.ai_recommendation
        ]);
        
        // Update prospect lead_score
        await pool.query(`
          UPDATE prospects SET lead_score = $1, updated_at = NOW() WHERE id = $2
        `, [ai.lead_score, prospect.id]);
        
        results.push({ id: prospect.id, name: prospect.name, status: 'scored', lead_score: ai.lead_score });
        console.log(`Scored ${prospect.name}: lead_score=${ai.lead_score}`);
        
      } catch (err) {
        console.error(`Failed to score ${prospect.name}:`, err.message);
        results.push({ id: prospect.id, name: prospect.name, status: 'failed', error: err.message });
      }
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'AI scoring complete', results })
    };
    
  } catch (error) {
    console.error('Fatal error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
