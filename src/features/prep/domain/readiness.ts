import type { CandidateProfile } from './evidence';
import type { MatchSummary } from './matching';
import type { PrepQuestion } from './questions';

/**
 * Category readiness — never a single arbitrary number. Each score is computed
 * from concrete signals and ships with an explanation and improvement actions
 * (spec section 7).
 */

export type ReadinessCategory = 'behavioral' | 'technical' | 'resume' | 'job_coverage';

export interface ReadinessScore {
  category: ReadinessCategory;
  label: string;
  score: number; // 0–100
  explanation: string;
  actions: string[];
}

export interface ReadinessInput {
  summary: MatchSummary;
  profile: CandidateProfile;
  questions: PrepQuestion[];
  /** How many prep questions the user has actually practiced/answered. */
  answeredCount: number;
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function computeReadiness(input: ReadinessInput): ReadinessScore[] {
  const { summary, profile, questions, answeredCount } = input;
  const scores: ReadinessScore[] = [];

  // Job coverage — straight from the weighted match summary.
  scores.push({
    category: 'job_coverage',
    label: 'Job-requirement coverage',
    score: summary.coverageScore,
    explanation: `Weighted across ${summary.strong.length + summary.partial.length + summary.gaps.length} requirements: ${summary.strong.length} strong, ${summary.partial.length} partial, ${summary.gaps.length} gaps. Strong counts fully, partial counts half.`,
    actions:
      summary.gaps.length > 0
        ? [`Prepare honest answers for ${summary.gaps.length} gap${summary.gaps.length === 1 ? '' : 's'} — how you'd ramp up.`]
        : ['Coverage is solid — focus on delivery.'],
  });

  // Resume — do we have real evidence to draw on?
  const evidenceCount = profile.evidence.length;
  const resumeScore = clampPct(Math.min(evidenceCount, 6) * 15 + (profile.skills.length ? 10 : 0));
  scores.push({
    category: 'resume',
    label: 'Resume readiness',
    score: resumeScore,
    explanation: `Based on ${evidenceCount} verified experience/project item${evidenceCount === 1 ? '' : 's'} and ${profile.skills.length} listed skills.`,
    actions:
      evidenceCount < 3
        ? ['Add more work experiences or projects so answers can be grounded in real detail.']
        : ['Good evidence base — turn the strongest items into STAR stories.'],
  });

  // Technical — coverage of technology/skill requirements specifically.
  const techQ = questions.filter((q) => q.category === 'technical');
  const techAnswerable = techQ.length;
  const techScore = clampPct(summary.coverageScore * 0.7 + (techAnswerable ? 30 - Math.min(techAnswerable, 6) * 3 : 30));
  scores.push({
    category: 'technical',
    label: 'Technical readiness',
    score: techScore,
    explanation: `Reflects how much of the role's technical stack maps to your verified skills, across ${techAnswerable} technical topic${techAnswerable === 1 ? '' : 's'}.`,
    actions:
      techScore < 60
        ? ['Review the Quick Study Guide topics before the interview.']
        : ['Technical alignment looks good — rehearse concrete examples.'],
  });

  // Behavioral — practice progress against the behavioral question set.
  const behavioralQ = questions.filter((q) => q.category === 'behavioral').length || 1;
  const behavioralScore = clampPct((answeredCount / Math.max(behavioralQ, 3)) * 100);
  scores.push({
    category: 'behavioral',
    label: 'Behavioral readiness',
    score: behavioralScore,
    explanation: `You have practiced ${answeredCount} answer${answeredCount === 1 ? '' : 's'} so far. Grows as you complete practice and mock interviews.`,
    actions:
      behavioralScore < 60
        ? ['Practice the high-priority behavioral questions, or run a mock interview.']
        : ['Strong practice momentum — keep rehearsing out loud.'],
  });

  return scores;
}
