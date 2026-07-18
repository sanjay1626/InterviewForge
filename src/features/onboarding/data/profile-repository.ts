import type { Result } from '@/core/domain/result';
import type { OnboardingInput, UserProfile } from '../domain/types';

/**
 * Repository contract for the user profile. Concrete implementations back it
 * with Supabase (cloud accounts) or AsyncStorage (guest mode).
 */
export interface ProfileRepository {
  getProfile(userId: string): Promise<Result<UserProfile | null>>;
  completeOnboarding(
    userId: string,
    input: OnboardingInput,
  ): Promise<Result<UserProfile>>;
}
