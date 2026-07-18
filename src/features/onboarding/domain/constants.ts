import type {
  ExperienceLevel,
  InterviewGoal,
  PracticeMode,
} from './types';

/** Presentation metadata for each domain option, kept beside the domain. */
export interface Option<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export const EXPERIENCE_LEVELS: Option<ExperienceLevel>[] = [
  { value: 'student', label: 'Student / Intern' },
  { value: 'entry', label: 'Entry level', description: '0–2 years' },
  { value: 'mid', label: 'Mid level', description: '2–5 years' },
  { value: 'senior', label: 'Senior', description: '5–10 years' },
  { value: 'lead', label: 'Lead / Staff', description: '10+ years' },
  { value: 'executive', label: 'Manager / Executive' },
];

export const PRACTICE_MODES: Option<PracticeMode>[] = [
  { value: 'text', label: 'Text answers', description: 'Type your responses' },
  { value: 'voice', label: 'Voice answers', description: 'Speak and transcribe' },
  { value: 'guided', label: 'Guided STAR', description: 'Step-by-step prompts' },
  { value: 'mock', label: 'Mock interview', description: 'Question by question' },
];

export const INTERVIEW_GOALS: Option<InterviewGoal>[] = [
  { value: 'new-job', label: 'Land a new job' },
  { value: 'first-job', label: 'Get my first job' },
  { value: 'promotion', label: 'Earn a promotion' },
  { value: 'career-switch', label: 'Switch careers' },
  { value: 'faang', label: 'Big-tech interviews' },
  { value: 'confidence', label: 'Build confidence' },
];

/** A short, non-exhaustive list of industries to pick from or type over. */
export const COMMON_INDUSTRIES: string[] = [
  'Software / Tech',
  'Finance',
  'Healthcare',
  'Retail / E-commerce',
  'Education',
  'Manufacturing',
  'Consulting',
  'Government / Non-profit',
];

const EXPERIENCE_VALUES = new Set(EXPERIENCE_LEVELS.map((o) => o.value));
const PRACTICE_VALUES = new Set(PRACTICE_MODES.map((o) => o.value));
const GOAL_VALUES = new Set(INTERVIEW_GOALS.map((o) => o.value));

export function isExperienceLevel(value: unknown): value is ExperienceLevel {
  return typeof value === 'string' && EXPERIENCE_VALUES.has(value as ExperienceLevel);
}
export function isPracticeMode(value: unknown): value is PracticeMode {
  return typeof value === 'string' && PRACTICE_VALUES.has(value as PracticeMode);
}
export function isInterviewGoal(value: unknown): value is InterviewGoal {
  return typeof value === 'string' && GOAL_VALUES.has(value as InterviewGoal);
}
