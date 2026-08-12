/**
 * Mock interview configuration + presets. Framework-independent.
 */

export type MockInterviewType = 'behavioral' | 'resume' | 'mixed';
export type MockLength = 'quick' | 'standard' | 'full';
export type MockDifficulty = 'supportive' | 'realistic' | 'challenging';
export type MockResponseMode = 'voice' | 'text';

export interface MockConfig {
  targetRole: string;
  company: string;
  jobDescription: string;
  type: MockInterviewType;
  length: MockLength;
  difficulty: MockDifficulty;
  responseMode: MockResponseMode;
}

export const LENGTH_META: Record<
  MockLength,
  { label: string; questionCount: number; approxMinutes: string }
> = {
  quick: { label: 'Quick', questionCount: 3, approxMinutes: '~5 min' },
  standard: { label: 'Standard', questionCount: 5, approxMinutes: '~10 min' },
  full: { label: 'Full', questionCount: 8, approxMinutes: '~15–20 min' },
};

export const TYPE_META: Record<MockInterviewType, { label: string; description: string }> = {
  behavioral: { label: 'Behavioral', description: 'Competency & STAR questions' },
  resume: { label: 'Resume deep-dive', description: 'Your experience & projects' },
  mixed: { label: 'Mixed', description: 'A balanced blend' },
};

export const DIFFICULTY_META: Record<
  MockDifficulty,
  { label: string; description: string; maxFollowUpsPerQuestion: number }
> = {
  supportive: { label: 'Supportive', description: 'Gentle, few follow-ups', maxFollowUpsPerQuestion: 1 },
  realistic: { label: 'Realistic', description: 'A real interview feel', maxFollowUpsPerQuestion: 1 },
  challenging: { label: 'Challenging', description: 'Probing follow-ups', maxFollowUpsPerQuestion: 2 },
};

export function questionCountFor(length: MockLength): number {
  return LENGTH_META[length].questionCount;
}

/** Rough estimate: ~2.25 min per planned question (question + answer + a follow-up). */
export function estimatedMinutes(length: MockLength): number {
  return Math.round(questionCountFor(length) * 2.25);
}

export function defaultMockConfig(targetRole = ''): MockConfig {
  return {
    targetRole,
    company: '',
    jobDescription: '',
    type: 'mixed',
    length: 'standard',
    difficulty: 'realistic',
    responseMode: 'voice',
  };
}
