import {
  evidenceTokens,
  type CandidateEvidence,
  type CandidateProfile,
} from './evidence';
import type { JobRequirement } from './job-analysis';
import { normalizeKeyword } from './tokens';

/**
 * Requirement → verified-evidence matching. This is the load-bearing grounding
 * step: a requirement is matched ONLY against the candidate's own evidence and
 * skills, NEVER against the job description. Missing evidence stays missing — it
 * is never upgraded into an assumed qualification.
 */

export type MatchStatus = 'strong' | 'partial' | 'none';

export interface RequirementMatch {
  requirement: JobRequirement;
  status: MatchStatus;
  /** Supporting verified evidence (candidate_fact). Empty when status = 'none'. */
  evidence: CandidateEvidence[];
  /** Plain-language reason, referencing evidence or its absence. */
  rationale: string;
}

/** True when any requirement keyword appears verbatim in the user's skill list. */
function inSkills(reqKeywords: string[], skills: string[]): boolean {
  const skillSet = new Set(skills.map(normalizeKeyword));
  return reqKeywords.some((k) => skillSet.has(normalizeKeyword(k)));
}

/** How many requirement keywords are covered by a single evidence item. */
function coverage(reqKeywords: string[], evidence: CandidateEvidence): number {
  if (reqKeywords.length === 0) return 0;
  const tokens = evidenceTokens(evidence);
  let hit = 0;
  for (const k of reqKeywords) {
    const parts = normalizeKeyword(k).split(' ');
    if (parts.every((p) => tokens.has(p))) hit += 1;
  }
  return hit / reqKeywords.length;
}

/**
 * Classifies one requirement against the profile.
 *  - strong  : the skill is listed, or an evidence item covers ~all keywords.
 *  - partial : some keyword overlap in evidence, but not conclusive.
 *  - none    : no verified overlap → MISSING (never fabricated).
 */
export function matchRequirement(
  requirement: JobRequirement,
  profile: CandidateProfile,
): RequirementMatch {
  const supporting: { evidence: CandidateEvidence; score: number }[] = [];
  for (const e of profile.evidence) {
    const score = coverage(requirement.keywords, e);
    if (score > 0) supporting.push({ evidence: e, score });
  }
  supporting.sort((a, b) => b.score - a.score);
  const top = supporting.slice(0, 3).map((s) => s.evidence);
  const best = supporting[0]?.score ?? 0;
  const skillListed = inSkills(requirement.keywords, profile.skills);

  let status: MatchStatus;
  if (skillListed || best >= 0.75) status = 'strong';
  else if (best > 0) status = 'partial';
  else status = 'none';

  let rationale: string;
  if (status === 'strong' && skillListed && top.length === 0) {
    rationale = `You list this in your skills.`;
  } else if (status === 'strong') {
    rationale = `Well supported by ${top[0]?.label ?? 'your experience'}.`;
  } else if (status === 'partial') {
    rationale = `Some related evidence in ${top[0]?.label ?? 'your background'}, but nothing conclusive — worth strengthening.`;
  } else {
    rationale = `No verified evidence yet. This is a gap to prepare for, not an assumed skill.`;
  }

  return { requirement, status, evidence: status === 'none' ? [] : top, rationale };
}

export function matchRequirements(
  requirements: JobRequirement[],
  profile: CandidateProfile,
): RequirementMatch[] {
  return requirements.map((r) => matchRequirement(r, profile));
}

export interface MatchSummary {
  strong: RequirementMatch[];
  partial: RequirementMatch[];
  gaps: RequirementMatch[];
  /** 0–100 coverage of all weighted requirements (strong = full, partial = half). */
  coverageScore: number;
}

/** Groups matches and computes an importance-weighted coverage score. */
export function summarizeMatches(matches: RequirementMatch[]): MatchSummary {
  const strong = matches.filter((m) => m.status === 'strong');
  const partial = matches.filter((m) => m.status === 'partial');
  const gaps = matches.filter((m) => m.status === 'none');

  const totalWeight = matches.reduce((s, m) => s + m.requirement.importance, 0);
  const earned = matches.reduce((s, m) => {
    if (m.status === 'strong') return s + m.requirement.importance;
    if (m.status === 'partial') return s + m.requirement.importance * 0.5;
    return s;
  }, 0);
  const coverageScore = totalWeight ? Math.round((earned / totalWeight) * 100) : 0;

  return { strong, partial, gaps, coverageScore };
}
