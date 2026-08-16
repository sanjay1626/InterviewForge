import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { noSessionError, type AppError } from '@/core/domain/errors';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useExperiences } from '@/features/knowledge/hooks/useExperiences';
import { useProjects } from '@/features/knowledge/hooks/useProjects';
import { useProfile } from '@/features/onboarding/hooks/useProfile';
import { assembleNarrative } from '@/features/stories/domain/star-helpers';
import { useStories } from '@/features/stories/hooks/useStories';
import type { CandidateSources } from '../domain/evidence';
import type { PrepInput, PrepPackage } from '../domain/package';
import type { PrepSummary } from '../data/prep-repository';
import { usePrepRepository } from '../PrepProvider';

/**
 * Gathers the user's verified data (experiences, projects, STAR stories, listed
 * skills, certifications) into CandidateSources for grounding + the offline
 * fallback. Reuses the existing knowledge/stories/profile queries — no new
 * fetching layer. Resume raw text and previous answers are added server-side by
 * the Edge Function via RLS-scoped catalog loading.
 */
export function useCandidateSources(): { sources: CandidateSources; isLoading: boolean } {
  const userId = useAuthStore((s) => s.session?.user.id);
  const experiences = useExperiences();
  const projects = useProjects();
  const stories = useStories();
  const profile = useProfile(userId);

  const sources: CandidateSources = {
    experiences: (experiences.data ?? []).map((e) => ({
      id: e.id,
      company: e.company,
      title: e.title,
      description: e.description,
      highlights: e.highlights,
      skills: e.skills,
    })),
    projects: (projects.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      description: p.description,
      highlights: p.highlights,
      skills: p.skills,
    })),
    stories: (stories.data ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      narrative: assembleNarrative({
        situation: s.situation ?? '',
        task: s.task ?? '',
        action: s.action ?? '',
        result: s.result ?? '',
        lesson: s.lesson ?? '',
      }),
      skills: s.skills,
      company: s.company,
    })),
    skills: profile.data?.skills ?? [],
    certifications: profile.data?.certifications ?? [],
  };

  return {
    sources,
    isLoading:
      experiences.isLoading || projects.isLoading || stories.isLoading || profile.isLoading,
  };
}

export interface BuildPrepVariables {
  input: PrepInput;
  answeredCount?: number;
}

/**
 * Builds a prep package. The candidate's own verified data is gathered here and
 * passed into the repository, which prefers the AI path and falls back to the
 * offline analyzer. Never throws for a missing backend — it degrades to offline.
 */
export function useBuildPrep() {
  const repo = usePrepRepository();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { sources } = useCandidateSources();

  return useMutation<PrepPackage, AppError, BuildPrepVariables>({
    mutationFn: async ({ input, answeredCount }) => {
      if (!userId) throw noSessionError();
      const result = await repo.generate(userId, { input, sources, answeredCount });
      if (!result.ok) throw result.error;
      return result.value;
    },
  });
}

const prepKeys = {
  list: (userId: string) => ['prep-list', userId] as const,
  detail: (userId: string, id: string) => ['prep-detail', userId, id] as const,
};

/** Persists a generated package; returns its new id. */
export function useSavePrep() {
  const repo = usePrepRepository();
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation<string, AppError, PrepPackage>({
    mutationFn: async (pkg) => {
      if (!userId) throw noSessionError();
      const result = await repo.save(userId, pkg);
      if (!result.ok) throw result.error;
      return result.value;
    },
    onSuccess: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: prepKeys.list(userId) });
    },
  });
}

/** Lists the user's saved prep packages (most recent first). */
export function usePrepList() {
  const repo = usePrepRepository();
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery<PrepSummary[], AppError>({
    queryKey: prepKeys.list(userId ?? 'anon'),
    enabled: Boolean(userId),
    queryFn: async () => {
      const result = await repo.list(userId as string);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });
}

/** Loads a saved prep package by id (for reopen). */
export function useSavedPrep(id: string | undefined) {
  const repo = usePrepRepository();
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery<PrepPackage | null, AppError>({
    queryKey: prepKeys.detail(userId ?? 'anon', id ?? 'none'),
    enabled: Boolean(userId && id),
    queryFn: async () => {
      const result = await repo.get(userId as string, id as string);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });
}

/** Deletes a saved prep package. */
export function useDeletePrep() {
  const repo = usePrepRepository();
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation<void, AppError, string>({
    mutationFn: async (id) => {
      if (!userId) throw noSessionError();
      const result = await repo.remove(userId, id);
      if (!result.ok) throw result.error;
    },
    onSuccess: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: prepKeys.list(userId) });
    },
  });
}
