import type { Tables } from '@/core/supabase/database.types';
import {
  isExperienceLevel,
  isInterviewGoal,
  isPracticeMode,
} from '../domain/constants';
import type { UserProfile } from '../domain/types';

/**
 * Maps a raw `user_profiles` row into the validated domain model. Unknown enum
 * values (e.g. from a future schema) are coerced to null rather than trusted,
 * keeping the domain layer's unions honest.
 */
export function mapProfileRow(row: Tables<'user_profiles'>): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    targetRole: row.target_role,
    experienceLevel: isExperienceLevel(row.experience_level)
      ? row.experience_level
      : null,
    industry: row.industry,
    interviewGoals: (row.interview_goals ?? []).filter(isInterviewGoal),
    preferredPracticeMode: isPracticeMode(row.preferred_practice_mode)
      ? row.preferred_practice_mode
      : null,
    onboardingCompleted: row.onboarding_completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
