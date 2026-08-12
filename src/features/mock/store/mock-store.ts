import { create } from 'zustand';

import type { MockSession } from '../domain/session';

/**
 * Holds the in-flight / just-finished mock session so the setup → room → report
 * screens can share it without re-fetching. Past sessions load from the
 * repository by id instead.
 */
interface MockState {
  session: MockSession | null;
  setSession: (session: MockSession) => void;
  clear: () => void;
}

export const useMockStore = create<MockState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  clear: () => set({ session: null }),
}));
