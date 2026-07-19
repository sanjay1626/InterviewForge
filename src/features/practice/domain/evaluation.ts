import type { Competency } from '@/core/domain/competencies';

/**
 * Answer evaluation domain model (Phase 4). Framework-independent.
 * `source` distinguishes a grounded AI evaluation from the local offline
 * estimate used when no backend/LLM is available (guest mode, no API key).
 */

export type PracticeMode = 'text' | 'voice' | 'guided' | 'mock';

/** The ten rubric categories, each scored 0–10. */
export interface RubricScores {
  relevance: number;
  situation: number;
  task: number;
  actions: number;
  ownership: number;
  result: number;
  impact: number;
  reflection: number;
  conciseness: number;
  clarity: number;
}

export const RUBRIC_LABELS: Record<keyof RubricScores, string> = {
  relevance: 'Relevance to the question',
  situation: 'Situation clarity',
  task: 'Task clarity',
  actions: 'Specificity of actions',
  ownership: 'Personal ownership',
  result: 'Result strength',
  impact: 'Measurable impact',
  reflection: 'Learning / reflection',
  conciseness: 'Conciseness',
  clarity: 'Overall clarity',
};

export const RUBRIC_KEYS = Object.keys(RUBRIC_LABELS) as (keyof RubricScores)[];

export type EvaluationSource = 'ai' | 'offline';

export interface AnswerEvaluation {
  scores: RubricScores;
  overallScore: number; // 0–100
  strengths: string[];
  missingDetails: string[];
  unsupportedClaims: string[];
  suggestedFollowUps: string[];
  recommendations: string[];
  /** Fact-preserving improved answer; missing facts are marked with [brackets]. */
  improvedAnswer: string;
  factsUsed: string[];
  missingInfo: string[];
  changeExplanation: string;
  source: EvaluationSource;
}

/** What the evaluator receives. Grounding is retrieved server-side for AI. */
export interface EvaluationRequest {
  questionText: string;
  competency: Competency | null;
  answer: string;
  mode: PracticeMode;
}

export const IDEAL_MIN_WORDS = 130; // ~60s spoken
export const IDEAL_MAX_WORDS = 260; // ~120s spoken

/** Hard cap on a single answer/transcript (cost + abuse protection). */
export const MAX_ANSWER_CHARS = 5000;
/** Cap on a follow-up response. */
export const MAX_FOLLOWUP_CHARS = 1500;
