import type { StarStatus, StarStoryInput } from './types';

/**
 * Pure STAR helpers. These NEVER add facts — they only inspect and rearrange the
 * user's own text. The narrative assembler concatenates the user's sections; it
 * does not generate or infer any new content.
 */

export type StarPartKey = 'situation' | 'task' | 'action' | 'result';

export const STAR_PARTS: { key: StarPartKey; label: string; prompt: string }[] = [
  {
    key: 'situation',
    label: 'Situation',
    prompt: 'Set the scene. Where were you and what was happening?',
  },
  {
    key: 'task',
    label: 'Task',
    prompt: 'What was your responsibility or the goal you owned?',
  },
  {
    key: 'action',
    label: 'Action',
    prompt: 'What did you specifically do? Use “I”, not “we”.',
  },
  {
    key: 'result',
    label: 'Result',
    prompt: 'What happened? Real outcomes only — no need to invent numbers.',
  },
];

function nonEmpty(value: string | null | undefined): value is string {
  return Boolean(value && value.trim());
}

/** Which of the four STAR parts are still empty. */
export function missingStarParts(
  input: Pick<StarStoryInput, StarPartKey>,
): { key: StarPartKey; label: string }[] {
  return STAR_PARTS.filter((p) => !nonEmpty(input[p.key])).map(({ key, label }) => ({
    key,
    label,
  }));
}

/** True only when all four STAR parts contain the user's text. */
export function isReadyEligible(input: Pick<StarStoryInput, StarPartKey>): boolean {
  return missingStarParts(input).length === 0;
}

/**
 * Prevents a story from being marked "ready" while STAR parts are missing.
 * Downgrades a requested "ready" to "needs_details" instead of guessing content.
 */
export function clampStatus(
  requested: StarStatus,
  input: Pick<StarStoryInput, StarPartKey>,
): StarStatus {
  if (requested === 'ready' && !isReadyEligible(input)) return 'needs_details';
  return requested;
}

/**
 * Assembles the user's STAR sections (plus lesson) into a single spoken-style
 * paragraph. Built ONLY from the user's words — nothing is added or inferred.
 */
export function assembleNarrative(
  input: Pick<StarStoryInput, StarPartKey | 'lesson'>,
): string {
  return [input.situation, input.task, input.action, input.result, input.lesson]
    .filter(nonEmpty)
    .map((s) => s.trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export { estimateSpokenSeconds } from '@/core/utils/text';
