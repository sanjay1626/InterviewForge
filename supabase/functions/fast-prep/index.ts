// Supabase Edge Function: fast-prep (Fast Interview Prep — analysis + answers)
//
// Does the two things AI is uniquely good at, both RLS-scoped to the caller:
//   1. Analyzes the JOB DESCRIPTION into weighted requirements, technologies,
//      seniority, and behavioral competencies. This is information about the
//      EMPLOYER only — never a claim about the candidate.
//   2. Drafts a few PERSONALIZED starter answers, grounded ONLY in the
//      candidate's own catalog (experiences, projects, STAR stories, resume,
//      previous answers). Unknown details become [bracketed] placeholders and
//      are listed in missingInfo. Never invents metrics, employers, or results.
//
// The grounding-critical requirement→evidence MATCHING is intentionally NOT done
// here — the client runs it in the tested pure domain, so matching never depends
// on the model. Requires ANTHROPIC_API_KEY; returns 501 otherwise so the app
// falls back to the offline analyzer.

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const MODEL = Deno.env.get('EVAL_MODEL') ?? 'claude-opus-4-8';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
function truncate(t: string, max: number): string {
  return t.length > max ? t.slice(0, max) + '…' : t;
}

type SupaClient = ReturnType<typeof createClient>;
type Row = Record<string, unknown>;
const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

interface CatalogItem {
  ref: string;
  sourceLabel: string;
  title: string;
  full: string;
}

async function loadCatalog(supabase: SupaClient): Promise<CatalogItem[]> {
  const [expRes, projRes, storyRes, ansRes, docs] = await Promise.all([
    supabase.from('work_experiences').select('*').limit(15),
    supabase.from('projects').select('*').limit(15),
    supabase.from('star_stories').select('*').limit(15),
    supabase
      .from('practice_answers')
      .select('id, question_text, answer_text')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('documents')
      .select('id')
      .eq('source_type', 'resume')
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  const items: CatalogItem[] = [];
  for (const e of (expRes.data ?? []) as Row[]) {
    items.push({
      ref: `exp:${e.id}`,
      sourceLabel: 'Work experience',
      title: `${e.title} · ${e.company}`,
      full: `${e.title} at ${e.company}. ${e.description ?? ''} Highlights: ${arr(e.highlights).join('; ')}. Skills: ${arr(e.skills).join(', ')}`,
    });
  }
  for (const p of (projRes.data ?? []) as Row[]) {
    items.push({
      ref: `proj:${p.id}`,
      sourceLabel: 'Project',
      title: String(p.name),
      full: `Project ${p.name}. ${p.description ?? ''} Highlights: ${arr(p.highlights).join('; ')}. Skills: ${arr(p.skills).join(', ')}`,
    });
  }
  for (const s of (storyRes.data ?? []) as Row[]) {
    items.push({
      ref: `story:${s.id}`,
      sourceLabel: 'STAR story',
      title: String(s.title),
      full: `STAR story "${s.title}". Situation: ${s.situation ?? ''} Task: ${s.task ?? ''} Action: ${s.action ?? ''} Result: ${s.result ?? ''}`,
    });
  }
  for (const a of (ansRes.data ?? []) as Row[]) {
    items.push({
      ref: `answer:${a.id}`,
      sourceLabel: 'Previous answer',
      title: `Answer: ${truncate(String(a.question_text), 50)}`,
      full: `Previous answer to "${a.question_text}": ${truncate(String(a.answer_text), 500)}`,
    });
  }
  const docId = (docs.data as { id: string }[] | null)?.[0]?.id;
  if (docId) {
    const { data: chunks } = await supabase
      .from('document_chunks')
      .select('content')
      .eq('document_id', docId)
      .order('chunk_index', { ascending: true })
      .limit(10);
    const resumeText = (chunks as { content: string }[] | null)
      ?.map((c) => c.content)
      .join('\n')
      .trim();
    if (resumeText) {
      items.push({
        ref: 'resume',
        sourceLabel: 'Resume',
        title: 'Resume',
        full: truncate(resumeText, 3500),
      });
    }
  }
  return items;
}

async function callModel(system: string, user: string, schema: unknown): Promise<Row> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      system,
      output_config: { format: { type: 'json_schema', schema } },
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Model error ${res.status}: ${truncate(await res.text(), 300)}`);
  const data = await res.json();
  const block = (data.content ?? []).find((b: { type: string }) => b.type === 'text');
  if (!block?.text) throw new Error('Empty model response');
  return JSON.parse(block.text) as Row;
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    analysis: {
      type: 'object',
      additionalProperties: false,
      properties: {
        jobTitle: { type: 'string' },
        seniority: { type: ['string', 'null'] },
        technologies: { type: 'array', items: { type: 'string' } },
        behavioralCompetencies: { type: 'array', items: { type: 'string' } },
        requirements: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              category: { type: 'string' },
              text: { type: 'string' },
              keywords: { type: 'array', items: { type: 'string' } },
              importance: { type: 'integer' },
            },
            required: ['category', 'text', 'keywords', 'importance'],
          },
        },
      },
      required: ['jobTitle', 'seniority', 'technologies', 'behavioralCompetencies', 'requirements'],
    },
    answers: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          questionText: { type: 'string' },
          answer: { type: 'string' },
          sources: { type: 'array', items: { type: 'string' } },
          missingInfo: { type: 'array', items: { type: 'string' } },
        },
        required: ['questionText', 'answer', 'sources', 'missingInfo'],
      },
    },
  },
  required: ['analysis', 'answers'],
};

const SYSTEM = `You are an interview-prep analyst. You produce two things and keep a HARD wall between them.

PART 1 — JOB ANALYSIS (about the EMPLOYER only):
Analyze the job description into requirements. For each requirement set:
- category: one of required_skill, preferred_skill, technology, responsibility, behavioral, leadership, customer_facing, domain_knowledge, education_certification
- text: the requirement in a few words
- keywords: 1–4 lowercase keywords for matching
- importance: integer 1 (nice-to-have) to 5 (critical)
Also return jobTitle, seniority (or null), technologies (lowercase), and behavioralCompetencies from this set only: problem-solving, conflict-resolution, failure-learning, leadership, teamwork, ownership, adaptability, communication, customer-focus, time-management.
NEVER treat a job requirement as something the candidate has. This section is only about what the role asks for.

PART 2 — PERSONALIZED ANSWERS (grounded in the CANDIDATE CATALOG only):
Pick up to 4 likely interview questions and draft a short STAR-style starter answer for each, using ONLY facts from the candidate catalog.
ABSOLUTE RULES:
- Use ONLY the catalog. NEVER invent metrics, numbers, results, employers, projects, technologies, or leadership the catalog does not show.
- If a stronger answer needs a missing detail, insert an editable placeholder in square brackets (e.g. "[add the measurable result, if you have one]") and list it in missingInfo.
- sources: the [ref] values you drew from (only refs present in the catalog).
- If the catalog has too little to ground an answer for a question, skip that question rather than fabricating. Return an empty answers array if nothing can be grounded.
Return ONLY the structured object.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 501);
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  let body: Row;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const jobDescription = truncate(String(body.jobDescription ?? ''), 8000);
  const jobTitle = truncate(String(body.jobTitle ?? ''), 160);
  if (!jobDescription) return json({ error: 'jobDescription is required' }, 400);

  try {
    const catalog = await loadCatalog(supabase);
    const catalogText = catalog.length
      ? catalog
          .map((c) => `[${c.ref}] ${c.sourceLabel} — ${c.title}. ${c.full}`)
          .map((line) => truncate(line, 700))
          .join('\n')
      : '(the candidate has not added any experiences, projects, stories, or resume yet)';

    const out = await callModel(
      SYSTEM,
      `JOB TITLE: ${jobTitle || '(unspecified)'}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nCANDIDATE CATALOG:\n${catalogText}`,
      SCHEMA,
    );

    return json({ analysis: out.analysis ?? {}, answers: out.answers ?? [], source: 'ai' });
  } catch (e) {
    return json({ error: (e as Error).message ?? 'Fast prep failed' }, 500);
  }
});
