import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const ses = new SESClient({ region: 'us-east-1' });
const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });

const analyzeWithClaude = async (intakeData) => {
  const prompt = `You are a senior software architect and business analyst at The Golden Signature, a custom AI software development studio in Dallas, Texas. The founder is Jeremy Wilson — a solo developer who builds fast, charges fairly, and delivers production-grade software.

A potential client submitted a project intake. Analyze it and produce an INTERNAL briefing to help Jeremy prepare for the sales call and write a proposal.

CLIENT INTAKE:
${intakeData}

Produce this exact analysis:

## PROJECT SUMMARY
2-3 sentences. What does this client need and what business problem does it solve?

## RECOMMENDED TECH STACK
Specific technologies for this project. React/Vite, AWS Lambda, Aurora PostgreSQL, Amplify, Bedrock, etc. Explain why each fits their needs.

## CORE FEATURES BREAKDOWN
List each feature with:
- Complexity: Low / Medium / High
- Build time estimate in days
- Brief implementation note

## PROJECT TIMELINE
Phase-by-phase breakdown with realistic week estimates for a solo developer moving fast.

## WHAT JEREMY SHOULD CHARGE
This is INTERNAL pricing guidance for Jeremy — not shown to client.

Delivery Fee: $X,XXX - $X,XXX (one-time)
Monthly Management: $XXX - $XXX/month (ongoing hosting, support, updates)
Total First Year Value: $X,XXX

Reasoning: Explain why you landed on these numbers based on complexity, hours estimated, and market rate. Be specific.

Pricing reference:
- Simple tool / MVP: $3,000-6,000 delivery, $299-399/mo
- Medium web app: $6,000-12,000 delivery, $399-599/mo
- Full platform (like Smarterlift): $12,500-20,000 delivery, $799-1,299/mo
- AI-heavy or complex integrations: add 20-40% premium

## QUESTIONS TO ASK ON THE CALL
5 specific clarifying questions that will help scope the project accurately and uncover budget/timeline constraints.

## SALES ANGLE
What specific Golden Signature capabilities should Jeremy emphasize for THIS client? What pain point should he lead with?

Write directly to Jeremy. Be specific and practical — this is an internal briefing, not a client document.`;

  const response = await bedrock.send(new InvokeModelCommand({
    modelId: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }]
    })
  }));

  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.content[0].text;
};

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  try {
    const { name, company, email, phone, interest, message, type, subject } = JSON.parse(event.body || '{}');
    if (!name || !email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Name and email required' }) };

    const emailSubject = subject || (type === 'project_intake'
      ? '🚀 New Project Intake: ' + (company || name)
      : 'New Contact: ' + name + ' — ' + (interest || 'General Inquiry'));

    const isIntake = type === 'project_intake';

    let aiAnalysis = '';
    if (isIntake && message) {
      try {
        aiAnalysis = await analyzeWithClaude(message);
      } catch(e) {
        console.error('Claude analysis failed:', e.message);
        aiAnalysis = 'AI analysis unavailable — review intake manually.';
      }
    }

    const formatAnalysis = (text) => {
      return text
        .replace(/## WHAT JEREMY SHOULD CHARGE([\s\S]*?)(?=## |$)/g, (match) => {
          return '<div style="background:#1a0d00;border:2px solid #ff8c00;border-radius:8px;padding:16px;margin:8px 0">' +
            '<h3 style="color:#ff8c00;margin:0 0 12px;font-size:13px;letter-spacing:1px;text-transform:uppercase">💰 What Jeremy Should Charge</h3>' +
            '<div style="color:#ffd580;font-size:14px;line-height:1.8">' +
            match.replace(/## WHAT JEREMY SHOULD CHARGE\n/, '').replace(/\n/g, '<br>') +
            '</div></div>';
        })
        .replace(/## (.*)/g, '<h3 style="color:#D4A843;margin:20px 0 8px;font-size:13px;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #333;padding-bottom:6px">$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#fff">$1</strong>')
        .replace(/- Complexity: (High)/g, '- Complexity: <span style="color:#ff6b6b">High</span>')
        .replace(/- Complexity: (Medium)/g, '- Complexity: <span style="color:#ffd93d">Medium</span>')
        .replace(/- Complexity: (Low)/g, '- Complexity: <span style="color:#4ade80">Low</span>')
        .replace(/\n/g, '<br>');
    };

    const htmlBody = isIntake ? `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:20px;background:#0a0a10;color:#f5f5f0">
        <div style="border-bottom:2px solid #D4A843;padding-bottom:16px;margin-bottom:24px">
          <h2 style="color:#D4A843;margin:0;font-size:22px">🚀 New Project Intake — Internal Brief</h2>
          <p style="color:#888;margin:4px 0 0;font-size:13px">The Golden Signature · For Jeremy's eyes only · Respond within 24 hours</p>
        </div>

        <div style="background:#111;border:1px solid #222;border-radius:8px;padding:20px;margin-bottom:20px">
          <h3 style="color:#D4A843;margin:0 0 12px;font-size:12px;letter-spacing:2px;text-transform:uppercase">Client</h3>
          <p style="margin:5px 0;color:#fff"><span style="color:#666;display:inline-block;width:80px">Name:</span>${name}</p>
          <p style="margin:5px 0;color:#fff"><span style="color:#666;display:inline-block;width:80px">Company:</span>${company || 'Not provided'}</p>
          <p style="margin:5px 0;color:#fff"><span style="color:#666;display:inline-block;width:80px">Email:</span><a href="mailto:${email}" style="color:#D4A843">${email}</a></p>
          <p style="margin:5px 0;color:#fff"><span style="color:#666;display:inline-block;width:80px">Phone:</span>${phone || 'Not provided'}</p>
        </div>

        <div style="background:#111;border:1px solid #222;border-radius:8px;padding:20px;margin-bottom:20px">
          <h3 style="color:#D4A843;margin:0 0 12px;font-size:12px;letter-spacing:2px;text-transform:uppercase">Raw Intake</h3>
          <pre style="white-space:pre-wrap;color:#aaa;font-family:monospace;font-size:12px;line-height:1.7;margin:0">${message}</pre>
        </div>

        ${aiAnalysis ? `
        <div style="background:#0d100d;border:1px solid #1f3a1f;border-radius:8px;padding:20px;margin-bottom:20px">
          <h3 style="color:#4ade80;margin:0 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase">✦ AI Project Brief</h3>
          <p style="color:#555;font-size:11px;margin:0 0 16px">Generated by Claude · Internal use only · Edit before sending to client</p>
          <div style="color:#ccc;font-size:14px;line-height:1.7">${formatAnalysis(aiAnalysis)}</div>
        </div>
        ` : ''}

        <div style="background:#1a1000;border:1px solid #D4A843;border-radius:8px;padding:16px">
          <p style="color:#D4A843;font-weight:bold;margin:0 0 6px;font-size:13px">Next Step</p>
          <p style="color:#888;margin:0;font-size:13px;line-height:1.6">Reply directly to <a href="mailto:${email}" style="color:#D4A843">${name}</a>. Use the AI brief above as your starting point — rewrite in your own voice before sending.</p>
        </div>

        <hr style="border-color:#1a1a1a;margin:20px 0"/>
        <p style="color:#444;font-size:11px;margin:0">The Golden Signature LLC · Dallas, Texas · thegoldensignature.com</p>
      </div>
    ` : `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#D4A843;border-bottom:2px solid #D4A843;padding-bottom:10px">New Contact</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Company:</strong> ${company || 'Not provided'}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        <p><strong>Interest:</strong> ${interest || 'Not specified'}</p>
        <p><strong>Message:</strong></p>
        <p style="background:#f5f5f5;padding:16px;border-radius:8px">${message || 'No message provided'}</p>
      </div>
    `;

    await ses.send(new SendEmailCommand({
      Source: 'nyceguy252@gmail.com',
      Destination: { ToAddresses: ['nyceguy@thegoldensignature.com'] },
      ReplyToAddresses: [email],
      Message: {
        Subject: { Data: emailSubject },
        Body: {
          Html: { Data: htmlBody },
          Text: { Data: message || ('Name: ' + name + '\nEmail: ' + email) }
        }
      }
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
