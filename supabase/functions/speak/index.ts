// Supabase Edge Function: speak (text-to-speech)
//
// Converts text (the improved STAR answer) into natural speech using an
// OpenAI-compatible TTS endpoint, returning base64 MP3 for the app to play.
//
// Runs with the CALLER'S JWT (verify_jwt). Requires TTS_API_KEY; without it the
// function returns 501 and the app falls back to the on-device system voice
// (expo-speech).
//
// Note: Anthropic/Claude has no speech API — this uses a dedicated TTS provider
// (OpenAI by default).

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TTS_URL = Deno.env.get('TTS_URL') ?? 'https://api.openai.com/v1/audio/speech';
const TTS_MODEL = Deno.env.get('TTS_MODEL') ?? 'gpt-4o-mini-tts';
const TTS_VOICE = Deno.env.get('TTS_VOICE') ?? 'alloy';
const TTS_API_KEY = Deno.env.get('TTS_API_KEY') ?? '';
const MAX_CHARS = 4000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!TTS_API_KEY) return json({ error: 'TTS_API_KEY not configured' }, 501);
  if (!req.headers.get('Authorization')) {
    return json({ error: 'Missing Authorization header' }, 401);
  }

  let text: string;
  let voice: string;
  try {
    const body = await req.json();
    text = String(body.text ?? '').trim().slice(0, MAX_CHARS);
    voice = String(body.voice ?? TTS_VOICE);
    if (!text) throw new Error('text is required');
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }

  try {
    const res = await fetch(TTS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TTS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: TTS_MODEL,
        voice,
        input: text,
        response_format: 'mp3',
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      return json({ error: `TTS error ${res.status}: ${detail.slice(0, 300)}` }, 502);
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    return json({ audioBase64: bytesToBase64(bytes), mimeType: 'audio/mpeg' });
  } catch (e) {
    return json({ error: (e as Error).message ?? 'TTS failed' }, 500);
  }
});
