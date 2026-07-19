import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import type { AppError } from '@/core/domain/errors';
import { useAuthStore } from '@/features/auth/store/auth-store';
import type { DocumentRecord, ResumeUpload } from '../domain/types';
import { useKnowledgeRepositories } from '../KnowledgeProvider';

const keys = {
  list: (userId: string) => ['documents', userId] as const,
};

export function useDocuments() {
  const { documents } = useKnowledgeRepositories();
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery<DocumentRecord[], AppError>({
    queryKey: keys.list(userId ?? 'anon'),
    enabled: Boolean(userId),
    queryFn: async () => {
      const result = await documents.list(userId as string);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });
}

export function useUploadResume() {
  const { documents } = useKnowledgeRepositories();
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation<DocumentRecord, AppError, ResumeUpload>({
    mutationFn: async (upload) => {
      if (!userId) throw notSignedIn();
      const result = await documents.uploadResume(userId, upload);
      if (!result.ok) throw result.error;
      return result.value;
    },
    onSuccess: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: keys.list(userId) });
    },
  });
}

export function useReingestDocument() {
  const { documents } = useKnowledgeRepositories();
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation<DocumentRecord, AppError, string>({
    mutationFn: async (id) => {
      if (!userId) throw notSignedIn();
      const result = await documents.reingest(userId, id);
      if (!result.ok) throw result.error;
      return result.value;
    },
    onSuccess: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: keys.list(userId) });
    },
  });
}

export function useDeleteDocument() {
  const { documents } = useKnowledgeRepositories();
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation<void, AppError, string>({
    mutationFn: async (id) => {
      if (!userId) throw notSignedIn();
      const result = await documents.remove(userId, id);
      if (!result.ok) throw result.error;
    },
    onSuccess: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: keys.list(userId) });
    },
  });
}

function notSignedIn(): AppError {
  return { code: 'unknown', message: 'No active session.', retryable: false };
}
