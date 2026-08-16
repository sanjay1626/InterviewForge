import { isCompetency, type Competency } from '@/core/domain/competencies';
import type { JobAnalysis, RequirementCategory } from '../domain/job-analysis';
import type { PersonalizedAnswer } from '../domain/package';
import { keywordCounts, normalizeKeyword } from '../domain/tokens';

/**
 * Coerces the untrusted `fast-prep` model output into safe domain types. Invalid
 * categories, out-of-range weights, and malformed entries are dropped or
 * clamped — the app never renders raw model JSON. topKeywords is recomputed
 * deterministically from the JD text rather than trusted from the model.
 */

const CATEGORIES: RequirementCategory[] = [
  'required_skill',
  'preferred_skill',
  'technology',
  'responsibility',
  'behavioral',
  'leadership',
  'customer_facing',
  'domain_knowledge',
  'education_certification',
];
const CATEGORY_SET = new Set<string>(CATEGORIES);

const str = (v: unknown, max = 400): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';
const strArr = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()).map((x) => x.trim())
    : [];

function clampImportance(v: unknown): number {
  const n = typeof v === 'number' ? Math.round(v) : 3;
  return Math.max(1, Math.min(5, Number.isFinite(n) ? n : 3));
}

export function normalizeAnalysis(
  raw: unknown,
  jobDescription: string,
  fallbackTitle: string,
): JobAnalysis {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const requirements = (Array.isArray(obj.requirements) ? obj.requirements : [])
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r, i) => {
      const category = CATEGORY_SET.has(String(r.category))
        ? (r.category as RequirementCategory)
        : 'responsibility';
      const text = str(r.text, 160);
      const keywords = strArr(r.keywords).map(normalizeKeyword).filter(Boolean).slice(0, 6);
      return {
        id: `req-${i + 1}`,
        category,
        text,
        keywords: keywords.length ? keywords : text ? [normalizeKeyword(text)] : [],
        importance: clampImportance(r.importance),
      };
    })
    .filter((r) => r.text && r.keywords.length);

  const behavioralCompetencies = strArr(obj.behavioralCompetencies)
    .map((c) => c.toLowerCase())
    .filter((c): c is Competency => isCompetency(c));

  return {
    jobTitle: str(obj.jobTitle, 160) || fallbackTitle || 'This role',
    seniority: str(obj.seniority, 40) || null,
    requirements,
    technologies: strArr(obj.technologies).map((t) => t.toLowerCase()).slice(0, 30),
    behavioralCompetencies: [...new Set(behavioralCompetencies)],
    topKeywords: keywordCounts(jobDescription).slice(0, 15),
  };
}

export function normalizeAnswers(raw: unknown): PersonalizedAnswer[] {
  return (Array.isArray(raw) ? raw : [])
    .filter((a): a is Record<string, unknown> => typeof a === 'object' && a !== null)
    .map((a) => ({
      questionText: str(a.questionText, 300),
      answer: str(a.answer, 3000),
      sources: strArr(a.sources).slice(0, 8),
      missingInfo: strArr(a.missingInfo).slice(0, 8),
    }))
    .filter((a) => a.questionText && a.answer)
    .slice(0, 6);
}
