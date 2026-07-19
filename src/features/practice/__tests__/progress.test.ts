import type { StarStory } from '@/features/stories/domain/types';
import type { PracticeAttempt } from '../domain/attempt';
import type { AnswerEvaluation } from '../domain/evaluation';
import { computeProgress, computeStreak } from '../domain/progress';

function evaluation(overall: number): AnswerEvaluation {
  return {
    scores: {
      relevance: 0, situation: 0, task: 0, actions: 0, ownership: 0,
      result: 0, impact: 0, reflection: 0, conciseness: 0, clarity: 0,
    },
    overallScore: overall,
    strengths: [],
    missingDetails: [],
    unsupportedClaims: [],
    suggestedFollowUps: [],
    recommendations: [],
    improvedAnswer: '',
    factsUsed: [],
    missingInfo: [],
    changeExplanation: '',
    source: 'offline',
  };
}

function attempt(
  over: Partial<PracticeAttempt> & { overall: number },
): PracticeAttempt {
  return {
    id: over.id ?? Math.random().toString(),
    questionId: null,
    questionText: over.questionText ?? 'Q',
    competency: over.competency ?? 'problem-solving',
    answer: over.answer ?? 'a short answer',
    mode: over.mode ?? 'text',
    evaluation: evaluation(over.overall),
    createdAt: over.createdAt ?? '2026-07-19T10:00:00.000Z',
  };
}

const story = (status: StarStory['status']): StarStory => ({
  id: Math.random().toString(),
  title: 'S',
  situation: null, task: null, action: null, result: null, lesson: null,
  skills: [], competencies: [], company: null, project: null, tags: [],
  status,
  createdAt: 't', updatedAt: 't',
});

describe('computeStreak', () => {
  it('counts consecutive days ending today', () => {
    const today = new Date('2026-07-19T12:00:00Z');
    const streak = computeStreak(
      [
        '2026-07-19T09:00:00Z',
        '2026-07-18T09:00:00Z',
        '2026-07-17T20:00:00Z',
        '2026-07-15T20:00:00Z', // gap → stops the run
      ],
      today,
    );
    expect(streak).toBe(3);
  });

  it('is zero when the last activity is older than yesterday', () => {
    const today = new Date('2026-07-19T12:00:00Z');
    expect(computeStreak(['2026-07-16T09:00:00Z'], today)).toBe(0);
  });

  it('is zero with no activity', () => {
    expect(computeStreak([])).toBe(0);
  });
});

describe('computeProgress', () => {
  it('aggregates scores, competencies, and story counts', () => {
    const attempts: PracticeAttempt[] = [
      attempt({ overall: 80, competency: 'problem-solving', questionText: 'Q1' }),
      attempt({ overall: 40, competency: 'leadership', questionText: 'Q2' }),
      attempt({ overall: 60, competency: 'problem-solving', questionText: 'Q3' }),
    ];
    const stories = [story('ready'), story('draft'), story('needs_details')];

    const summary = computeProgress(attempts, stories, new Date('2026-07-19T12:00:00Z'));

    expect(summary.questionsPracticed).toBe(3);
    expect(summary.averageScore).toBe(60); // (80+40+60)/3
    expect(summary.strongest?.competency).toBe('problem-solving'); // avg 70
    expect(summary.weakest?.competency).toBe('leadership'); // avg 40
    expect(summary.storiesReady).toBe(1);
    expect(summary.storiesNeedingDetail).toBe(2);
  });

  it('flags long answers and recommends from the weakest competency', () => {
    const longAnswer = Array.from({ length: 300 }, () => 'word').join(' ');
    const attempts: PracticeAttempt[] = [
      attempt({ overall: 30, competency: 'leadership', answer: longAnswer, questionText: 'Long one' }),
    ];
    const summary = computeProgress(attempts, [], new Date('2026-07-19T12:00:00Z'));
    expect(summary.answersTooLong).toBe(1);
    // recommendations should target leadership (the weakest/only competency)
    expect(summary.recommendedNext.length).toBeGreaterThan(0);
    expect(summary.recommendedNext.every((q) => q.competency === 'leadership')).toBe(true);
  });

  it('returns empty-ish summary for no attempts', () => {
    const summary = computeProgress([], []);
    expect(summary.questionsPracticed).toBe(0);
    expect(summary.averageScore).toBe(0);
    expect(summary.strongest).toBeNull();
  });
});
