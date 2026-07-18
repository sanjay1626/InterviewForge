import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AuthSession } from '../domain/types';

/**
 * Guest sessions are entirely local (no backend). A flag in AsyncStorage lets
 * cold starts restore the guest session. Guest users can explore the app UI and
 * local-only features; anything requiring the backend is clearly gated.
 */
const GUEST_FLAG_KEY = 'interviewforge.guest.active';
const GUEST_USER_ID = 'guest-local-user';

export const guestSession: AuthSession = {
  user: { id: GUEST_USER_ID, email: null, mode: 'guest' },
  accessToken: null,
};

export function isGuestUserId(id: string): boolean {
  return id === GUEST_USER_ID;
}

export async function markGuestActive(): Promise<void> {
  await AsyncStorage.setItem(GUEST_FLAG_KEY, '1');
}

export async function clearGuest(): Promise<void> {
  await AsyncStorage.removeItem(GUEST_FLAG_KEY);
}

export async function isGuestActive(): Promise<boolean> {
  const value = await AsyncStorage.getItem(GUEST_FLAG_KEY);
  return value === '1';
}
