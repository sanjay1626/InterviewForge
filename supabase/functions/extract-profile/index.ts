// Supabase Edge Function: extract-profile
//
// Extracts structured work experiences, projects, skills, and certifications
// from an already-ingested resume so the user doesn't have to retype them.
//
// Runs with the CALLER'S JWT (RLS-enforced): it reads the document's stored
// chunks, which only the owner can select.
//
// CRITICAL: this is EXTRACTION, not generation. The model may only return what
// is literally present in the resume text. Anything absent is returned as an
// empty string / empty array — never inferred, never embellished. Nothing is
// written to the database here; the app shows the results for the user to
// review, edit, and approve.
//
// Requires ANTHROPIC_API_KEY. Without it the function returns 501 and the app
// falls back to manual entry.

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const EXTRACT_MODEL = Deno.env.get('EVAL_MODEL') ?? 'claude-opus-4-8';
const MAX_RESUME_CHARS = 20000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

const strArray = { type: 'array', items: { type: 'string' } };

const EXTRACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    experiences: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          company: { type: 'string' },
          title: { type: 'string' },
          location: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          isCurrent: { type: 'boolean' },
          description: { type: 'string' },
          highlights: strArray,
          skills: strArray,
        },
        required: [
          'company', 'title', 'location', 'startDate', 'endDate',
          'isCurrent', 'description', 'highlights', 'skills',
        ],
      },
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          role: { type: 'string' },
          description: { type: 'string' },
          highlights: strArray,
          skills: strArray,
          link: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
        },
        required: [
          'name', 'role', 'description', 'highlights', 'skills',
          'link', 'startDate', 'endDate',
        ],
      },
    },
    skills: strArray,
    certifications: strArray,
  },
  required: ['experiences', 'projects', 'skills', 'certifications'],
};

const SYSTEM_PROMPT = `You extract structured data from a resume. You are a parser, not a writer.

ABSOLUTE RULES:
- Return ONLY information that is literally present in the resume text.
- NEVER invent, infer, guess, embellish, or "improve" anything — no companies, titles, dates, metrics, technologies, or outcomes that are not written in the text.
- If a field is not present, return an empty string "" (or an empty array). Do NOT fill it with a plausible value.
- Do not rewrite the candidate's wording into achievements it does not claim. Keep bullet points close to the original wording (light cleanup of formatting artifacts is fine).
- Dates: copy them as written in the resume (e.g. "2022", "Jan 2022", "2022-01"). Do not normalize into a format the resume doesn't use, and never invent a date.
- isCurrent: true only if the resume explicitly indicates the role is ongoing (e.g. "Present", "Current").

WHAT TO EXTRACT:
- experiences: employment/roles. highlights = the resume's bullet points for that role. skills = technologies/skills explicitly tied to that role.
- projects: named personal/professional projects that are listed separately from employment.
- skills: the resume's overall skills list (deduplicated, individual skills — not sentences).
- certifications: named certifications/licenses only.

If the resume contains no items for a section, return an empty array for it.
Return ONLY the structured object.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!ANTHROPIC_API_KEY) {
    return json({ error: 'ANTHROPIC_API_KEY not configured' }, 501);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  let documentId: string;
  try {
    const body = await req.json();
    documentId = String(body.documentId ?? '');
    if (!documentId) throw new Error('documentId is required');
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }

  try {
    // Read the ingested chunks (RLS: only the owner can select them).
    const { data: chunks, error: chunkErr } = await supabase
      .from('document_chunks')
      .select('content, chunk_index')
      .eq('document_id', documentId)
      .order('chunk_index', { ascending: true });
    if (chunkErr) throw new Error(chunkErr.message);

    const resumeText = (chunks ?? [])
      .map((c: { content: string }) => c.content)
      .join('\n\n')
      .slice(0, MAX_RESUME_CHARS);

    if (!resumeText.trim()) {
      return json(
        { error: 'This document has no ingested text yet. Analyze it first.' },
        400,
      );
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: EXTRACT_MODEL,
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        output_config: {
          format: { type: 'json_schema', schema: EXTRACTION_SCHEMA },
        },
        messages: [
          { role: 'user', content: `RESUME TEXT:\n\n${resumeText}` },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return json({ error: `Model error ${res.status}: ${detail.slice(0, 300)}` }, 502);
    }

    const data = await res.json();
    const block = (data.content ?? []).find((b: { type: string }) => b.type === 'text');
    if (!block?.text) return json({ error: 'Empty model response' }, 502);

    return json(JSON.parse(block.text));
  } catch (e) {
    return json({ error: (e as Error).message ?? 'Extraction failed' }, 500);
  }
});
