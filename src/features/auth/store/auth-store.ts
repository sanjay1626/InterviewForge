import { create } from 'zustand';

import type { AuthSession } from '../domain/types';

/**
 * Lightweight local UI state for the current auth session. Kept in Zustand
 * (not React Query) because it is client-owned state that many screens read
 * synchronously to decide routing.
 */
export type AuthStatus = 'loading' | 'authenticated' | 'signedOut';

interface AuthState {
  status: AuthStatus;
  session: AuthSession | null;
  setSession: (session: AuthSession | null) => void;
  setLoading: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  session: null,
  setSession: (session) =>
    set({ session, status: session ? 'authenticated' : 'signedOut' }),
  setLoading: () => set({ status: 'loading' }),
}));

export const selectIsGuest = (state: AuthState): boolean =>
  state.session?.user.mode === 'guest';
