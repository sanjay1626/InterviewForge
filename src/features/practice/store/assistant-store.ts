import { create } from 'zustand';

/**
 * Carries a Blank Page Assistant draft to the answer editor. The editor seeds
 * its field from this once, then clears it — the existing editor/evaluation
 * flow is otherwise untouched.
 */
interface AssistantState {
  pendingDraft: string | null;
  setPendingDraft: (draft: string) => void;
  takePendingDraft: () => string | null;
}

export const useAssistantStore = create<AssistantState>((set, get) => ({
  pendingDraft: null,
  setPendingDraft: (draft) => set({ pendingDraft: draft }),
  takePendingDraft: () => {
    const draft = get().pendingDraft;
    if (draft !== null) set({ pendingDraft: null });
    return draft;
  },
}));
