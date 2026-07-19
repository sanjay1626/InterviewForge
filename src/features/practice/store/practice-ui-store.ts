import { create } from 'zustand';

import type { Competency } from '@/core/domain/competencies';
import type { AnswerEvaluation } from '../domain/evaluation';

/** The most recent evaluation, shared between the practice → results → improved screens. */
export interface LastPractice {
  attemptId: string | null;
  questionText: string;
  competency: Competency | null;
  answer: string;
  evaluation: AnswerEvaluation;
}

interface PracticeUiState {
  last: LastPractice | null;
  setLast: (value: LastPractice) => void;
  clear: () => void;
}

export const usePracticeUiStore = create<PracticeUiState>((set) => ({
  last: null,
  setLast: (value) => set({ last: value }),
  clear: () => set({ last: null }),
}));
