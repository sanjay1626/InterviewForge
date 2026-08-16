import { create } from 'zustand';

import type { PrepPackage } from '../domain/package';

/**
 * Holds the just-generated prep package so the setup → dashboard screens can
 * share it without regenerating. Saved packages (Phase 5) load from the
 * repository by id instead.
 */
interface PrepState {
  pkg: PrepPackage | null;
  /** DB id once the package has been persisted (Phase 5). */
  savedId: string | null;
  setPackage: (pkg: PrepPackage) => void;
  setSavedId: (id: string) => void;
  clear: () => void;
}

export const usePrepStore = create<PrepState>((set) => ({
  pkg: null,
  savedId: null,
  setPackage: (pkg) => set({ pkg, savedId: null }),
  setSavedId: (id) => set({ savedId: id }),
  clear: () => set({ pkg: null, savedId: null }),
}));
