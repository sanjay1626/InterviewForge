import type { AnswerEvaluation, RubricScores } from '@/features/practice/domain/evaluation';
import { buildMockReport, type ScoredAnswer } from '../domain/report';
import type { MockAnswer } from '../domain/session';

function scores(v: number): RubricScores {
  return {
    relevance: v, situation: v, task: v, actions: v, ownership: v,
    result: v, impact: v, reflection: v, conciseness: v, clarity: v,
  };
}

function evaluation(overall: number, over: Partial<AnswerEvaluation> = {}): AnswerEvaluation {
  return {
    scores: scores(Math.round(overall / 10)),
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
    source: 'ai',
    ...over,
  };
}

function answer(over: Partial<MockAnswer>): MockAnswer {
  return {
    questionId: over.questionId ?? 'q',
    questionText: over.questionText ?? 'Question?',
    kind: over.kind ?? 'behavioral',
    competency: over.competency ?? 'problem-solving',
    transcript: over.transcript ?? 'I did the thing.',
    mode: over.mode ?? 'voice',
    durationMs: over.durationMs ?? 30000,
    followUps: over.followUps ?? [],
  };
}

describe('buildMockReport', () => {
  it('aggregates overall, competency, strongest/weakest from the evaluations', () => {
    const scored: ScoredAnswer[] = [
      { answer: answer({ questionText: 'A', competency: 'leadership' }), evaluation: evaluation(80) },
      { answer: answer({ questionText: 'B', competency: 'teamwork' }), evaluation: evaluation(40) },
      { answer: answer({ questionText: 'C', competency: 'leadership' }), evaluation: evaluation(60) },
    ];
    const report = buildMockReport(scored);

    expect(report.overallScore).toBe(60); // (80+40+60)/3
    expect(report.strongestIndex).toBe(0);
    expect(report.weakestIndex).toBe(1);
    const leadership = report.competencyScores.find((c) => c.competency === 'leadership');
    expect(leadership?.score).toBe(70); // (80+60)/2
    expect(report.source).toBe('ai');
    expect(report.questions).toHaveLength(3);
  });

  it('computes speaking pace from voice answers with durations', () => {
    const report = buildMockReport([
      {
        answer: answer({
          transcript: Array.from({ length: 120 }, () => 'word').join(' '),
          mode: 'voice',
          durationMs: 60000, // 120 words in 60s → 120 wpm
        }),
        evaluation: evaluation(70),
      },
    ]);
    expect(report.speakingPaceWpm).toBe(120);
  });

  it('marks the report offline when any answer used the offline evaluator', () => {
    const report = buildMockReport([
      { answer: answer({}), evaluation: evaluation(70) },
      { answer: answer({}), evaluation: evaluation(50, { source: 'offline' }) },
    ]);
    expect(report.source).toBe('offline');
  });

  it('never fabricates: unsupported claims come only from the evaluations', () => {
    const report = buildMockReport([
      { answer: answer({}), evaluation: evaluation(70, { unsupportedClaims: ['Claimed a 90% metric'] }) },
      { answer: answer({}), evaluation: evaluation(70) },
    ]);
    expect(report.unsupportedClaims).toEqual(['Claimed a 90% metric']);
  });
});
