// Supabase Edge Function: blank-page (Blank Page Assistant)
//
// Two modes, both RLS-scoped to the caller:
//   mode="recall" — ranks the user's OWN records (experiences, projects, STAR
//     stories, resume, previous answers) by relevance to the question and
//     explains why each might help. It is a COACH: it may only reference records
//     that exist; it never invents an experience.
//   mode="draft"  — after the user reflects, assembles a STAR draft using ONLY
//     the selected memories + the user's reflection words + selected chips.
//     Unknown details become [bracketed] placeholders; sources are cited per
//     paragraph. Never invents metrics or accomplishments.
//
// Requires ANTHROPIC_API_KEY; returns 501 otherwise so the app falls back to
// local recall/assembly.

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
function firstSentence(t: string | null | undefined, max = 180): string {
  if (!t) return '';
  const s = t.trim();
  const cut = s.split(/(?<=[.!?])\s/)[0] ?? s;
  return cut.length > max ? cut.slice(0, max) + '…' : cut;
}

type SupaClient = ReturnType<typeof createClient>;
type Row = Record<string, unknown>;
const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

interface CatalogItem {
  ref: string;
  type: 'experience' | 'project' | 'story' | 'resume' | 'answer';
  title: string;
  sourceLabel: string;
  skills: string[];
  summary: string;
  full: string; // richer text for the draft grounding
}

async function loadCatalog(supabase: SupaClient): Promise<CatalogItem[]> {
  const [expRes, projRes, storyRes, ansRes, docs] = await Promise.all([
    supabase.from('work_experiences').select('*').limit(15),
    supabase.from('projects').select('*').limit(15),
    supabase.from('star_stories').select('*').limit(15),
    supabase.from('practice_answers').select('id, question_text, answer_text').order('created_at', { ascending: false }).limit(8),
    supabase.from('documents').select('id').eq('source_type', 'resume').eq('status', 'ready').order('created_at', { ascending: false }).limit(1),
  ]);

  const items: CatalogItem[] = [];

  for (const e of (expRes.data ?? []) as Row[]) {
    items.push({
      ref: `exp:${e.id}`,
      type: 'experience',
      title: `${e.title}${e.company ? ` · ${e.company}` : ''}`,
      sourceLabel: 'Work experience',
      skills: arr(e.skills),
      summary: firstSentence((e.description as string) || arr(e.highlights)[0] || ''),
      full: `${e.title} at ${e.company}. ${e.description ?? ''} Highlights: ${arr(e.highlights).join('; ')}. Skills: ${arr(e.skills).join(', ')}`,
    });
  }
  for (const p of (projRes.data ?? []) as Row[]) {
    items.push({
      ref: `proj:${p.id}`,
      type: 'project',
      title: String(p.name),
      sourceLabel: 'Project',
      skills: arr(p.skills),
      summary: firstSentence((p.description as string) || arr(p.highlights)[0] || ''),
      full: `Project ${p.name}. ${p.description ?? ''} Highlights: ${arr(p.highlights).join('; ')}. Skills: ${arr(p.skills).join(', ')}`,
    });
  }
  for (const s of (storyRes.data ?? []) as Row[]) {
    items.push({
      ref: `story:${s.id}`,
      type: 'story',
      title: String(s.title),
      sourceLabel: 'STAR story',
      skills: arr(s.skills),
      summary: firstSentence((s.situation as string) || (s.task as string) || ''),
      full: `STAR story "${s.title}". Situation: ${s.situation ?? ''} Task: ${s.task ?? ''} Action: ${s.action ?? ''} Result: ${s.result ?? ''} Lesson: ${s.lesson ?? ''}`,
    });
  }
  for (const a of (ansRes.data ?? []) as Row[]) {
    items.push({
      ref: `answer:${a.id}`,
      type: 'answer',
      title: `Previous answer: ${truncate(String(a.question_text), 60)}`,
      sourceLabel: 'Previous answer',
      skills: [],
      summary: firstSentence(String(a.answer_text)),
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
    const resumeText = (chunks as { content: string }[] | null)?.map((c) => c.content).join('\n').trim();
    if (resumeText) {
      items.push({
        ref: 'resume',
        type: 'resume',
        title: 'Your resume',
        sourceLabel: 'Resume',
        skills: [],
        summary: firstSentence(resumeText, 200),
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

const RECALL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    hasMemories: { type: 'boolean' },
    selections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ref: { type: 'string' },
          whyRelevant: { type: 'string' },
          situationSummary: { type: 'string' },
        },
        required: ['ref', 'whyRelevant', 'situationSummary'],
      },
    },
  },
  required: ['hasMemories', 'selections'],
};

const RECALL_SYSTEM = `You are a behavioral interview coach helping the candidate REMEMBER their own experiences — you are not a writer.

You are given a numbered catalog of the candidate's real records (each with a [ref]). For the interview question, pick the records most likely to help them answer, most relevant first.

RULES:
- Only reference [ref] values that appear in the catalog. Never invent an experience, company, project, or record.
- whyRelevant: one short sentence on why THIS record could help answer THIS question (coaching, not a claim they did something they didn't).
- situationSummary: a one-line factual recap drawn only from that record's text.
- If nothing in the catalog is a plausible fit, return hasMemories=false and an empty selections array.
Return ONLY the structured object.`;

const DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    paragraphs: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          text: { type: 'string' },
          sources: { type: 'array', items: { type: 'string' } },
        },
        required: ['text', 'sources'],
      },
    },
    missingInfo: { type: 'array', items: { type: 'string' } },
  },
  required: ['paragraphs', 'missingInfo'],
};

const DRAFT_SYSTEM = `You assemble a behavioral interview answer draft in STAR structure, from the candidate's own material only.

You are given: the question, the candidate's REFLECTION answers (their own words), a set of SELECTED SOURCES (their records, each with a [ref]), and SELECTED SKILLS.

ABSOLUTE RULES:
- Use ONLY the reflection text and the selected sources. Do not use any other knowledge.
- NEVER invent metrics, numbers, outcomes, companies, or accomplishments. If a stronger answer needs a detail that isn't provided, insert an editable placeholder in square brackets (e.g. "[add the measurable result, if you have one]") and list it in missingInfo.
- Preserve the candidate's wording from their reflection where possible.
- Output 2–5 short paragraphs following Situation → Task → Action → Result (+ a brief lesson if supported).
- For each paragraph, sources = the [ref] values (and/or "reflection") it drew from. Only use refs from the SELECTED SOURCES list, plus "reflection".
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
  const mode = String(body.mode ?? 'recall');
  const questionText = truncate(String(body.questionText ?? ''), 500);
  if (!questionText) return json({ error: 'questionText is required' }, 400);

  try {
    const catalog = await loadCatalog(supabase);
    const byRef = new Map(catalog.map((c) => [c.ref, c]));

    if (mode === 'recall') {
      if (catalog.length === 0) {
        return json({ hasMemories: false, memories: [], chips: [], source: 'ai' });
      }
      const catalogText = catalog
        .map((c) => `[${c.ref}] ${c.sourceLabel} — ${c.title}. ${c.full}`)
        .map((line) => truncate(line, 700))
        .join('\n');

      const out = await callModel(
        RECALL_SYSTEM,
        `QUESTION (competency: ${body.competency ?? 'general'}):\n${questionText}\n\nCANDIDATE CATALOG:\n${catalogText}`,
        RECALL_SCHEMA,
      );

      const selections = Array.isArray(out.selections) ? out.selections : [];
      const memories = selections
        .map((s) => {
          const item = byRef.get(String((s as Row).ref));
          if (!item) return null; // model referenced something not in the catalog → drop
          return {
            ref: item.ref,
            type: item.type,
            title: item.title,
            sourceLabel: item.sourceLabel,
            skills: item.skills,
            whyRelevant: truncate(String((s as Row).whyRelevant ?? ''), 220),
            situationSummary: truncate(String((s as Row).situationSummary ?? item.summary), 240),
          };
        })
        .filter(Boolean);

      const chips = Array.from(
        new Set(memories.flatMap((m) => (m as CatalogItem).skills)),
      ).slice(0, 14);

      return json({
        hasMemories: memories.length > 0 && out.hasMemories !== false,
        memories,
        chips,
        source: 'ai',
      });
    }

    // mode === 'draft'
    const refs = arr(body.refs).filter((r) => byRef.has(r));
    const chips = arr(body.chips);
    const reflection = (body.reflection ?? {}) as Row;

    const selectedText = refs
      .map((r) => `[${r}] ${byRef.get(r)!.full}`)
      .map((line) => truncate(line, 900))
      .join('\n');

    const reflectionText = [
      `Situation/challenge: ${reflection.challenge ?? ''}`,
      `Responsibility: ${reflection.responsibility ?? ''}`,
      `Actions: ${reflection.actions ?? ''}`,
      `Result: ${reflection.result ?? ''}`,
      `Learned: ${reflection.learned ?? ''}`,
    ].join('\n');

    const out = await callModel(
      DRAFT_SYSTEM,
      `QUESTION (competency: ${body.competency ?? 'general'}):\n${questionText}\n\n` +
        `REFLECTION (the candidate's own words):\n${reflectionText}\n\n` +
        `SELECTED SKILLS: ${chips.join(', ') || '(none)'}\n\n` +
        `SELECTED SOURCES:\n${selectedText || '(none — rely on the reflection only)'}`,
      DRAFT_SCHEMA,
    );

    const allowed = new Set([...refs, 'reflection']);
    const paragraphs = (Array.isArray(out.paragraphs) ? out.paragraphs : [])
      .map((p) => ({
        text: truncate(String((p as Row).text ?? ''), 1200),
        sources: arr((p as Row).sources).filter((s) => allowed.has(s)),
      }))
      .filter((p) => p.text);

    return json({
      draft: paragraphs.map((p) => p.text).join('\n\n'),
      paragraphs,
      missingInfo: arr(out.missingInfo),
      source: 'ai',
    });
  } catch (e) {
    return json({ error: (e as Error).message ?? 'Assistant failed' }, 500);
  }
});
