import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { noSessionError, type AppError } from '@/core/domain/errors';
import { useAuthStore } from '@/features/auth/store/auth-store';
import type { StarStory, StarStoryInput } from '../domain/types';
import { useStoryRepository } from '../StoriesProvider';

const keys = {
  list: (userId: string) => ['stories', userId] as const,
};

export function useStories() {
  const repo = useStoryRepository();
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery<StarStory[], AppError>({
    queryKey: keys.list(userId ?? 'anon'),
    enabled: Boolean(userId),
    queryFn: async () => {
      const result = await repo.list(userId as string);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });
}

export function useSaveStory() {
  const repo = useStoryRepository();
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation<StarStory, AppError, { id?: string; input: StarStoryInput }>({
    mutationFn: async ({ id, input }) => {
      if (!userId) throw noSessionError();
      const result = id
        ? await repo.update(userId, id, input)
        : await repo.create(userId, input);
      if (!result.ok) throw result.error;
      return result.value;
    },
    onSuccess: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: keys.list(userId) });
    },
  });
}

export function useDeleteStory() {
  const repo = useStoryRepository();
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation<void, AppError, string>({
    mutationFn: async (id) => {
      if (!userId) throw noSessionError();
      const result = await repo.remove(userId, id);
      if (!result.ok) throw result.error;
    },
    onSuccess: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: keys.list(userId) });
    },
  });
}
