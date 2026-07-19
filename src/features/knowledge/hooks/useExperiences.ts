import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { noSessionError, type AppError } from '@/core/domain/errors';
import { useAuthStore } from '@/features/auth/store/auth-store';
import type { WorkExperience, WorkExperienceInput } from '../domain/types';
import { useKnowledgeRepositories } from '../KnowledgeProvider';

const keys = {
  list: (userId: string) => ['experiences', userId] as const,
};

export function useExperiences() {
  const { experiences } = useKnowledgeRepositories();
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery<WorkExperience[], AppError>({
    queryKey: keys.list(userId ?? 'anon'),
    enabled: Boolean(userId),
    queryFn: async () => {
      const result = await experiences.list(userId as string);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });
}

export function useSaveExperience() {
  const { experiences } = useKnowledgeRepositories();
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation<
    WorkExperience,
    AppError,
    { id?: string; input: WorkExperienceInput }
  >({
    mutationFn: async ({ id, input }) => {
      if (!userId) throw noSessionError();
      const result = id
        ? await experiences.update(userId, id, input)
        : await experiences.create(userId, input);
      if (!result.ok) throw result.error;
      return result.value;
    },
    onSuccess: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: keys.list(userId) });
    },
  });
}

export function useDeleteExperience() {
  const { experiences } = useKnowledgeRepositories();
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation<void, AppError, string>({
    mutationFn: async (id) => {
      if (!userId) throw noSessionError();
      const result = await experiences.remove(userId, id);
      if (!result.ok) throw result.error;
    },
    onSuccess: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: keys.list(userId) });
    },
  });
}
