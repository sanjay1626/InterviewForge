/**
 * Behavioral competencies — a cross-cutting product concept used by STAR
 * stories (Phase 3) and the behavioral question library (Phase 4). Kept in core
 * so no feature owns it.
 */

export type Competency =
  | 'problem-solving'
  | 'conflict-resolution'
  | 'failure-learning'
  | 'leadership'
  | 'teamwork'
  | 'ownership'
  | 'adaptability'
  | 'communication'
  | 'customer-focus'
  | 'time-management';

export interface CompetencyMeta {
  value: Competency;
  label: string;
  description: string;
}

export const COMPETENCIES: CompetencyMeta[] = [
  { value: 'problem-solving', label: 'Problem solving', description: 'Analyzing and resolving difficult problems' },
  { value: 'conflict-resolution', label: 'Conflict resolution', description: 'Navigating disagreements constructively' },
  { value: 'failure-learning', label: 'Failure & learning', description: 'Owning mistakes and growing from them' },
  { value: 'leadership', label: 'Leadership', description: 'Guiding people and outcomes' },
  { value: 'teamwork', label: 'Teamwork', description: 'Collaborating effectively with others' },
  { value: 'ownership', label: 'Ownership', description: 'Taking responsibility end to end' },
  { value: 'adaptability', label: 'Adaptability', description: 'Adjusting to change and ambiguity' },
  { value: 'communication', label: 'Communication', description: 'Explaining clearly and persuading' },
  { value: 'customer-focus', label: 'Customer focus', description: 'Centering the customer or user' },
  { value: 'time-management', label: 'Time management', description: 'Prioritizing and delivering on time' },
];

const COMPETENCY_VALUES = new Set(COMPETENCIES.map((c) => c.value));

export function isCompetency(value: unknown): value is Competency {
  return typeof value === 'string' && COMPETENCY_VALUES.has(value as Competency);
}

export function competencyLabel(value: Competency): string {
  return COMPETENCIES.find((c) => c.value === value)?.label ?? value;
}
