// Supabase Edge Function: evaluate-answer
//
// Evaluates a behavioral interview answer against a structured rubric and
// produces a fact-preserving improved answer.
//
// Runs with the CALLER'S JWT so all grounding is retrieved under Row-Level
// Security. Grounding = the user's profile (skills/certs/target role), work
// experiences, projects, STAR stories, and (if embeddings exist) resume chunks.
//
// The model is instructed to use ONLY the provided facts + the user's answer,
// and to NEVER invent employment history, metrics, or outcomes. Missing facts
// are surfaced as bracketed prompts, not guesses.
//
// Requires ANTHROPIC_API_KEY as a function secret. Without it the function
// returns 501 and the app falls back to its offline heuristic evaluator.

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const EVAL_MODEL = Deno.env.get('EVAL_MODEL') ?? 'claude-opus-4-8';
const MAX_ANSWER_CHARS = 8000; // defense in depth; the client caps lower
const MAX_QUESTION_CHARS = 500;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

const RUBRIC_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    scores: {
      type: 'object',
      additionalProperties: false,
      properties: {
        relevance: { type: 'integer' },
        situation: { type: 'integer' },
        task: { type: 'integer' },
        actions: { type: 'integer' },
        ownership: { type: 'integer' },
        result: { type: 'integer' },
        impact: { type: 'integer' },
        reflection: { type: 'integer' },
        conciseness: { type: 'integer' },
        clarity: { type: 'integer' },
      },
      required: [
        'relevance', 'situation', 'task', 'actions', 'ownership',
        'result', 'impact', 'reflection', 'conciseness', 'clarity',
      ],
    },
    overallScore: { type: 'integer' },
    strengths: { type: 'array', items: { type: 'string' } },
    missingDetails: { type: 'array', items: { type: 'string' } },
    unsupportedClaims: { type: 'array', items: { type: 'string' } },
    suggestedFollowUps: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
    improvedAnswer: { type: 'string' },
    factsUsed: { type: 'array', items: { type: 'string' } },
    missingInfo: { type: 'array', items: { type: 'string' } },
    changeExplanation: { type: 'string' },
  },
  required: [
    'scores', 'overallScore', 'strengths', 'missingDetails', 'unsupportedClaims',
    'suggestedFollowUps', 'recommendations', 'improvedAnswer', 'factsUsed',
    'missingInfo', 'changeExplanation',
  ],
};

const SYSTEM_PROMPT = `You are an expert behavioral interview coach. You are encouraging, specific, and honest. Address the candidate as "you".

Your job: evaluate the candidate's answer against a 10-point rubric (each category scored 0-10) and produce a fact-preserving improved answer.

ABSOLUTE RULES — never break these:
- Use ONLY (a) facts stated in the candidate's answer and (b) the VERIFIED FACTS block. Those are the sole source of truth about the candidate.
- NEVER invent, assume, infer, or embellish employment history, companies, roles, projects, tools, responsibilities, metrics, numbers, dates, or outcomes. If it is not in (a) or (b), it does not exist.
- If a stronger answer would need a fact the candidate did not provide, DO NOT make one up. Insert an editable placeholder in square brackets, e.g. "[add the specific metric, if you have one]", and list that gap under missingInfo.
- General coaching advice is NOT a fact about the candidate. Never phrase advice as something they did.
- unsupportedClaims: statements in the candidate's answer that go beyond what the verified facts support (possible exaggerations to double-check). Empty array if none — do not invent doubts.

Scoring guidance:
- Score each category on its own evidence in the answer; be consistent and fair, not harsh or inflated.
- overallScore (0-100) is a holistic judgement roughly consistent with the category scores — it should not contradict them (e.g. not 90 when most categories are low).

The improved answer must:
- Directly answer THIS question in clear STAR structure (Situation, Task, Action, Result), then a one-line lesson if the facts support it.
- Sound natural spoken (first person, plain language, no buzzword padding) and fit ~60-120 seconds (about 130-260 words).
- Preserve every real fact; mark any missing fact with a [bracketed] prompt rather than filling it in.
- changeExplanation: 1-3 sentences on the most important improvements, in plain language.

suggestedFollowUps: 3-5 realistic questions a real interviewer would ask about THIS specific answer — probing personal contribution, how success was measured, the hardest part, how others reacted, what they would do differently, and the lesson learned. Make them specific to the answer, not generic.

recommendations, strengths, missingDetails: 2-5 concise, actionable items each.

Return ONLY the structured object.`;

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

async function buildGrounding(
  supabase: ReturnType<typeof createClient>,
): Promise<{ text: string; hasFacts: boolean }> {
  const [profileRes, expRes, projRes, storyRes] = await Promise.all([
    supabase.from('user_profiles').select('target_role, industry, skills, certifications').maybeSingle(),
    supabase.from('work_experiences').select('*').limit(15),
    supabase.from('projects').select('*').limit(15),
    supabase.from('star_stories').select('*').limit(15),
  ]);

  const parts: string[] = [];
  const p = profileRes.data as Record<string, unknown> | null;
  if (p) {
    if (p.target_role) parts.push(`Target role: ${p.target_role}`);
    if (p.industry) parts.push(`Industry: ${p.industry}`);
    if (Array.isArray(p.skills) && p.skills.length) parts.push(`Skills: ${p.skills.join(', ')}`);
    if (Array.isArray(p.certifications) && p.certifications.length)
      parts.push(`Certifications: ${p.certifications.join(', ')}`);
  }

  for (const e of (expRes.data ?? []) as Record<string, unknown>[]) {
    parts.push(
      `Experience: ${e.title} at ${e.company}. ${e.description ?? ''} ` +
        `Highlights: ${(e.highlights as string[] | null)?.join('; ') ?? ''}. ` +
        `Skills: ${(e.skills as string[] | null)?.join(', ') ?? ''}`.trim(),
    );
  }
  for (const pr of (projRes.data ?? []) as Record<string, unknown>[]) {
    parts.push(
      `Project: ${pr.name}. ${pr.description ?? ''} ` +
        `Highlights: ${(pr.highlights as string[] | null)?.join('; ') ?? ''}`.trim(),
    );
  }
  for (const s of (storyRes.data ?? []) as Record<string, unknown>[]) {
    parts.push(
      `STAR story "${s.title}": Situation: ${s.situation ?? ''} Task: ${s.task ?? ''} ` +
        `Action: ${s.action ?? ''} Result: ${s.result ?? ''} Lesson: ${s.lesson ?? ''}`,
    );
  }

  const text = parts.map((x) => truncate(x, 600)).join('\n');
  return { text: truncate(text, 8000), hasFacts: parts.length > 0 };
}

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

  let questionText = '';
  let competency: string | null = null;
  let answer = '';
  try {
    const body = await req.json();
    questionText = String(body.questionText ?? '').slice(0, MAX_QUESTION_CHARS);
    competency = body.competency ?? null;
    answer = String(body.answer ?? '').slice(0, MAX_ANSWER_CHARS);
    if (!questionText || !answer.trim()) throw new Error('questionText and answer are required');
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }

  try {
    const grounding = await buildGrounding(supabase);

    const userMessage = [
      `QUESTION (competency: ${competency ?? 'general'}):`,
      questionText,
      '',
      'CANDIDATE ANSWER:',
      answer,
      '',
      'VERIFIED FACTS (the only facts you may treat as true about the candidate):',
      grounding.hasFacts ? grounding.text : '(none provided — do not assume any facts beyond the answer itself)',
    ].join('\n');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: EVAL_MODEL,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        output_config: {
          format: { type: 'json_schema', schema: RUBRIC_SCHEMA },
        },
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return json({ error: `Model error ${res.status}: ${truncate(detail, 400)}` }, 502);
    }

    const data = await res.json();
    const block = (data.content ?? []).find((b: { type: string }) => b.type === 'text');
    if (!block?.text) return json({ error: 'Empty model response' }, 502);

    const evaluation = JSON.parse(block.text);
    return json({ ...evaluation, source: 'ai' });
  } catch (e) {
    return json({ error: (e as Error).message ?? 'Evaluation failed' }, 500);
  }
});
