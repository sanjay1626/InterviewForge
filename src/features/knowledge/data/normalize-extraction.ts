import type {
  ExtractedProfile,
  ProjectInput,
  WorkExperienceInput,
} from '../domain/types';

/**
 * Coerces a raw extraction payload into safe, fully-typed candidates.
 * Defensive by design: bad or oversized model output can never crash the review
 * screen, and nothing is invented — missing fields become empty strings/arrays.
 */

const MAX_ITEMS = 25;
const MAX_TAGS = 30;
const MAX_SHORT = 200;
const MAX_LONG = 2000;

function str(value: unknown, max = MAX_SHORT): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function strList(value: unknown, max = MAX_TAGS): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    const s = str(item, MAX_LONG);
    const key = s.toLowerCase();
    if (s && !seen.has(key)) {
      seen.add(key);
      out.push(s);
    }
    if (out.length >= max) break;
  }
  return out;
}

function bool(value: unknown): boolean {
  return value === true;
}

function toExperience(raw: Record<string, unknown>): WorkExperienceInput {
  return {
    company: str(raw.company),
    title: str(raw.title),
    location: str(raw.location),
    startDate: str(raw.startDate, 40),
    endDate: str(raw.endDate, 40),
    isCurrent: bool(raw.isCurrent),
    description: str(raw.description, MAX_LONG),
    highlights: strList(raw.highlights),
    skills: strList(raw.skills),
  };
}

function toProject(raw: Record<string, unknown>): ProjectInput {
  return {
    name: str(raw.name),
    role: str(raw.role),
    description: str(raw.description, MAX_LONG),
    highlights: strList(raw.highlights),
    skills: strList(raw.skills),
    link: str(raw.link, 500),
    startDate: str(raw.startDate, 40),
    endDate: str(raw.endDate, 40),
  };
}

export function normalizeExtraction(raw: Record<string, unknown>): ExtractedProfile {
  const experiences = Array.isArray(raw.experiences)
    ? raw.experiences
        .slice(0, MAX_ITEMS)
        .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null)
        .map(toExperience)
        // An experience without a company or title isn't usable.
        .filter((e) => e.company || e.title)
    : [];

  const projects = Array.isArray(raw.projects)
    ? raw.projects
        .slice(0, MAX_ITEMS)
        .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
        .map(toProject)
        .filter((p) => p.name)
    : [];

  return {
    experiences,
    projects,
    skills: strList(raw.skills, 60),
    certifications: strList(raw.certifications, 30),
  };
}

/** True when there is nothing worth showing the user. */
export function isEmptyExtraction(profile: ExtractedProfile): boolean {
  return (
    profile.experiences.length === 0 &&
    profile.projects.length === 0 &&
    profile.skills.length === 0 &&
    profile.certifications.length === 0
  );
}
