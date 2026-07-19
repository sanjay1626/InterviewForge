import {
  competencyLabel,
  type Competency,
} from '@/core/domain/competencies';
import { countWords } from '@/core/utils/text';
import type { StarStory } from '@/features/stories/domain/types';
import type { PracticeAttempt } from './attempt';
import { IDEAL_MAX_WORDS } from './evaluation';
import { analyzeFillers } from './fillers';
import { QUESTION_LIBRARY } from './questions';

/**
 * Progress metrics computed purely from stored attempts + stories. Client-side
 * computation keeps the dashboard working offline and for guests; nothing here
 * is derived from anything but the user's own recorded activity.
 */

export interface CompetencyScore {
  competency: Competency;
  label: string;
  average: number; // 0–100
  count: number;
}

export interface ProgressSummary {
  questionsPracticed: number;
  sessionsCompleted: number;
  averageScore: number;
  competencyScores: CompetencyScore[];
  strongest: CompetencyScore | null;
  weakest: CompetencyScore | null;
  streakDays: number;
  storiesReady: number;
  storiesNeedingDetail: number;
  answersTooLong: number;
  fillerHeavyCount: number;
  recentAttempts: PracticeAttempt[];
  recommendedNext: { id: string; prompt: string; competency: Competency }[];
}

function dayKey(iso: string): string {
  return iso.slice(0, 10); // YYYY-MM-DD (UTC) — stable for streaks
}

/** Consecutive days with activity ending today or yesterday. */
export function computeStreak(dates: string[], today = new Date()): number {
  const days = new Set(dates.map(dayKey));
  if (days.size === 0) return 0;

  const oneDay = 24 * 60 * 60 * 1000;
  const todayKey = today.toISOString().slice(0, 10);
  const yesterdayKey = new Date(today.getTime() - oneDay).toISOString().slice(0, 10);

  // The run must be "current": include today or yesterday, else streak is 0.
  let cursor: Date;
  if (days.has(todayKey)) cursor = new Date(todayKey);
  else if (days.has(yesterdayKey)) cursor = new Date(yesterdayKey);
  else return 0;

  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - oneDay);
  }
  return streak;
}

export function computeProgress(
  attempts: PracticeAttempt[],
  stories: StarStory[],
  today = new Date(),
): ProgressSummary {
  const scored = attempts.filter((a) => a.evaluation);
  const questionsPracticed = attempts.length;

  const averageScore =
    scored.length === 0
      ? 0
      : Math.round(
          scored.reduce((sum, a) => sum + a.evaluation.overallScore, 0) / scored.length,
        );

  // Per-competency averages.
  const byComp = new Map<Competency, { total: number; count: number }>();
  for (const a of scored) {
    if (!a.competency) continue;
    const entry = byComp.get(a.competency) ?? { total: 0, count: 0 };
    entry.total += a.evaluation.overallScore;
    entry.count += 1;
    byComp.set(a.competency, entry);
  }
  const competencyScores: CompetencyScore[] = [...byComp.entries()]
    .map(([competency, { total, count }]) => ({
      competency,
      label: competencyLabel(competency),
      average: Math.round(total / count),
      count,
    }))
    .sort((a, b) => b.average - a.average);

  const strongest = competencyScores[0] ?? null;
  const weakest =
    competencyScores.length > 0 ? competencyScores[competencyScores.length - 1]! : null;

  const answersTooLong = attempts.filter(
    (a) => countWords(a.answer) > IDEAL_MAX_WORDS,
  ).length;

  const fillerHeavyCount = attempts.filter(
    (a) => a.mode === 'voice' && analyzeFillers(a.answer).rate > 4,
  ).length;

  const storiesReady = stories.filter((s) => s.status === 'ready').length;
  const storiesNeedingDetail = stories.filter(
    (s) => s.status !== 'ready',
  ).length;

  const streakDays = computeStreak(
    attempts.map((a) => a.createdAt),
    today,
  );

  // Recommend from the weakest competency, questions not yet practiced.
  const practicedPrompts = new Set(attempts.map((a) => a.questionText));
  const targetCompetency = weakest?.competency ?? null;
  const recommendedNext = QUESTION_LIBRARY.filter(
    (q) =>
      !practicedPrompts.has(q.prompt) &&
      (targetCompetency ? q.competency === targetCompetency : q.isFoundational),
  )
    .slice(0, 3)
    .map((q) => ({ id: q.id, prompt: q.prompt, competency: q.competency }));

  return {
    questionsPracticed,
    sessionsCompleted: questionsPracticed,
    averageScore,
    competencyScores,
    strongest,
    weakest,
    streakDays,
    storiesReady,
    storiesNeedingDetail,
    answersTooLong,
    fillerHeavyCount,
    recentAttempts: attempts.slice(0, 5),
    recommendedNext,
  };
}
