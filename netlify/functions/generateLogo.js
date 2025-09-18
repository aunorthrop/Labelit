// Netlify Functions standard Node format (NOT Edge):
// Site settings -> Env vars -> OPENAI_API_KEY

const fetch = global.fetch || ((...args) => import('node-fetch').then(({default: f}) => f(...args)));

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: 'Missing OPENAI_API_KEY' };
  }

  try {
    const { prompt } = JSON.parse(event.body || '{}');
    if (!prompt) return { statusCode: 400, body: 'Missing prompt' };

    const resp = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '256x256', n: 1 })
    });

    if (!resp.ok) {
      return { statusCode: 500, body: `OpenAI error: ${await resp.text()}` };
    }
    const data = await resp.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return { statusCode: 500, body: 'No image returned' };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl: `data:image/png;base64,${b64}` })
    };
  } catch (e) {
    return { statusCode: 500, body: `Server error: ${e.message}` };
  }
};
