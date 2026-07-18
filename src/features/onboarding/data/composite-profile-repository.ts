import type { Result } from '@/core/domain/result';
import type { TypedSupabaseClient } from '@/core/supabase/client';
import { isGuestUserId } from '@/features/auth/data/guest-session';
import type { OnboardingInput, UserProfile } from '../domain/types';
import { GuestProfileRepository } from './guest-profile-repository';
import type { ProfileRepository } from './profile-repository';
import { SupabaseProfileRepository } from './supabase-profile-repository';

/**
 * Routes profile reads/writes to the local guest store or Supabase based on the
 * user id. Keeps callers agnostic to whether the session is guest or cloud.
 */
export class CompositeProfileRepository implements ProfileRepository {
  private readonly guest = new GuestProfileRepository();
  private readonly cloud: SupabaseProfileRepository | null;

  constructor(client: TypedSupabaseClient | null) {
    this.cloud = client ? new SupabaseProfileRepository(client) : null;
  }

  private pick(userId: string): ProfileRepository {
    if (isGuestUserId(userId) || !this.cloud) return this.guest;
    return this.cloud;
  }

  getProfile(userId: string): Promise<Result<UserProfile | null>> {
    return this.pick(userId).getProfile(userId);
  }

  completeOnboarding(
    userId: string,
    input: OnboardingInput,
  ): Promise<Result<UserProfile>> {
    return this.pick(userId).completeOnboarding(userId, input);
  }
}
