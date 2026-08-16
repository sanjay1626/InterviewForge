import type { Competency } from '@/core/domain/competencies';
import { QUESTION_LIBRARY } from '@/features/practice/domain/questions';
import { questionCountFor, type MockConfig } from './config';

/**
 * Deterministic interview-plan builder. Produces a balanced, grounded sequence
 * from the bundled question library + the user's weak competencies. It never
 * fabricates: resume/role slots use questions that ask the user to talk about
 * their own real experience.
 */

export type QuestionKind =
  | 'opening'
  | 'resume'
  | 'behavioral'
  | 'role'
  | 'weak'
  | 'closing';

export interface PlannedQuestion {
  id: string;
  kind: QuestionKind;
  competency: Competency | null;
  prompt: string;
}

export const OPENING = 'To start, tell me a bit about yourself and what you are looking for in your next role.';
const RESUME_PROMPTS = [
  'Walk me through your background and a project from your experience you are most proud of.',
  'Tell me about a project on your resume and the part you personally played in it.',
];
export const CLOSING = 'That is everything from me. Is there anything you would like to add, or any questions you have for me?';

/** Role-focused competencies interviewers commonly probe. */
const ROLE_COMPETENCIES: Competency[] = ['ownership', 'problem-solving', 'communication'];

function libFor(competency: Competency, used: Set<string>): PlannedQuestion | null {
  const q = QUESTION_LIBRARY.find(
    (item) => item.competency === competency && !used.has(item.id),
  );
  if (!q) return null;
  used.add(q.id);
  return { id: q.id, kind: 'behavioral', competency, prompt: q.prompt };
}

export interface PlanContext {
  weakCompetencies: Competency[]; // ordered weakest-first
  hasResume: boolean;
  roleTitle: string;
}

export function buildInterviewPlan(
  config: MockConfig,
  context: PlanContext,
): PlannedQuestion[] {
  const total = questionCountFor(config.length);
  const used = new Set<string>();
  const plan: PlannedQuestion[] = [];

  // 1. Opening (always).
  plan.push({ id: 'opening', kind: 'opening', competency: null, prompt: OPENING });

  // 2. Resume / project deep-dive (for resume & mixed types).
  if (config.type !== 'behavioral') {
    plan.push({
      id: 'resume-1',
      kind: 'resume',
      competency: null,
      prompt: RESUME_PROMPTS[0]!,
    });
  }

  // Behavioral competency rotation (skip the three foundationals' competencies
  // last so variety comes first).
  const behavioralOrder: Competency[] = [
    'problem-solving',
    'teamwork',
    'conflict-resolution',
    'leadership',
    'adaptability',
    'failure-learning',
    'communication',
    'ownership',
    'customer-focus',
    'time-management',
  ];

  // 3. One behavioral competency question.
  for (const c of behavioralOrder) {
    if (plan.length >= total - 1) break;
    const q = libFor(c, used);
    if (q) {
      plan.push(q);
      break;
    }
  }

  // 4. Role-specific question.
  if (plan.length < total) {
    for (const c of ROLE_COMPETENCIES) {
      const q = libFor(c, used);
      if (q) {
        plan.push({ ...q, kind: 'role' });
        break;
      }
    }
  }

  // 5. Weak-area question (from the user's weakest competencies).
  if (plan.length < total && context.weakCompetencies.length > 0) {
    for (const c of context.weakCompetencies) {
      const q = libFor(c, used);
      if (q) {
        plan.push({ ...q, kind: 'weak' });
        break;
      }
    }
  }

  // Fill remaining behavioral slots (leave room for closing on full sessions).
  const reserveClosing = config.length === 'full';
  const target = reserveClosing ? total - 1 : total;
  for (const c of behavioralOrder) {
    if (plan.length >= target) break;
    const q = libFor(c, used);
    if (q) plan.push(q);
  }
  // If still short (library exhausted for chosen order), pull any unused question.
  for (const q of QUESTION_LIBRARY) {
    if (plan.length >= target) break;
    if (!used.has(q.id)) {
      used.add(q.id);
      plan.push({ id: q.id, kind: 'behavioral', competency: q.competency, prompt: q.prompt });
    }
  }

  // 6. Closing (full sessions).
  if (reserveClosing && plan.length < total) {
    plan.push({ id: 'closing', kind: 'closing', competency: null, prompt: CLOSING });
  }

  return plan.slice(0, total);
}
