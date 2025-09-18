/**
 * Netlify Function: /api/generate-logo
 * - POST -> generate icon via OpenAI Images API (returns dataUrl)
 * - GET  -> quick ping to verify OPENAI_API_KEY is visible to the function
 *
 * Notes:
 *  - Uses classic Netlify Functions signature (exports.handler)
 *  - Tries gpt-image-1 first, falls back to dall-e-3 automatically
 *  - Returns detailed error text so you can see cause in Netlify logs AND UI
 */

const doFetch = global.fetch || ((...args) =>
  import('node-fetch').then(({ default: f }) => f(...args)));

exports.handler = async (event) => {
  const apiKey = process.env.OPENAI_API_KEY;

  // Simple diagnostics: GET /api/generate-logo
  if (event.httpMethod === 'GET') {
    return json({ ok: true, keyFound: !!apiKey });
  }

  if (event.httpMethod !== 'POST') {
    return text('Method not allowed', 405);
  }

  if (!apiKey) {
    console.error('Env OPENAI_API_KEY is missing');
    return text('Missing OPENAI_API_KEY', 500);
  }

  try {
    const { prompt } = JSON.parse(event.body || '{}');
    if (!prompt || typeof prompt !== 'string') {
      return text('Missing prompt', 400);
    }

    const models = ['gpt-image-1', 'dall-e-3']; // try both, in order
    let lastErr = null;

    for (const model of models) {
      try {
        const resp = await doFetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            prompt,
            size: '256x256',
            n: 1,
            response_format: 'b64_json',
          }),
        });

        const raw = await resp.text();
        if (!resp.ok) {
          console.error(`OpenAI error (${model}):`, raw);
          lastErr = `OpenAI error (${model}): ${raw}`;
          continue; // try next model
        }

        let data;
        try { data = JSON.parse(raw); } catch { data = {}; }

        const b64 = data?.data?.[0]?.b64_json;
        if (!b64) {
          console.error(`No image returned (${model})`, data);
          lastErr = `No image returned (${model})`;
          continue;
        }

        return json({ dataUrl: `data:image/png;base64,${b64}` });
      } catch (e) {
        console.error(`Fetch failed (${model}):`, e);
        lastErr = `Fetch failed (${model}): ${e.message}`;
      }
    }

    return text(lastErr || 'Unknown image generation error', 500);
  } catch (e) {
    console.error('Server error:', e);
    return text(`Server error: ${e.message}`, 500);
  }
};

/* helpers */
function json(obj, status = 200) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj),
  };
}
function text(msg, status = 200) {
  return { statusCode: status, body: msg };
}
