import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Competency } from '@/core/domain/competencies';
import { noSessionError, type AppError } from '@/core/domain/errors';
import { useAuthStore } from '@/features/auth/store/auth-store';
import type { PracticeAttempt } from '../domain/attempt';
import type { AnswerEvaluation, PracticeMode } from '../domain/evaluation';
import type { TranscribeInput } from '../data/transcription-repository';
import { usePracticeRepositories } from '../PracticeProvider';

const keys = {
  attempts: (userId: string) => ['practice-attempts', userId] as const,
};

export interface EvaluateInput {
  questionId: string | null;
  questionText: string;
  competency: Competency | null;
  answer: string;
  mode: PracticeMode;
}

export interface EvaluateResult {
  evaluation: AnswerEvaluation;
  attempt: PracticeAttempt | null;
}

/**
 * Evaluates an answer (AI when available, offline otherwise) and best-effort
 * persists the attempt. A persistence failure never blocks showing feedback.
 */
export function useEvaluateAnswer() {
  const { evaluation: evaluator, practice } = usePracticeRepositories();
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();

  return useMutation<EvaluateResult, AppError, EvaluateInput>({
    mutationFn: async (input) => {
      if (!userId) throw noSessionError();
      const result = await evaluator.evaluate(userId, {
        questionText: input.questionText,
        competency: input.competency,
        answer: input.answer,
        mode: input.mode,
      });
      if (!result.ok) throw result.error;
      const evaluation = result.value;

      const saved = await practice.saveAttempt(userId, {
        questionId: input.questionId,
        questionText: input.questionText,
        competency: input.competency,
        answer: input.answer,
        mode: input.mode,
        evaluation,
      });

      return { evaluation, attempt: saved.ok ? saved.value : null };
    },
    onSuccess: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: keys.attempts(userId) });
    },
  });
}

export interface FollowUpInput {
  answerId: string | null;
  prompt: string;
  response: string;
  competency: Competency | null;
}

/**
 * Evaluates a follow-up response (grounded AI or offline) WITHOUT creating a new
 * top-level practice attempt, then best-effort persists a follow-up record.
 */
export function useEvaluateFollowUp() {
  const { evaluation: evaluator, followUps } = usePracticeRepositories();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation<AnswerEvaluation, AppError, FollowUpInput>({
    mutationFn: async (input) => {
      if (!userId) throw noSessionError();
      const result = await evaluator.evaluate(userId, {
        questionText: input.prompt,
        competency: input.competency,
        answer: input.response,
        mode: 'text',
      });
      if (!result.ok) throw result.error;
      const evaluation = result.value;

      const feedback = [...evaluation.recommendations, ...evaluation.missingDetails]
        .slice(0, 3)
        .join(' ');
      await followUps.save(userId, {
        answerId: input.answerId,
        prompt: input.prompt,
        response: input.response,
        overallScore: evaluation.overallScore,
        feedback,
      });

      return evaluation;
    },
  });
}

/** Transcribes recorded audio (first draft; the user then corrects it). */
export function useTranscribe() {
  const { transcription } = usePracticeRepositories();
  const userId = useAuthStore((s) => s.session?.user.id);
  return useMutation<string, AppError, TranscribeInput>({
    mutationFn: async (input) => {
      if (!userId) throw noSessionError();
      const result = await transcription.transcribe(userId, input);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });
}

/** Recent practice attempts (used by the progress dashboard and history). */
export function useRecentAttempts(limit = 20) {
  const { practice } = usePracticeRepositories();
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery<PracticeAttempt[], AppError>({
    queryKey: keys.attempts(userId ?? 'anon'),
    enabled: Boolean(userId),
    queryFn: async () => {
      const result = await practice.listAttempts(userId as string, limit);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });
}

/** Deletes a saved practice attempt (a version). */
export function useDeleteAttempt() {
  const { practice } = usePracticeRepositories();
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation<void, AppError, string>({
    mutationFn: async (id) => {
      if (!userId) throw noSessionError();
      const result = await practice.deleteAttempt(userId, id);
      if (!result.ok) throw result.error;
    },
    onSuccess: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: keys.attempts(userId) });
    },
  });
}
