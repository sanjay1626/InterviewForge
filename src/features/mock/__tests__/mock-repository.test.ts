import AsyncStorage from '@react-native-async-storage/async-storage';

import { defaultMockConfig } from '../domain/config';
import type { MockReport, MockSession } from '../domain/session';
import { CompositeMockRepository } from '../data/composite-mock-repository';

const GUEST_ID = 'guest-local-user';

function session(over: Partial<MockSession>): MockSession {
  const now = '2026-08-05T10:00:00.000Z';
  return {
    id: over.id ?? 'sess-1',
    config: over.config ?? { ...defaultMockConfig('SWE'), length: 'quick' },
    status: over.status ?? 'in_progress',
    plan: over.plan ?? [
      { id: 'opening', kind: 'opening', competency: null, prompt: 'Tell me about yourself.' },
    ],
    answers: over.answers ?? [],
    report: over.report ?? null,
    startedAt: now,
    completedAt: over.completedAt ?? null,
    createdAt: now,
  };
}

const report: MockReport = {
  overallScore: 72,
  relevanceToRole: 70, communicationScore: 70, competencyScores: [],
  starCompleteness: 70, specificityOwnership: 70, resultsImpact: 70, conciseness: 70,
  speakingPaceWpm: 130, fillerCount: 2, fillerRate: 3,
  strongestIndex: 0, weakestIndex: 0, unsupportedClaims: [],
  recommendedNext: [], questionsToRetry: [], questions: [], source: 'ai',
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('CompositeMockRepository (guest, local)', () => {
  it('persists a completed session and reads back its report', async () => {
    const repo = new CompositeMockRepository(null);
    const completed = session({
      id: 's-done',
      status: 'completed',
      report,
      completedAt: '2026-08-05T10:10:00.000Z',
    });
    expect((await repo.saveSession(GUEST_ID, completed)).ok).toBe(true);

    const view = await repo.getReport(GUEST_ID, 's-done');
    expect(view.ok).toBe(true);
    if (!view.ok) return;
    expect(view.value?.status).toBe('completed');
    expect(view.value?.report?.overallScore).toBe(72);
  });

  it('recovers a partial (abandoned) session; report is null', async () => {
    const repo = new CompositeMockRepository(null);
    const abandoned = session({
      id: 's-partial',
      status: 'abandoned',
      answers: [
        {
          questionId: 'opening',
          questionText: 'Tell me about yourself.',
          kind: 'opening',
          competency: null,
          transcript: 'I am a developer.',
          mode: 'text',
          durationMs: 12000,
          followUps: [],
        },
      ],
      completedAt: '2026-08-05T10:03:00.000Z',
    });
    expect((await repo.saveSession(GUEST_ID, abandoned)).ok).toBe(true);

    const view = await repo.getReport(GUEST_ID, 's-partial');
    expect(view.ok && view.value?.status).toBe('abandoned');
    expect(view.ok && view.value?.report).toBeNull();
  });

  it('lists sessions distinguishing completed vs abandoned, newest first', async () => {
    const repo = new CompositeMockRepository(null);
    await repo.saveSession(GUEST_ID, session({ id: 'a', status: 'completed', report }));
    await repo.saveSession(GUEST_ID, session({ id: 'b', status: 'abandoned' }));

    const list = await repo.listSessions(GUEST_ID);
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.value).toHaveLength(2);
    const byId = Object.fromEntries(list.value.map((s) => [s.id, s]));
    expect(byId['a']?.status).toBe('completed');
    expect(byId['a']?.overallScore).toBe(72);
    expect(byId['b']?.status).toBe('abandoned');
    expect(byId['b']?.overallScore).toBeNull();
  });
});
