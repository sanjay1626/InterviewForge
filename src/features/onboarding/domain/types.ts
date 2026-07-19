/**
 * Onboarding / user profile domain model. Framework-independent. These string
 * unions are the source of truth; the option lists in `constants.ts` are
 * derived from them so UI and validation cannot drift.
 */

export type ExperienceLevel =
  | 'student'
  | 'entry'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'executive';

export type PracticeMode = 'text' | 'voice' | 'guided' | 'mock';

export type InterviewGoal =
  | 'new-job'
  | 'promotion'
  | 'career-switch'
  | 'confidence'
  | 'first-job'
  | 'faang';

export interface UserProfile {
  id: string;
  displayName: string | null;
  targetRole: string | null;
  experienceLevel: ExperienceLevel | null;
  industry: string | null;
  interviewGoals: InterviewGoal[];
  preferredPracticeMode: PracticeMode | null;
  onboardingCompleted: boolean;
  skills: string[];
  certifications: string[];
  createdAt: string;
  updatedAt: string;
}

/** Profile-level knowledge captured outside onboarding (Phase 2). */
export interface ProfileExtrasInput {
  skills: string[];
  certifications: string[];
}

/** Fields the user sets during onboarding. */
export interface OnboardingInput {
  displayName: string;
  targetRole: string;
  experienceLevel: ExperienceLevel;
  industry: string;
  interviewGoals: InterviewGoal[];
  preferredPracticeMode: PracticeMode;
}
