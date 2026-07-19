import {
  RUBRIC_KEYS,
  type AnswerEvaluation,
  type EvaluationSource,
  type RubricScores,
} from '../domain/evaluation';

function clampInt(value: unknown, lo: number, hi: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

/**
 * Coerces a raw evaluation payload (from the Edge Function) into a safe,
 * fully-typed AnswerEvaluation — clamping scores and defaulting arrays so a
 * malformed model response can never crash the UI.
 */
export function normalizeEvaluation(
  raw: Record<string, unknown>,
  source: EvaluationSource,
): AnswerEvaluation {
  const rawScores = (raw.scores ?? {}) as Record<string, unknown>;
  const scores = Object.fromEntries(
    RUBRIC_KEYS.map((k) => [k, clampInt(rawScores[k], 0, 10, 0)]),
  ) as unknown as RubricScores;

  return {
    scores,
    overallScore: clampInt(raw.overallScore, 0, 100, 0),
    strengths: strArray(raw.strengths),
    missingDetails: strArray(raw.missingDetails),
    unsupportedClaims: strArray(raw.unsupportedClaims),
    suggestedFollowUps: strArray(raw.suggestedFollowUps),
    recommendations: strArray(raw.recommendations),
    improvedAnswer: typeof raw.improvedAnswer === 'string' ? raw.improvedAnswer : '',
    factsUsed: strArray(raw.factsUsed),
    missingInfo: strArray(raw.missingInfo),
    changeExplanation:
      typeof raw.changeExplanation === 'string' ? raw.changeExplanation : '',
    source,
  };
}
