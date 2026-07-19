import AsyncStorage from '@react-native-async-storage/async-storage';

import { CompositeEvaluationRepository } from '../data/composite-evaluation-repository';
import { CompositePracticeRepository } from '../data/composite-practice-repository';
import { normalizeEvaluation } from '../data/normalize-evaluation';
import type { AnswerEvaluation } from '../domain/evaluation';

const GUEST_ID = 'guest-local-user';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('normalizeEvaluation', () => {
  it('clamps scores and defaults arrays from a messy payload', () => {
    const evaluation = normalizeEvaluation(
      {
        scores: { relevance: 99, situation: -4, task: 'x', clarity: 7 },
        overallScore: 250,
        strengths: ['good', 42, ''],
        improvedAnswer: 12,
      },
      'ai',
    );
    expect(evaluation.scores.relevance).toBe(10);
    expect(evaluation.scores.situation).toBe(0);
    expect(evaluation.scores.task).toBe(0); // non-numeric → fallback
    expect(evaluation.scores.clarity).toBe(7);
    expect(evaluation.overallScore).toBe(100);
    expect(evaluation.strengths).toEqual(['good']); // non-strings/empties filtered
    expect(evaluation.improvedAnswer).toBe(''); // non-string → empty
    expect(evaluation.source).toBe('ai');
  });
});

describe('CompositeEvaluationRepository (no backend → offline)', () => {
  it('always resolves to an offline evaluation for guests', async () => {
    const repo = new CompositeEvaluationRepository(null);
    const result = await repo.evaluate(GUEST_ID, {
      questionText: 'Tell me about a challenge.',
      competency: 'problem-solving',
      answer: 'I led a project and shipped it on time. I learned to plan earlier.',
      mode: 'text',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.source).toBe('offline');
  });
});

describe('CompositePracticeRepository (guest, local)', () => {
  it('saves and lists attempts locally, newest first', async () => {
    const repo = new CompositePracticeRepository(null);
    const evaluation: AnswerEvaluation = normalizeEvaluation(
      { scores: {}, overallScore: 55 },
      'offline',
    );

    const saved = await repo.saveAttempt(GUEST_ID, {
      questionId: 'problem-solving-1',
      questionText: 'Tell me about a challenge.',
      competency: 'problem-solving',
      answer: 'My answer.',
      mode: 'text',
      evaluation,
    });
    expect(saved.ok).toBe(true);

    const listed = await repo.listAttempts(GUEST_ID);
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.value).toHaveLength(1);
    expect(listed.value[0]?.evaluation.overallScore).toBe(55);
    expect(listed.value[0]?.competency).toBe('problem-solving');
  });
});
