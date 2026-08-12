import { useMutation, useQuery } from '@tanstack/react-query';

import type { AppError } from '@/core/domain/errors';
import { noSessionError } from '@/core/domain/errors';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { usePracticeRepositories } from '@/features/practice/PracticeProvider';
import { buildMockReport, type ScoredAnswer } from '../domain/report';
import type { MockReport, MockSession } from '../domain/session';
import { useMockRepository } from '../MockProvider';
import type { MockReportView, MockSessionSummary } from '../data/mock-repository';

/**
 * Generates the final report by evaluating each answer through the EXISTING
 * evaluation pipeline (AI when available, offline heuristic otherwise), then
 * aggregating. No fabrication: every score comes from an answer evaluation.
 */
export function useBuildMockReport() {
  const { evaluation } = usePracticeRepositories();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation<MockReport, AppError, MockSession>({
    mutationFn: async (session) => {
      if (!userId) throw noSessionError();
      const scored: ScoredAnswer[] = [];
      for (const answer of session.answers) {
        // Combine the answer with any follow-up responses for a fuller signal.
        const fullText = [
          answer.transcript,
          ...answer.followUps.map((f) => f.response),
        ]
          .filter((t) => t.trim())
          .join(' ');
        const result = await evaluation.evaluate(userId, {
          questionText: answer.questionText,
          competency: answer.competency,
          answer: fullText || answer.transcript,
          mode: answer.mode,
        });
        if (!result.ok) throw result.error;
        scored.push({ answer, evaluation: result.value });
      }
      return buildMockReport(scored);
    },
  });
}

/** Persists a session (in-flight, completed, or abandoned). */
export function useSaveMockSession() {
  const repo = useMockRepository();
  const userId = useAuthStore((s) => s.session?.user.id);
  return useMutation<void, AppError, MockSession>({
    mutationFn: async (session) => {
      if (!userId) throw noSessionError();
      const result = await repo.saveSession(userId, session);
      if (!result.ok) throw result.error;
    },
  });
}

/** Loads a past report by session id. */
export function useMockReport(sessionId: string | undefined) {
  const repo = useMockRepository();
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery<MockReportView | null, AppError>({
    queryKey: ['mock-report', userId ?? 'anon', sessionId],
    enabled: Boolean(userId && sessionId),
    queryFn: async () => {
      const result = await repo.getReport(userId as string, sessionId as string);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });
}

/** Lists the user's past mock sessions (completed + abandoned). */
export function useMockSessions() {
  const repo = useMockRepository();
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery<MockSessionSummary[], AppError>({
    queryKey: ['mock-sessions', userId ?? 'anon'],
    enabled: Boolean(userId),
    queryFn: async () => {
      const result = await repo.listSessions(userId as string);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });
}
