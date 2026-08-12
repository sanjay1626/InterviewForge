import type { Competency } from '@/core/domain/competencies';
import type { PracticeAttempt } from './attempt';

/**
 * Groups practice attempts by question so each question shows its version
 * history and score progression ("62 → 85"). Pure and deterministic.
 * Input is expected newest-first (as `listAttempts` returns).
 */
export interface QuestionHistory {
  questionText: string;
  competency: Competency | null;
  /** Newest first. Each is a saved version of the answer to this question. */
  attempts: PracticeAttempt[];
  latestScore: number;
  firstScore: number;
  bestScore: number;
  /** latestScore − firstScore (positive = improving). */
  trend: number;
  lastPracticedAt: string;
}

export function groupAttemptsByQuestion(
  attempts: PracticeAttempt[],
): QuestionHistory[] {
  const order: string[] = [];
  const groups = new Map<string, PracticeAttempt[]>();

  for (const attempt of attempts) {
    const key = attempt.questionText;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(attempt);
  }

  return order.map((key) => {
    const items = groups.get(key)!; // newest first
    const latest = items[0]!;
    const oldest = items[items.length - 1]!;
    const scores = items.map((a) => a.evaluation.overallScore);
    const latestScore = latest.evaluation.overallScore;
    const firstScore = oldest.evaluation.overallScore;
    return {
      questionText: key,
      competency: latest.competency,
      attempts: items,
      latestScore,
      firstScore,
      bestScore: Math.max(...scores),
      trend: latestScore - firstScore,
      lastPracticedAt: latest.createdAt,
    };
  });
}
