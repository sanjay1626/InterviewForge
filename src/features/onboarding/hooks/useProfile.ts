import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AppError } from '@/core/domain/errors';
import type { OnboardingInput, UserProfile } from '../domain/types';
import { useProfileRepository } from '../ProfileProvider';

export const profileKeys = {
  detail: (userId: string) => ['profile', userId] as const,
};

/** Loads the current user's profile. `null` means onboarding not completed. */
export function useProfile(userId: string | undefined) {
  const repo = useProfileRepository();
  return useQuery<UserProfile | null, AppError>({
    queryKey: profileKeys.detail(userId ?? 'anonymous'),
    enabled: Boolean(userId),
    queryFn: async () => {
      const result = await repo.getProfile(userId as string);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });
}

/** Persists onboarding answers and primes the profile cache on success. */
export function useCompleteOnboarding(userId: string | undefined) {
  const repo = useProfileRepository();
  const queryClient = useQueryClient();
  return useMutation<UserProfile, AppError, OnboardingInput>({
    mutationFn: async (input) => {
      if (!userId) {
        throw { code: 'unknown', message: 'No active session.', retryable: false };
      }
      const result = await repo.completeOnboarding(userId, input);
      if (!result.ok) throw result.error;
      return result.value;
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.detail(profile.id), profile);
    },
  });
}
