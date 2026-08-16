import type { Competency } from '@/core/domain/competencies';
import {
  buildCandidateProfile,
  type CandidateEvidence,
  type CandidateProfile,
  type CandidateSources,
} from './evidence';
import { analyzeJobDescription, type JobAnalysis } from './job-analysis';
import {
  matchRequirements,
  summarizeMatches,
  type MatchSummary,
  type RequirementMatch,
} from './matching';
import { generatePrepQuestions, type PrepQuestion } from './questions';
import { computeReadiness, type ReadinessScore } from './readiness';
import { generateStudyTopics, type StudyTopic } from './study-topics';

/**
 * The Interview Prep Package — the full, grounded output of Fast Prep. Assembled
 * deterministically here (offline fallback + test oracle); the AI path returns
 * the same shape. `source` records which produced it.
 */

export interface PrepInput {
  jobTitle: string;
  company: string;
  jobDescription: string;
  interviewDate?: string | null;
}

/** A story the resume suggests could exist, with the gaps that block it. */
export interface SuggestedStory {
  title: string;
  competencies: Competency[];
  /** Which verified evidence this would be built from. */
  evidenceSource: string;
  missingInfo: string[];
  /** One short conversational question to fill the gap. */
  prompt: string;
}

/** A concise retrieval ask when evidence is insufficient (never a fabrication). */
export interface NeedsInput {
  requirementId: string | null;
  question: string;
  /** Grounded lead-in, e.g. "I found your Playwright experience at Runestone…". */
  evidenceHint: string;
}

/**
 * An AI-drafted starter answer for a likely question, grounded ONLY in the
 * candidate's verified evidence. Gaps are left as [bracketed] placeholders and
 * listed in `missingInfo`. Offline mode produces none (the Blank Page Assistant
 * and Needs-Your-Input cover that case).
 */
export interface PersonalizedAnswer {
  questionText: string;
  answer: string;
  /** Evidence labels/refs this draft drew from (candidate_fact citations). */
  sources: string[];
  missingInfo: string[];
}

export interface PrepPackage {
  input: PrepInput;
  analysis: JobAnalysis;
  matches: RequirementMatch[];
  summary: MatchSummary;
  questions: PrepQuestion[];
  studyTopics: StudyTopic[];
  readiness: ReadinessScore[];
  suggestedStories: SuggestedStory[];
  needsInput: NeedsInput[];
  answers: PersonalizedAnswer[];
  source: 'ai' | 'offline';
}

/** Behavioral cues in evidence text → candidate story competencies. */
const STORY_CUES: { competency: Competency; cues: RegExp; title: string }[] = [
  { competency: 'problem-solving', cues: /\b(solv|debug|fixed|root cause|resolved|troubleshoot)\b/i, title: 'Solved a difficult problem' },
  { competency: 'conflict-resolution', cues: /\b(conflict|disagree|pushback|aligned|negotiat)\b/i, title: 'Resolved a conflict' },
  { competency: 'leadership', cues: /\b(led|mentor|managed|coordinat|drove|owned)\b/i, title: 'Led or influenced others' },
  { competency: 'ownership', cues: /\b(built|shipped|launched|delivered|initiat|created)\b/i, title: 'Took initiative and delivered' },
  { competency: 'adaptability', cues: /\b(under pressure|deadline|pivot|urgent|last minute|changing)\b/i, title: 'Worked under pressure' },
  { competency: 'failure-learning', cues: /\b(failed|mistake|learned|setback|retro)\b/i, title: 'Learned from a failure' },
  { competency: 'customer-focus', cues: /\b(customer|client|user|support|stakeholder)\b/i, title: 'Handled a customer situation' },
];

const HAS_METRIC = /\d/;

function discoverStories(evidence: CandidateEvidence[]): SuggestedStory[] {
  const stories: SuggestedStory[] = [];
  const seen = new Set<string>();
  for (const e of evidence) {
    if (e.sourceType === 'resume' || e.sourceType === 'previous_answer') continue;
    for (const { competency, cues, title } of STORY_CUES) {
      if (!cues.test(e.text)) continue;
      const key = `${e.label}::${competency}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const missing: string[] = [];
      if (!HAS_METRIC.test(e.text)) missing.push('A concrete result or metric');
      if (e.text.length < 120) missing.push('More detail on what you personally did');

      stories.push({
        title: `${title} — ${e.label}`,
        competencies: [competency],
        evidenceSource: e.label,
        missingInfo: missing,
        prompt: `I see ${title.toLowerCase()} in your ${e.label} experience. What was one specific thing you personally did, and what was the outcome?`,
      });
      break; // one suggested story per evidence item keeps the list scannable
    }
  }
  return stories.slice(0, 6);
}

function buildNeedsInput(matches: RequirementMatch[]): NeedsInput[] {
  // Ask about important requirements with partial evidence first (most fixable),
  // then true gaps. Missing evidence becomes a question — never a fabricated fact.
  const candidates = matches
    .filter((m) => m.status !== 'strong')
    .sort((a, b) => {
      const rank = (m: RequirementMatch) => (m.status === 'partial' ? 0 : 1);
      return rank(a) - rank(b) || b.requirement.importance - a.requirement.importance;
    })
    .slice(0, 3);

  return candidates.map((m) => {
    const hint =
      m.status === 'partial' && m.evidence[0]
        ? `I found related experience in ${m.evidence[0].label}.`
        : `The role asks for ${m.requirement.text}, and I don't see verified evidence yet.`;
    return {
      requirementId: m.requirement.id,
      question: `Can you describe a time you worked with ${m.requirement.text}? A few sentences is enough.`,
      evidenceHint: hint,
    };
  });
}

export interface AssembleOptions {
  answeredCount?: number;
  /** AI-drafted personalized answers to attach (empty for offline). */
  answers?: PersonalizedAnswer[];
}

/**
 * Assembles the full package from a job analysis + verified profile. The
 * grounding-critical steps (matching, questions, readiness, story discovery,
 * needs-input) ALWAYS run here in the tested pure domain — never in the model —
 * regardless of whether `analysis` came from AI or the offline analyzer.
 */
export function assembleFromAnalysis(
  input: PrepInput,
  analysis: JobAnalysis,
  profile: CandidateProfile,
  source: 'ai' | 'offline',
  opts: AssembleOptions = {},
): PrepPackage {
  const matches = matchRequirements(analysis.requirements, profile);
  const summary = summarizeMatches(matches);
  const questions = generatePrepQuestions({
    analysis,
    matches,
    evidence: profile.evidence,
  });
  const studyTopics = generateStudyTopics(analysis);
  const readiness = computeReadiness({
    summary,
    profile,
    questions,
    answeredCount: opts.answeredCount ?? 0,
  });
  const suggestedStories = discoverStories(profile.evidence);
  const needsInput = buildNeedsInput(matches);

  return {
    input,
    analysis,
    matches,
    summary,
    questions,
    studyTopics,
    readiness,
    suggestedStories,
    needsInput,
    answers: opts.answers ?? [],
    source,
  };
}

/**
 * Assembles a complete prep package with no backend. Pure and deterministic —
 * this is both the offline fallback and the oracle the tests assert against.
 */
export function assemblePackageLocally(
  input: PrepInput,
  sources: CandidateSources,
  opts: { answeredCount?: number } = {},
): PrepPackage {
  const profile: CandidateProfile = buildCandidateProfile(sources);
  const analysis = analyzeJobDescription(input.jobDescription, {
    jobTitle: input.jobTitle,
  });
  return assembleFromAnalysis(input, analysis, profile, 'offline', {
    answeredCount: opts.answeredCount,
  });
}
