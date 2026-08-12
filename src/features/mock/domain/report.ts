import { competencyLabel, type Competency } from '@/core/domain/competencies';
import { countWords } from '@/core/utils/text';
import type { AnswerEvaluation } from '@/features/practice/domain/evaluation';
import { analyzeFillers } from '@/features/practice/domain/fillers';
import type { MockAnswer, MockReport, QuestionReport } from './session';

/**
 * Builds the final interview report by aggregating the per-answer evaluations
 * produced by the existing evaluation pipeline. Pure and deterministic — every
 * number is derived from the evaluations, so nothing is fabricated.
 */

function avg(nums: number[]): number {
  return nums.length ? Math.round(nums.reduce((s, n) => s + n, 0) / nums.length) : 0;
}

/** Answer + its evaluation, paired positionally. */
export interface ScoredAnswer {
  answer: MockAnswer;
  evaluation: AnswerEvaluation;
}

export function buildMockReport(scored: ScoredAnswer[]): MockReport {
  const questions: QuestionReport[] = scored.map(({ answer, evaluation }) => ({
    questionText: answer.questionText,
    competency: answer.competency,
    transcript: answer.transcript,
    mode: answer.mode,
    followUps: answer.followUps,
    evaluation,
  }));

  const overall = scored.map((s) => s.evaluation.overallScore);
  const s = (fn: (e: AnswerEvaluation['scores']) => number) =>
    avg(scored.map((x) => fn(x.evaluation.scores) * 10)); // 0–10 → 0–100

  // Per-competency averages (skip questions with no competency, e.g. opening).
  const byComp = new Map<Competency, number[]>();
  for (const { answer, evaluation } of scored) {
    if (!answer.competency) continue;
    const list = byComp.get(answer.competency) ?? [];
    list.push(evaluation.overallScore);
    byComp.set(answer.competency, list);
  }
  const competencyScores = [...byComp.entries()]
    .map(([competency, list]) => ({
      competency,
      label: competencyLabel(competency),
      score: avg(list),
    }))
    .sort((a, b) => b.score - a.score);

  // Strongest / weakest response by overall score.
  let strongestIndex = 0;
  let weakestIndex = 0;
  scored.forEach((x, i) => {
    if (x.evaluation.overallScore > scored[strongestIndex]!.evaluation.overallScore) strongestIndex = i;
    if (x.evaluation.overallScore < scored[weakestIndex]!.evaluation.overallScore) weakestIndex = i;
  });

  // Speaking pace from voice answers with a known duration.
  const voice = scored.filter(
    (x) => x.answer.mode === 'voice' && x.answer.durationMs > 0,
  );
  let speakingPaceWpm: number | null = null;
  if (voice.length > 0) {
    const rates = voice.map(
      (x) => countWords(x.answer.transcript) / (x.answer.durationMs / 60000),
    );
    speakingPaceWpm = Math.round(avg(rates.map((r) => Math.round(r))));
  }

  // Filler analysis across voice transcripts.
  const voiceText = scored
    .filter((x) => x.answer.mode === 'voice')
    .map((x) => x.answer.transcript)
    .join(' ');
  const fillers = analyzeFillers(voiceText);

  const unsupportedClaims = Array.from(
    new Set(scored.flatMap((x) => x.evaluation.unsupportedClaims)),
  ).slice(0, 8);

  // Recommendations from the weakest answers' own recommendations.
  const recommendedNext = Array.from(
    new Set(
      [...scored]
        .sort((a, b) => a.evaluation.overallScore - b.evaluation.overallScore)
        .flatMap((x) => x.evaluation.recommendations),
    ),
  ).slice(0, 4);

  const questionsToRetry = [...scored]
    .map((x, i) => ({ i, score: x.evaluation.overallScore, q: x.answer.questionText }))
    .sort((a, b) => a.score - b.score)
    .slice(0, Math.min(2, scored.length))
    .map((x) => x.q);

  const source: 'ai' | 'offline' = scored.every((x) => x.evaluation.source === 'ai')
    ? 'ai'
    : 'offline';

  return {
    overallScore: avg(overall),
    relevanceToRole: s((sc) => sc.relevance),
    communicationScore: avg([s((sc) => sc.clarity), s((sc) => sc.conciseness)]),
    competencyScores,
    starCompleteness: avg([
      s((sc) => sc.situation),
      s((sc) => sc.task),
      s((sc) => sc.actions),
      s((sc) => sc.result),
    ]),
    specificityOwnership: avg([s((sc) => sc.actions), s((sc) => sc.ownership)]),
    resultsImpact: avg([s((sc) => sc.result), s((sc) => sc.impact)]),
    conciseness: s((sc) => sc.conciseness),
    speakingPaceWpm,
    fillerCount: fillers.fillerCount,
    fillerRate: fillers.rate,
    strongestIndex,
    weakestIndex,
    unsupportedClaims,
    recommendedNext,
    questionsToRetry,
    questions,
    source,
  };
}
