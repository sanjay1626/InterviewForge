import AsyncStorage from '@react-native-async-storage/async-storage';

import type { TypedSupabaseClient } from '@/core/supabase/client';
import type { Tables } from '@/core/supabase/database.types';
import { CompositeProfileRepository } from '../data/composite-profile-repository';
import { mapProfileRow } from '../data/profile-mapper';
import type { OnboardingInput } from '../domain/types';

const input: OnboardingInput = {
  displayName: 'Alex',
  targetRole: 'Product Manager',
  experienceLevel: 'mid',
  industry: 'Software / Tech',
  interviewGoals: ['new-job', 'confidence'],
  preferredPracticeMode: 'guided',
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('mapProfileRow', () => {
  it('coerces unknown enum values to null and filters bad goals', () => {
    const row: Tables<'user_profiles'> = {
      id: 'u1',
      display_name: 'Sam',
      target_role: 'SWE',
      experience_level: 'not-a-level',
      industry: 'Tech',
      interview_goals: ['new-job', 'garbage'],
      preferred_practice_mode: 'text',
      onboarding_completed: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    const profile = mapProfileRow(row);
    expect(profile.experienceLevel).toBeNull();
    expect(profile.preferredPracticeMode).toBe('text');
    expect(profile.interviewGoals).toEqual(['new-job']);
  });
});

describe('CompositeProfileRepository — guest routing', () => {
  it('stores and reads a guest profile locally', async () => {
    const repo = new CompositeProfileRepository(null);
    const guestId = 'guest-local-user';

    const before = await repo.getProfile(guestId);
    expect(before.ok && before.value).toBeNull();

    const saved = await repo.completeOnboarding(guestId, input);
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.value.onboardingCompleted).toBe(true);
    expect(saved.value.targetRole).toBe('Product Manager');

    const after = await repo.getProfile(guestId);
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(after.value?.interviewGoals).toEqual(['new-job', 'confidence']);
  });
});

describe('CompositeProfileRepository — Supabase routing', () => {
  it('upserts through the cloud repo for a non-guest id', async () => {
    let upserted: Record<string, unknown> | null = null;
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        }),
        upsert: (payload: Record<string, unknown>) => {
          upserted = payload;
          return {
            select: () => ({
              single: async () => ({
                data: {
                  id: 'cloud-user',
                  display_name: 'Alex',
                  target_role: 'Product Manager',
                  experience_level: 'mid',
                  industry: 'Software / Tech',
                  interview_goals: ['new-job', 'confidence'],
                  preferred_practice_mode: 'guided',
                  onboarding_completed: true,
                  created_at: '2026-01-01T00:00:00Z',
                  updated_at: '2026-01-01T00:00:00Z',
                },
                error: null,
              }),
            }),
          };
        },
      }),
    } as unknown as TypedSupabaseClient;

    const repo = new CompositeProfileRepository(fakeClient);
    const result = await repo.completeOnboarding('cloud-user', input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe('cloud-user');
    const captured = upserted as Record<string, unknown> | null;
    expect(captured).not.toBeNull();
    expect(captured?.onboarding_completed).toBe(true);
  });
});
