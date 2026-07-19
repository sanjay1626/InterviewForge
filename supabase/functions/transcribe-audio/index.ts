// Supabase Edge Function: transcribe-audio
//
// Transcribes a recorded answer to text using a configurable, OpenAI-compatible
// audio-transcription endpoint (e.g. Whisper). The transcript is always shown to
// the user for correction before it is evaluated — this function only produces
// a first draft.
//
// Requires TRANSCRIBE_API_KEY. Without it the function returns 501 and the app
// falls back to manual transcript entry (the user types what they said).

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TRANSCRIBE_URL =
  Deno.env.get('TRANSCRIBE_URL') ?? 'https://api.openai.com/v1/audio/transcriptions';
const TRANSCRIBE_MODEL = Deno.env.get('TRANSCRIBE_MODEL') ?? 'whisper-1';
const TRANSCRIBE_API_KEY = Deno.env.get('TRANSCRIBE_API_KEY') ?? '';
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB safety cap

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(',') ? b64.slice(b64.indexOf(',') + 1) : b64;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!TRANSCRIBE_API_KEY) {
    return json({ error: 'TRANSCRIBE_API_KEY not configured' }, 501);
  }
  if (!req.headers.get('Authorization')) {
    return json({ error: 'Missing Authorization header' }, 401);
  }

  let bytes: Uint8Array;
  let mimeType: string;
  let fileName: string;
  try {
    const body = await req.json();
    if (!body.audioBase64) throw new Error('audioBase64 is required');
    bytes = base64ToBytes(String(body.audioBase64));
    if (bytes.byteLength > MAX_BYTES) throw new Error('Recording too large');
    mimeType = String(body.mimeType ?? 'audio/m4a');
    fileName = String(body.fileName ?? 'answer.m4a');
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }

  try {
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: mimeType }), fileName);
    form.append('model', TRANSCRIBE_MODEL);
    form.append('response_format', 'json');

    const res = await fetch(TRANSCRIBE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TRANSCRIBE_API_KEY}` },
      body: form,
    });
    if (!res.ok) {
      const detail = await res.text();
      return json({ error: `Transcription error ${res.status}: ${detail.slice(0, 300)}` }, 502);
    }
    const data = await res.json();
    return json({ text: String(data.text ?? '').trim() });
  } catch (e) {
    return json({ error: (e as Error).message ?? 'Transcription failed' }, 500);
  }
});
