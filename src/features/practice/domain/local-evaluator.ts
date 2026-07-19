import { GENERIC_FOLLOW_UPS } from './questions';
import {
  IDEAL_MAX_WORDS,
  IDEAL_MIN_WORDS,
  RUBRIC_KEYS,
  type AnswerEvaluation,
  type EvaluationRequest,
  type RubricScores,
} from './evaluation';

/**
 * Deterministic, offline heuristic evaluator. Used when no AI backend is
 * available (guest mode, or Supabase/LLM not configured). It never fabricates:
 * it scores structural signals in the user's own text and, for the "improved"
 * answer, returns the user's answer with bracketed prompts for missing STAR
 * parts rather than inventing content.
 */

const STOP = new Set([
  'tell', 'about', 'time', 'describe', 'situation', 'your', 'have', 'that', 'this',
  'with', 'from', 'what', 'when', 'were', 'where', 'they', 'them', 'their', 'would',
  'could', 'been', 'into', 'which', 'while', 'there', 'here',
]);

function words(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

function sentences(text: string): string[] {
  return text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
}

function clamp(n: number, lo = 0, hi = 10): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function has(text: string, patterns: RegExp): boolean {
  return patterns.test(text);
}

export function evaluateLocally(req: EvaluationRequest): AnswerEvaluation {
  const answer = req.answer.trim();
  const lower = answer.toLowerCase();
  const w = words(answer);
  const wordCount = w.length;
  const sents = sentences(answer);
  const avgSentenceLen = sents.length ? wordCount / sents.length : wordCount;

  // Question keyword overlap → relevance.
  const qWords = new Set(
    words(req.questionText.toLowerCase())
      .map((x) => x.replace(/[^a-z]/g, ''))
      .filter((x) => x.length > 3 && !STOP.has(x)),
  );
  const answerWordSet = new Set(w.map((x) => x.toLowerCase().replace(/[^a-z]/g, '')));
  let overlap = 0;
  qWords.forEach((qw) => {
    if (answerWordSet.has(qw)) overlap += 1;
  });
  const relevance = qWords.size
    ? clamp(3 + (overlap / qWords.size) * 7)
    : clamp(wordCount > 40 ? 7 : 4);

  // Structural signals (all derived from the user's own words).
  const iCount = (lower.match(/\bi\b/g) ?? []).length;
  const hasNumbers = /\d/.test(answer);
  const situationCue = has(lower, /\b(when|at|during|while|team|project|company|we were|role)\b/);
  const taskCue = has(lower, /\b(responsible|my (job|goal|task)|had to|needed to|assigned|goal was|tasked)\b/);
  const resultCue =
    hasNumbers ||
    has(lower, /\b(result|outcome|led to|increased|reduced|improved|delivered|shipped|achieved|as a result|so that|ended up)\b/);
  const reflectionCue = has(lower, /\b(learned|realized|takeaway|next time|in hindsight|would (do|have)|since then)\b/);

  const shortPenalty = wordCount < 40 ? -3 : 0;

  const situation = clamp((situationCue ? 7 : 4) + (wordCount > 60 ? 1 : 0) + shortPenalty);
  const task = clamp((taskCue ? 8 : 4) + shortPenalty);
  const actions = clamp(3 + Math.min(iCount, 5) + (wordCount > 80 ? 1 : 0) + shortPenalty);
  const ownership = clamp(
    iCount >= 3 ? 8 : iCount >= 1 ? 6 : 3,
  ) - (/\bwe\b/.test(lower) && iCount === 0 ? 2 : 0);
  const result = clamp((resultCue ? 8 : 3) + shortPenalty);
  const impact = clamp(hasNumbers ? 8 : resultCue ? 5 : 2);
  const reflection = clamp(reflectionCue ? 8 : 3);

  // Conciseness: best inside the ideal spoken window.
  let conciseness: number;
  if (wordCount === 0) conciseness = 0;
  else if (wordCount < IDEAL_MIN_WORDS) conciseness = clamp(4 + (wordCount / IDEAL_MIN_WORDS) * 5);
  else if (wordCount <= IDEAL_MAX_WORDS) conciseness = 10;
  else conciseness = clamp(10 - (wordCount - IDEAL_MAX_WORDS) / 30);

  // Clarity: penalize very long or very short sentences.
  const clarity = clamp(
    avgSentenceLen >= 8 && avgSentenceLen <= 24 ? 8 : avgSentenceLen > 24 ? 5 : 6,
  );

  const scores: RubricScores = {
    relevance: clamp(Math.max(0, relevance)),
    situation,
    task,
    actions,
    ownership: clamp(Math.max(0, ownership)),
    result,
    impact,
    reflection,
    conciseness,
    clarity,
  };

  const overallScore = Math.round(
    (RUBRIC_KEYS.reduce((sum, k) => sum + scores[k], 0) / (RUBRIC_KEYS.length * 10)) * 100,
  );

  // Missing STAR parts → editable prompts (never fabricated content).
  const missingDetails: string[] = [];
  const bracketPrompts: string[] = [];
  if (!situationCue || wordCount < 30) {
    missingDetails.push('Set the scene: where were you and what was happening?');
    bracketPrompts.push('[Situation: briefly set the scene — where and when?]');
  }
  if (!taskCue) {
    missingDetails.push('State your specific task or responsibility.');
    bracketPrompts.push('[Task: what were you responsible for here?]');
  }
  if (actions < 6) {
    missingDetails.push('Describe the specific actions YOU took (use “I”).');
    bracketPrompts.push('[Action: what did you personally do, step by step?]');
  }
  if (!resultCue) {
    missingDetails.push('Add the result — what happened because of your actions?');
    bracketPrompts.push('[Result: what was the outcome? Real facts only.]');
  }
  if (!hasNumbers) {
    missingDetails.push('If you have a real metric, add it (no invented numbers).');
  }
  if (!reflectionCue) {
    missingDetails.push('Add a brief reflection: what did you learn?');
    bracketPrompts.push('[Lesson: what did you take away?]');
  }

  const recommendations: string[] = [];
  if (ownership < 6) recommendations.push('Use “I” more than “we” — make your own role explicit.');
  if (conciseness < 6 && wordCount > IDEAL_MAX_WORDS)
    recommendations.push('Tighten your answer toward ~60–120 seconds when spoken.');
  if (conciseness < 6 && wordCount < IDEAL_MIN_WORDS)
    recommendations.push('Add a bit more detail — the answer is quite short.');
  if (impact < 5) recommendations.push('Quantify the impact if you genuinely can.');
  if (recommendations.length === 0)
    recommendations.push('Solid structure — rehearse it out loud to tighten delivery.');

  const strengths: string[] = [];
  if (situationCue) strengths.push('You set up the situation clearly.');
  if (resultCue) strengths.push('You included an outcome.');
  if (reflectionCue) strengths.push('You reflected on what you learned.');
  if (iCount >= 3) strengths.push('You made your personal role explicit.');
  if (strengths.length === 0) strengths.push('You have a starting point to build on.');

  const improvedAnswer =
    answer +
    (bracketPrompts.length
      ? '\n\n' + bracketPrompts.join('\n')
      : '');

  return {
    scores,
    overallScore,
    strengths,
    missingDetails,
    // Offline mode can't verify claims against your profile — it never flags any.
    unsupportedClaims: [],
    suggestedFollowUps: GENERIC_FOLLOW_UPS,
    recommendations,
    improvedAnswer,
    factsUsed: [],
    missingInfo: bracketPrompts.map((p) => p.replace(/^\[|\]$/g, '')),
    changeExplanation:
      'Offline estimate: scored from the structure of your own words. Connect an AI provider for a grounded evaluation and a polished, fact-checked rewrite. No content was invented — missing parts are marked in [brackets] for you to fill in.',
    source: 'offline',
  };
}
