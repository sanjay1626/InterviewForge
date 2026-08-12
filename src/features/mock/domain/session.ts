import type { Competency } from '@/core/domain/competencies';
import type { AnswerEvaluation, PracticeMode } from '@/features/practice/domain/evaluation';
import type { MockConfig } from './config';
import type { PlannedQuestion, QuestionKind } from './plan';

export type MockStatus = 'in_progress' | 'completed' | 'abandoned';

export interface MockFollowUp {
  prompt: string;
  response: string;
}

/** One answered question during the interview (before scoring). */
export interface MockAnswer {
  questionId: string;
  questionText: string;
  kind: QuestionKind;
  competency: Competency | null;
  transcript: string;
  mode: PracticeMode;
  durationMs: number;
  followUps: MockFollowUp[];
}

/** Per-question section of the final report. */
export interface QuestionReport {
  questionText: string;
  competency: Competency | null;
  transcript: string;
  mode: PracticeMode;
  followUps: MockFollowUp[];
  evaluation: AnswerEvaluation;
}

export interface MockReport {
  overallScore: number; // 0–100
  relevanceToRole: number;
  communicationScore: number;
  competencyScores: { competency: Competency; label: string; score: number }[];
  starCompleteness: number;
  specificityOwnership: number;
  resultsImpact: number;
  conciseness: number;
  speakingPaceWpm: number | null;
  fillerCount: number;
  fillerRate: number;
  strongestIndex: number;
  weakestIndex: number;
  unsupportedClaims: string[];
  recommendedNext: string[];
  questionsToRetry: string[];
  questions: QuestionReport[];
  /** 'ai' if every answer was AI-graded, 'offline' if any used the fallback. */
  source: 'ai' | 'offline';
}

export interface MockSession {
  id: string;
  config: MockConfig;
  status: MockStatus;
  plan: PlannedQuestion[];
  answers: MockAnswer[];
  report: MockReport | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}
