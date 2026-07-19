import type { Competency } from '@/core/domain/competencies';
import type { AnswerEvaluation, PracticeMode } from './evaluation';

/** A completed practice attempt: the answer plus its stored evaluation. */
export interface PracticeAttempt {
  id: string;
  questionId: string | null;
  questionText: string;
  competency: Competency | null;
  answer: string;
  mode: PracticeMode;
  evaluation: AnswerEvaluation;
  createdAt: string;
}

export interface SaveAttemptInput {
  questionId: string | null;
  questionText: string;
  competency: Competency | null;
  answer: string;
  mode: PracticeMode;
  evaluation: AnswerEvaluation;
}
