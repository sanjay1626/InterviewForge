import { useMutation, useQueryClient } from '@tanstack/react-query';

import { noSessionError, type AppError } from '@/core/domain/errors';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useProfile, useUpdateProfileExtras } from '@/features/onboarding/hooks/useProfile';
import type {
  ExtractedProfile,
  ProjectInput,
  WorkExperienceInput,
} from '../domain/types';
import { useKnowledgeRepositories } from '../KnowledgeProvider';

/** Runs extraction on an ingested resume. Returns candidates only — nothing saved. */
export function useExtractProfile() {
  const { extraction } = useKnowledgeRepositories();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation<ExtractedProfile, AppError, string>({
    mutationFn: async (documentId) => {
      if (!userId) throw noSessionError();
      const result = await extraction.extractFromDocument(userId, documentId);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });
}

export interface ApproveExtractionInput {
  experiences: WorkExperienceInput[];
  projects: ProjectInput[];
  skills: string[];
  certifications: string[];
}

/**
 * Persists the items the user approved, using the existing repositories so
 * guest/cloud routing and validation stay identical to manual entry.
 * Skills/certifications are merged with what's already on the profile.
 */
export function useApproveExtraction() {
  const { experiences: expRepo, projects: projRepo } = useKnowledgeRepositories();
  const userId = useAuthStore((s) => s.session?.user.id);
  const profile = useProfile(userId);
  const updateExtras = useUpdateProfileExtras(userId);
  const queryClient = useQueryClient();

  return useMutation<{ saved: number }, AppError, ApproveExtractionInput>({
    mutationFn: async (input) => {
      if (!userId) throw noSessionError();
      let saved = 0;

      for (const experience of input.experiences) {
        const result = await expRepo.create(userId, experience);
        if (!result.ok) throw result.error;
        saved += 1;
      }
      for (const project of input.projects) {
        const result = await projRepo.create(userId, project);
        if (!result.ok) throw result.error;
        saved += 1;
      }

      if (input.skills.length > 0 || input.certifications.length > 0) {
        const merge = (existing: string[], incoming: string[]) => {
          const seen = new Set(existing.map((s) => s.toLowerCase()));
          return [
            ...existing,
            ...incoming.filter((s) => !seen.has(s.toLowerCase())),
          ];
        };
        await updateExtras.mutateAsync({
          skills: merge(profile.data?.skills ?? [], input.skills),
          certifications: merge(
            profile.data?.certifications ?? [],
            input.certifications,
          ),
        });
        saved += input.skills.length + input.certifications.length;
      }

      return { saved };
    },
    onSuccess: () => {
      if (!userId) return;
      void queryClient.invalidateQueries({ queryKey: ['experiences', userId] });
      void queryClient.invalidateQueries({ queryKey: ['projects', userId] });
    },
  });
}
