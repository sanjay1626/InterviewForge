import { normalizeKeyword, tokenize } from './tokens';

/**
 * The grounding taxonomy. Every claim, requirement, question, or answer the
 * Fast Prep feature produces is tagged with exactly one of these kinds, and the
 * distinction is preserved through matching, prompts, UI, and evaluation.
 *
 * This is section 12 of the spec expressed as a type: it is what stops a job
 * requirement from silently becoming a candidate claim.
 */
export type EvidenceKind =
  /** Verified: originates from the user's own resume, experience, projects,
   *  skills, certifications, STAR stories, or prior interview answers. */
  | 'candidate_fact'
  /** Information about the EMPLOYER (what the job asks for). NOT proof the
   *  candidate possesses it. */
  | 'job_requirement'
  /** A technical concept the candidate may want to review. Not a claim about
   *  what the candidate knows. */
  | 'general_knowledge'
  /** Model-proposed phrasing/structure. Must trace back to candidate_fact and
   *  never introduces new facts. */
  | 'ai_suggestion'
  /** No verified evidence exists. Requires the user's input — never fabricated. */
  | 'missing';

export type EvidenceSourceType =
  | 'resume'
  | 'work_experience'
  | 'project'
  | 'skill'
  | 'certification'
  | 'star_story'
  | 'previous_answer';

/**
 * One piece of verified candidate evidence. Everything here is, by construction,
 * a `candidate_fact` — assembled only from data the user gave us.
 */
export interface CandidateEvidence {
  sourceType: EvidenceSourceType;
  /** DB id of the underlying row when there is one (for citations / linking). */
  sourceId?: string;
  /** Short human label, e.g. "Runestone Academy — QA Engineer". */
  label: string;
  /** The verified text we may quote or match against. */
  text: string;
  /** Normalized skills this evidence demonstrates. */
  skills: string[];
}

/**
 * The user's verified profile, gathered from every knowledge source. The Fast
 * Prep engine matches job requirements ONLY against this — never against the
 * job description itself.
 */
export interface CandidateProfile {
  evidence: CandidateEvidence[];
  /** Union of every skill across evidence + the profile, normalized. */
  skills: string[];
  certifications: string[];
}

/** Raw inputs used to assemble a CandidateProfile (all already user-owned). */
export interface CandidateSources {
  resumeText?: string | null;
  experiences?: {
    id?: string;
    company: string;
    title: string;
    description?: string | null;
    highlights?: string[];
    skills?: string[];
  }[];
  projects?: {
    id?: string;
    name: string;
    role?: string | null;
    description?: string | null;
    highlights?: string[];
    skills?: string[];
  }[];
  skills?: string[];
  certifications?: string[];
  stories?: {
    id?: string;
    title: string;
    narrative: string;
    skills?: string[];
    company?: string | null;
  }[];
  answers?: { id?: string; questionText: string; answerText: string }[];
}

function pushSkills(target: Set<string>, skills?: string[]): void {
  for (const s of skills ?? []) {
    const n = normalizeKeyword(s);
    if (n) target.add(n);
  }
}

/**
 * Builds the verified profile. Pure: no fabrication, no inference of skills the
 * user did not list — skills come only from explicit skill fields (resume
 * free-text is kept as matchable evidence text, not promoted to a skill claim).
 */
export function buildCandidateProfile(sources: CandidateSources): CandidateProfile {
  const evidence: CandidateEvidence[] = [];
  const skills = new Set<string>();

  pushSkills(skills, sources.skills);

  for (const e of sources.experiences ?? []) {
    pushSkills(skills, e.skills);
    const text = [e.title, e.company, e.description, ...(e.highlights ?? [])]
      .filter(Boolean)
      .join('. ');
    evidence.push({
      sourceType: 'work_experience',
      sourceId: e.id,
      label: `${e.company} — ${e.title}`,
      text,
      skills: (e.skills ?? []).map(normalizeKeyword).filter(Boolean),
    });
  }

  for (const p of sources.projects ?? []) {
    pushSkills(skills, p.skills);
    const text = [p.name, p.role, p.description, ...(p.highlights ?? [])]
      .filter(Boolean)
      .join('. ');
    evidence.push({
      sourceType: 'project',
      sourceId: p.id,
      label: p.name,
      text,
      skills: (p.skills ?? []).map(normalizeKeyword).filter(Boolean),
    });
  }

  for (const s of sources.stories ?? []) {
    pushSkills(skills, s.skills);
    evidence.push({
      sourceType: 'star_story',
      sourceId: s.id,
      label: s.title,
      text: s.narrative,
      skills: (s.skills ?? []).map(normalizeKeyword).filter(Boolean),
    });
  }

  for (const a of sources.answers ?? []) {
    evidence.push({
      sourceType: 'previous_answer',
      sourceId: a.id,
      label: a.questionText.slice(0, 60),
      text: a.answerText,
      skills: [],
    });
  }

  if (sources.resumeText && sources.resumeText.trim()) {
    evidence.push({
      sourceType: 'resume',
      label: 'Resume',
      text: sources.resumeText.trim(),
      skills: [],
    });
  }

  return {
    evidence,
    skills: [...skills],
    certifications: (sources.certifications ?? []).map(normalizeKeyword).filter(Boolean),
  };
}

/** All matchable tokens for a single piece of evidence (text + its skills). */
export function evidenceTokens(e: CandidateEvidence): Set<string> {
  const set = new Set<string>(tokenize(e.text));
  for (const s of e.skills) for (const t of tokenize(s)) set.add(t);
  return set;
}
