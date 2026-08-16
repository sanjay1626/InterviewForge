import type { Competency } from '@/core/domain/competencies';
import { keywordCounts, normalizeKeyword, toLines, tokenize } from './tokens';

/**
 * Deterministic job-description analysis. Extracts requirements (with importance
 * weights) from the JD text. Everything produced here is `job_requirement` — it
 * describes the EMPLOYER, never the candidate. The AI path (Phase 2) returns the
 * same shape; this offline analyzer is the fallback and the test oracle.
 */

export type RequirementCategory =
  | 'required_skill'
  | 'preferred_skill'
  | 'technology'
  | 'responsibility'
  | 'behavioral'
  | 'leadership'
  | 'customer_facing'
  | 'domain_knowledge'
  | 'education_certification';

export interface JobRequirement {
  id: string;
  category: RequirementCategory;
  /** Human-readable requirement text. */
  text: string;
  /** Normalized tokens used for matching against candidate evidence. */
  keywords: string[];
  /** 1 (nice-to-have) … 5 (critical). Drives question priority + readiness. */
  importance: number;
}

export interface JobAnalysis {
  jobTitle: string;
  seniority: string | null;
  requirements: JobRequirement[];
  technologies: string[];
  behavioralCompetencies: Competency[];
  topKeywords: { keyword: string; count: number }[];
}

/** A small, extensible dictionary of recognizable technologies/tools. */
const TECHNOLOGIES = [
  'playwright', 'selenium', 'cypress', 'jest', 'pytest', 'junit', 'mocha',
  'javascript', 'typescript', 'python', 'java', 'go', 'golang', 'ruby', 'php',
  'c#', 'c++', 'kotlin', 'swift', 'rust', 'scala',
  'react', 'react native', 'angular', 'vue', 'svelte', 'node.js', 'node',
  'express', 'django', 'flask', 'spring', 'rails', '.net', 'graphql',
  'rest', 'rest apis', 'grpc', 'sql', 'postgresql', 'mysql', 'mongodb',
  'redis', 'elasticsearch', 'kafka', 'rabbitmq',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ansible',
  'ci/cd', 'jenkins', 'github actions', 'gitlab', 'git',
  'kotlin', 'figma', 'jira', 'agile', 'scrum', 'linux', 'bash',
];

/** Behavioral cue phrases → competency. */
// Stems intentionally omit a trailing word boundary so a stem like "communicat"
// matches "communication"/"communicating".
const BEHAVIORAL_CUES: { competency: Competency; cues: RegExp }[] = [
  { competency: 'leadership', cues: /\b(lead|mentor|manage|guide|influence)/i },
  { competency: 'communication', cues: /\b(communicat|present|articulate|stakeholder|document|explain)/i },
  { competency: 'teamwork', cues: /\b(collaborat|cross-functional|team player|partner)/i },
  { competency: 'problem-solving', cues: /\b(problem[- ]solv|troubleshoot|debug|analyz|root cause)/i },
  { competency: 'ownership', cues: /\b(ownership|accountab|end[- ]to[- ]end)/i },
  { competency: 'adaptability', cues: /\b(adapt|fast[- ]paced|ambiguity|changing|flexible)/i },
  { competency: 'customer-focus', cues: /\b(customer|client|user[- ]centric|user experience|support)/i },
  { competency: 'time-management', cues: /\b(deadline|prioriti|time management|deliver on time)/i },
];

const REQUIRED_CUE = /\b(require|required|must|must have|need|essential|minimum)\b/i;
const PREFERRED_CUE = /\b(prefer|preferred|nice to have|bonus|plus|desirable|ideal)\b/i;
const RESPONSIBILITY_CUE = /\b(responsible|responsibilit|you will|will be|develop|build|design|maintain|create|deliver|drive|manage)\b/i;
const LEADERSHIP_CUE = /\b(lead|mentor|manage|supervise|coach|direct)\b/i;
const CUSTOMER_CUE = /\b(customer|client|stakeholder|user-facing|customer-facing)\b/i;
const DOMAIN_CUE = /\b(domain|industry|fintech|healthcare|e-?commerce|edtech|saas|banking|insurance)\b/i;
const EDUCATION_CUE = /\b(degree|bachelor|master|phd|certification|certified|diploma)\b/i;
const SENIORITY = /\b(intern|junior|entry[- ]level|mid[- ]level|senior|staff|principal|lead|head|director|vp)\b/i;

function detectTechnologies(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const tech of TECHNOLOGIES) {
    // word-ish boundary match; handles multi-word + symbols like c#, node.js
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
    if (re.test(lower)) found.push(tech);
  }
  return [...new Set(found)];
}

function seniorityOf(text: string, jobTitle: string): string | null {
  const m = `${jobTitle}\n${text}`.match(SENIORITY);
  return m ? m[0].toLowerCase() : null;
}

let counter = 0;
function reqId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

function importanceForLine(line: string, base: number): number {
  let score = base;
  if (REQUIRED_CUE.test(line)) score += 1;
  if (PREFERRED_CUE.test(line)) score -= 1;
  return Math.max(1, Math.min(5, score));
}

/**
 * Analyzes a job description into weighted requirements. Deterministic and
 * side-effect free (aside from the module-local id counter, which only affects
 * ids, not matching).
 */
export function analyzeJobDescription(
  jobDescription: string,
  opts: { jobTitle?: string; seniority?: string | null } = {},
): JobAnalysis {
  const text = jobDescription ?? '';
  const lines = toLines(text);
  const technologies = detectTechnologies(text);
  const requirements: JobRequirement[] = [];
  const seenTech = new Set<string>();

  // 1. Technology requirements (one per detected tech, weighted by required/preferred).
  for (const tech of technologies) {
    const line = lines.find((l) => l.toLowerCase().includes(tech)) ?? tech;
    const preferred = PREFERRED_CUE.test(line) && !REQUIRED_CUE.test(line);
    seenTech.add(normalizeKeyword(tech));
    requirements.push({
      id: reqId('tech'),
      category: preferred ? 'preferred_skill' : 'technology',
      text: tech,
      keywords: tokenize(tech),
      importance: importanceForLine(line, preferred ? 3 : 4),
    });
  }

  // 2. Line-based requirements (responsibilities, leadership, customer, domain, education).
  for (const line of lines) {
    if (line.length < 8) continue;
    const lower = line.toLowerCase();

    let category: RequirementCategory | null = null;
    let base = 3;
    if (EDUCATION_CUE.test(lower)) {
      category = 'education_certification';
      base = 3;
    } else if (LEADERSHIP_CUE.test(lower) && REQUIRED_CUE.test(lower)) {
      category = 'leadership';
      base = 4;
    } else if (CUSTOMER_CUE.test(lower)) {
      category = 'customer_facing';
      base = 3;
    } else if (DOMAIN_CUE.test(lower)) {
      category = 'domain_knowledge';
      base = 3;
    } else if (RESPONSIBILITY_CUE.test(lower)) {
      category = 'responsibility';
      base = 3;
    }
    if (!category) continue;

    // Skip lines that are only a bare technology already captured above.
    const kw = tokenize(line).filter((t) => !seenTech.has(t));
    if (kw.length === 0) continue;

    requirements.push({
      id: reqId('req'),
      category,
      text: line.length > 160 ? `${line.slice(0, 157)}…` : line,
      keywords: kw.slice(0, 8),
      importance: importanceForLine(line, base),
    });
  }

  // 3. Behavioral competencies (cross-cutting; also surfaced as requirements).
  const behavioralCompetencies: Competency[] = [];
  for (const { competency, cues } of BEHAVIORAL_CUES) {
    if (cues.test(text)) {
      behavioralCompetencies.push(competency);
      requirements.push({
        id: reqId('beh'),
        category: 'behavioral',
        text: competency.replace('-', ' '),
        keywords: [competency.replace('-', ' ')],
        importance: 3,
      });
    }
  }

  return {
    jobTitle: opts.jobTitle?.trim() || inferTitle(lines) || 'This role',
    seniority: opts.seniority ?? seniorityOf(text, opts.jobTitle ?? ''),
    requirements,
    technologies,
    behavioralCompetencies,
    topKeywords: keywordCounts(text).slice(0, 15),
  };
}

/** Best-effort title from the first meaningful line when none was supplied. */
function inferTitle(lines: string[]): string | null {
  const first = lines.find((l) => l.length >= 3 && l.length <= 80);
  return first ?? null;
}
