import { makeError } from '@/core/domain/errors';
import { err, ok, type Result } from '@/core/domain/result';
import type { TypedSupabaseClient } from '@/core/supabase/client';
import type { TablesInsert } from '@/core/supabase/database.types';
import type { OnboardingInput, UserProfile } from '../domain/types';
import { mapProfileRow } from './profile-mapper';
import type { ProfileRepository } from './profile-repository';

function mapPostgrestError(message: string, code?: string, cause?: unknown) {
  if (code === 'PGRST116') {
    return makeError('not-found', 'Profile not found.', { cause });
  }
  const lower = message.toLowerCase();
  if (lower.includes('network') || lower.includes('fetch')) {
    return makeError('network', 'Network error. Please retry.', {
      retryable: true,
      cause,
    });
  }
  if (lower.includes('row-level security') || lower.includes('permission')) {
    return makeError('permission', 'You do not have access to this profile.', {
      cause,
    });
  }
  return makeError('unknown', message || 'Database error.', { cause });
}

/**
 * Supabase-backed profile store. Uses upsert so onboarding is idempotent and
 * safe to re-run. RLS ensures a user can only read/write their own row; the
 * `id` is set to the authenticated user's id.
 */
export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly client: TypedSupabaseClient) {}

  async getProfile(userId: string): Promise<Result<UserProfile | null>> {
    const { data, error } = await this.client
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) return err(mapPostgrestError(error.message, error.code, error));
    return ok(data ? mapProfileRow(data) : null);
  }

  async completeOnboarding(
    userId: string,
    input: OnboardingInput,
  ): Promise<Result<UserProfile>> {
    const payload: TablesInsert<'user_profiles'> = {
      id: userId,
      display_name: input.displayName || null,
      target_role: input.targetRole,
      experience_level: input.experienceLevel,
      industry: input.industry,
      interview_goals: input.interviewGoals,
      preferred_practice_mode: input.preferredPracticeMode,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.client
      .from('user_profiles')
      .upsert(payload)
      .select('*')
      .single();

    if (error) return err(mapPostgrestError(error.message, error.code, error));
    return ok(mapProfileRow(data));
  }
}
