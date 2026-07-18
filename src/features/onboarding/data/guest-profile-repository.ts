import AsyncStorage from '@react-native-async-storage/async-storage';

import { makeError } from '@/core/domain/errors';
import { err, ok, type Result } from '@/core/domain/result';
import type { OnboardingInput, UserProfile } from '../domain/types';
import type { ProfileRepository } from './profile-repository';

const GUEST_PROFILE_KEY = 'interviewforge.guest.profile';

/** Local-only profile store for guest mode (no backend). */
export class GuestProfileRepository implements ProfileRepository {
  async getProfile(userId: string): Promise<Result<UserProfile | null>> {
    try {
      const raw = await AsyncStorage.getItem(GUEST_PROFILE_KEY);
      if (!raw) return ok(null);
      const parsed = JSON.parse(raw) as UserProfile;
      // Guard against a stale profile from a previous guest id.
      if (parsed.id !== userId) return ok(null);
      return ok(parsed);
    } catch (cause) {
      return err(makeError('unknown', 'Could not read local profile.', { cause }));
    }
  }

  async completeOnboarding(
    userId: string,
    input: OnboardingInput,
  ): Promise<Result<UserProfile>> {
    const now = new Date().toISOString();
    const profile: UserProfile = {
      id: userId,
      displayName: input.displayName || null,
      targetRole: input.targetRole,
      experienceLevel: input.experienceLevel,
      industry: input.industry,
      interviewGoals: input.interviewGoals,
      preferredPracticeMode: input.preferredPracticeMode,
      onboardingCompleted: true,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await AsyncStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(profile));
      return ok(profile);
    } catch (cause) {
      return err(makeError('unknown', 'Could not save local profile.', { cause }));
    }
  }
}
