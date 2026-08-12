import { useMutation, useQuery } from '@tanstack/react-query';

import type { Competency } from '@/core/domain/competencies';
import type { AppError } from '@/core/domain/errors';
import { noSessionError } from '@/core/domain/errors';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useExperiences } from '@/features/knowledge/hooks/useExperiences';
import { useProjects } from '@/features/knowledge/hooks/useProjects';
import { useProfile } from '@/features/onboarding/hooks/useProfile';
import { useStories } from '@/features/stories/hooks/useStories';
import {
  assembleLocalDraft,
  buildLocalRecall,
  type AssistantDraftInput,
  type DraftResult,
  type RecallResult,
} from '../domain/assistant';
import { usePracticeRepositories } from '../PracticeProvider';

/**
 * Memory Recall: AI-ranked when the backend is available, otherwise built
 * locally from the user's own experiences/projects/stories. Always resolves to
 * something usable.
 */
export function useMemoryRecall(questionText: string, competency: Competency | null) {
  const { assistant } = usePracticeRepositories();
  const userId = useAuthStore((s) => s.session?.user.id);
  const experiences = useExperiences();
  const projects = useProjects();
  const stories = useStories();
  const profile = useProfile(userId);

  const clientReady =
    !experiences.isLoading && !projects.isLoading && !stories.isLoading;

  return useQuery<RecallResult, AppError>({
    queryKey: ['assistant-recall', userId ?? 'anon', questionText],
    enabled: Boolean(userId) && clientReady,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const local = (): RecallResult =>
        buildLocalRecall(
          {
            experiences: experiences.data ?? [],
            projects: projects.data ?? [],
            stories: stories.data ?? [],
            profileSkills: profile.data?.skills ?? [],
          },
          questionText,
        );

      if (!userId) return local();
      const result = await assistant.recall(userId, { questionText, competency });
      if (result.ok && result.value.memories.length > 0) return result.value;
      // AI unavailable or found nothing → fall back to the user's own records.
      return local();
    },
  });
}

/**
 * Assistant draft: AI-assembled from selected memories + reflection when
 * available, otherwise a deterministic local assembly from the reflection.
 * Never throws — always returns a draft.
 */
export function useAssistantDraft() {
  const { assistant } = usePracticeRepositories();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation<DraftResult, AppError, AssistantDraftInput>({
    mutationFn: async (input) => {
      if (!userId) throw noSessionError();
      const result = await assistant.draft(userId, input);
      if (result.ok) return result.value;
      return assembleLocalDraft(input.reflection);
    },
  });
}
