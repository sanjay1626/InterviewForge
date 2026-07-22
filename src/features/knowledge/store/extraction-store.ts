import { create } from 'zustand';

import type { ExtractedProfile } from '../domain/types';

/**
 * Holds the freshly-extracted resume candidates so the review screen can render
 * them immediately after upload, without re-running (and re-paying for) the
 * extraction call.
 */
interface ExtractionState {
  documentId: string | null;
  result: ExtractedProfile | null;
  set: (documentId: string, result: ExtractedProfile) => void;
  clear: () => void;
}

export const useExtractionStore = create<ExtractionState>((set) => ({
  documentId: null,
  result: null,
  set: (documentId, result) => set({ documentId, result }),
  clear: () => set({ documentId: null, result: null }),
}));
