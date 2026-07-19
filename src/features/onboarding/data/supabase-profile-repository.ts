import { err, ok, type Result } from '@/core/domain/result';
import type { TypedSupabaseClient } from '@/core/supabase/client';
import type { TablesInsert } from '@/core/supabase/database.types';
import { mapPostgrestError } from '@/core/supabase/errors';
import type {
  OnboardingInput,
  ProfileExtrasInput,
  UserProfile,
} from '../domain/types';
import { mapProfileRow } from './profile-mapper';
import type { ProfileRepository } from './profile-repository';

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

  async updateProfileExtras(
    userId: string,
    input: ProfileExtrasInput,
  ): Promise<Result<UserProfile>> {
    const { data, error } = await this.client
      .from('user_profiles')
      .update({
        skills: input.skills,
        certifications: input.certifications,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (error) return err(mapPostgrestError(error.message, error.code, error));
    return ok(mapProfileRow(data));
  }
}
