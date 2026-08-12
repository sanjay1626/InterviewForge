import type { PracticeAttempt } from '../domain/attempt';
import type { AnswerEvaluation } from '../domain/evaluation';
import { groupAttemptsByQuestion } from '../domain/history';

function attempt(
  question: string,
  score: number,
  createdAt: string,
): PracticeAttempt {
  const evaluation = { overallScore: score, source: 'ai' } as AnswerEvaluation;
  return {
    id: `${question}-${createdAt}`,
    questionId: null,
    questionText: question,
    competency: 'problem-solving',
    answer: 'a',
    mode: 'text',
    evaluation,
    createdAt,
  };
}

describe('groupAttemptsByQuestion', () => {
  it('groups by question and computes version trend (newest-first input)', () => {
    // listAttempts returns newest first.
    const attempts: PracticeAttempt[] = [
      attempt('Q1', 85, '2026-07-03'),
      attempt('Q2', 50, '2026-07-02'),
      attempt('Q1', 62, '2026-07-01'),
    ];

    const groups = groupAttemptsByQuestion(attempts);
    expect(groups).toHaveLength(2);

    const q1 = groups.find((g) => g.questionText === 'Q1')!;
    expect(q1.attempts).toHaveLength(2);
    expect(q1.latestScore).toBe(85); // newest
    expect(q1.firstScore).toBe(62); // oldest
    expect(q1.bestScore).toBe(85);
    expect(q1.trend).toBe(23); // improved
    expect(q1.lastPracticedAt).toBe('2026-07-03');

    const q2 = groups.find((g) => g.questionText === 'Q2')!;
    expect(q2.attempts).toHaveLength(1);
    expect(q2.trend).toBe(0);
  });

  it('preserves first-seen order of questions', () => {
    const groups = groupAttemptsByQuestion([
      attempt('B', 10, '2026-07-03'),
      attempt('A', 20, '2026-07-02'),
    ]);
    expect(groups.map((g) => g.questionText)).toEqual(['B', 'A']);
  });

  it('returns empty for no attempts', () => {
    expect(groupAttemptsByQuestion([])).toEqual([]);
  });
});
