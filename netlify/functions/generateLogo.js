// Netlify Function: generateLogo
// Proxies OpenAI image generation and returns a data URL (base64 PNG).
// Set OPENAI_API_KEY in Netlify Env.

export default async function handler(req, context) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response('Missing OPENAI_API_KEY', { status: 500 });
  }

  try {
    const body = await req.json();
    const prompt = String(body.prompt || '').slice(0, 500);
    if (!prompt) {
      return new Response('Missing prompt', { status: 400 });
    }

    // Call OpenAI Images (adjust model name if needed)
    const resp = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-image-1',     // alternative: "dall-e-3"
        prompt,
        size: '256x256',
        n: 1
      })
    });

    if (!resp.ok) {
      const t = await resp.text();
      return new Response(`OpenAI error: ${t}`, { status: 500 });
    }

    const data = await resp.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      return new Response('No image returned', { status: 500 });
    }

    const dataUrl = `data:image/png;base64,${b64}`;
    return Response.json({ dataUrl });
  } catch (err) {
    return new Response(`Server error: ${err.message}`, { status: 500 });
  }
}
