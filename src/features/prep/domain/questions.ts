import type { Competency } from '@/core/domain/competencies';
import { QUESTION_LIBRARY } from '@/features/practice/domain/questions';
import type { CandidateEvidence } from './evidence';
import type { JobAnalysis } from './job-analysis';
import type { RequirementMatch } from './matching';

/**
 * Deterministic likely-question generation for the prep package. Questions are
 * ranked by the importance of the requirement they probe and by match status:
 * high-importance requirements and partial-evidence areas (claims likely to be
 * challenged) are prioritized. Behavioral prompts reuse the bundled library so
 * they stay grounded and consistent with the rest of the app.
 */

export type PrepQuestionCategory =
  | 'behavioral'
  | 'technical'
  | 'resume_deep_dive'
  | 'project_deep_dive'
  | 'role_specific';

export type PrepPriority = 'high' | 'medium' | 'bonus';

export interface PrepQuestion {
  id: string;
  category: PrepQuestionCategory;
  priority: PrepPriority;
  prompt: string;
  competency: Competency | null;
  /** The JD requirement this question targets, when applicable. */
  requirementId: string | null;
  /** Why this question is likely / how it was chosen. */
  rationale: string;
}

function priorityFor(importance: number, status: RequirementMatch['status']): PrepPriority {
  // Partial evidence on an important requirement is the classic "challenge" zone.
  if (status === 'partial' && importance >= 3) return 'high';
  if (importance >= 4) return 'high';
  if (importance >= 2) return 'medium';
  return 'bonus';
}

function libFor(competency: Competency, used: Set<string>): { id: string; prompt: string } | null {
  const q = QUESTION_LIBRARY.find((item) => item.competency === competency && !used.has(item.id));
  if (!q) return null;
  used.add(q.id);
  return { id: q.id, prompt: q.prompt };
}

const PRIORITY_RANK: Record<PrepPriority, number> = { high: 0, medium: 1, bonus: 2 };

export interface GenerateQuestionsInput {
  analysis: JobAnalysis;
  matches: RequirementMatch[];
  evidence: CandidateEvidence[];
}

export function generatePrepQuestions(input: GenerateQuestionsInput): PrepQuestion[] {
  const { analysis, matches, evidence } = input;
  const questions: PrepQuestion[] = [];
  const usedLib = new Set<string>();
  let n = 0;
  const id = () => `pq-${(n += 1)}`;

  // 1. Technical questions from technology/skill requirements.
  for (const m of matches) {
    if (m.requirement.category !== 'technology' && m.requirement.category !== 'required_skill' && m.requirement.category !== 'preferred_skill') {
      continue;
    }
    questions.push({
      id: id(),
      category: 'technical',
      priority: priorityFor(m.requirement.importance, m.status),
      prompt: `This role uses ${m.requirement.text}. Walk me through how you have used ${m.requirement.text}${m.status === 'none' ? ', or how you would ramp up on it' : ''}.`,
      competency: null,
      requirementId: m.requirement.id,
      rationale:
        m.status === 'none'
          ? `${m.requirement.text} is in the JD but not yet in your verified evidence — likely to be probed.`
          : `${m.requirement.text} is a listed requirement (importance ${m.requirement.importance}/5).`,
    });
  }

  // 2. Behavioral questions from JD competencies (reuse the library).
  for (const competency of analysis.behavioralCompetencies) {
    const q = libFor(competency, usedLib);
    if (!q) continue;
    questions.push({
      id: id(),
      category: 'behavioral',
      priority: 'high',
      prompt: q.prompt,
      competency,
      requirementId: null,
      rationale: `The JD emphasizes ${competency.replace('-', ' ')}.`,
    });
  }

  // 3. Resume / project deep-dives from the candidate's own evidence.
  for (const e of evidence.slice(0, 4)) {
    if (e.sourceType === 'project') {
      questions.push({
        id: id(),
        category: 'project_deep_dive',
        priority: 'medium',
        prompt: `Tell me about ${e.label}. What was your specific role and the hardest problem you solved?`,
        competency: 'problem-solving',
        requirementId: null,
        rationale: `Project on your resume — expect a deep dive.`,
      });
    } else if (e.sourceType === 'work_experience') {
      questions.push({
        id: id(),
        category: 'resume_deep_dive',
        priority: 'medium',
        prompt: `Walk me through your work at ${e.label} and a result you are proud of.`,
        competency: null,
        requirementId: null,
        rationale: `Experience on your resume — expect a deep dive.`,
      });
    }
  }

  // 4. Role-specific from responsibilities.
  for (const m of matches) {
    if (m.requirement.category !== 'responsibility' && m.requirement.category !== 'leadership' && m.requirement.category !== 'customer_facing') {
      continue;
    }
    questions.push({
      id: id(),
      category: 'role_specific',
      priority: priorityFor(m.requirement.importance, m.status),
      prompt: `The role involves: "${m.requirement.text}". Tell me about a time you did something similar.`,
      competency: null,
      requirementId: m.requirement.id,
      rationale: `Core responsibility for this role.`,
    });
  }

  // Stable, priority-first ordering.
  return questions
    .map((q, i) => ({ q, i }))
    .sort((a, b) => PRIORITY_RANK[a.q.priority] - PRIORITY_RANK[b.q.priority] || a.i - b.i)
    .map(({ q }) => q);
}
