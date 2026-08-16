import { questionCountFor, type MockConfig } from '@/features/mock/domain/config';
import { CLOSING, OPENING, type PlannedQuestion, type QuestionKind } from '@/features/mock/domain/plan';
import type { PrepPackage } from './package';
import type { PrepQuestionCategory } from './questions';

/**
 * Builds a mock-interview plan from a Fast Prep package. This REUSES the existing
 * mock plan/room/report engine (it only produces `PlannedQuestion[]`); it does
 * not create a separate interview system.
 *
 * The prep questions are already ranked so that high-priority job requirements,
 * partial-evidence areas (claims likely to be challenged), and behavioral
 * competencies come first — exactly the prioritization the mock should use.
 */

function kindFor(category: PrepQuestionCategory): QuestionKind {
  switch (category) {
    case 'behavioral':
      return 'behavioral';
    case 'resume_deep_dive':
    case 'project_deep_dive':
      return 'resume';
    case 'technical':
    case 'role_specific':
    default:
      return 'role';
  }
}

export function buildPlanFromPrep(pkg: PrepPackage, config: MockConfig): PlannedQuestion[] {
  const total = questionCountFor(config.length);
  const reserveClosing = config.length === 'full';
  const target = reserveClosing ? total - 1 : total;

  const plan: PlannedQuestion[] = [
    { id: 'opening', kind: 'opening', competency: null, prompt: OPENING },
  ];

  const seen = new Set<string>();
  for (const q of pkg.questions) {
    if (plan.length >= target) break;
    const prompt = q.prompt.trim();
    if (!prompt || seen.has(prompt)) continue;
    seen.add(prompt);
    plan.push({ id: q.id, kind: kindFor(q.category), competency: q.competency, prompt });
  }

  if (reserveClosing && plan.length < total) {
    plan.push({ id: 'closing', kind: 'closing', competency: null, prompt: CLOSING });
  }

  return plan.slice(0, total);
}
