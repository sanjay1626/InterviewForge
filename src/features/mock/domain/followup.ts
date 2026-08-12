import { countWords } from '@/core/utils/text';
import { DIFFICULTY_META, type MockDifficulty } from './config';

/**
 * Deterministic adaptive follow-up decision. Grounded in the user's actual
 * answer: it reacts to what's missing (ownership, result, detail) with the
 * standard probing questions an interviewer would ask. Limits follow-ups per
 * question by difficulty so sessions stay reasonable.
 */

export type FollowUpAction =
  | 'clarify'
  | 'contribution'
  | 'result'
  | 'difficulty'
  | 'learning'
  | 'none';

export interface FollowUpDecision {
  action: FollowUpAction;
  prompt: string;
}

const PROMPTS: Record<Exclude<FollowUpAction, 'none'>, string> = {
  clarify: 'Could you give me a bit more detail about that situation?',
  contribution: 'What was your specific personal contribution?',
  result: 'How did you measure success — what was the outcome?',
  difficulty: 'What was the most difficult part of that?',
  learning: 'What would you do differently next time?',
};

function has(text: string, re: RegExp): boolean {
  return re.test(text);
}

export function decideFollowUp(
  answerText: string,
  followUpsAsked: number,
  difficulty: MockDifficulty,
): FollowUpDecision {
  const max = DIFFICULTY_META[difficulty].maxFollowUpsPerQuestion;
  if (followUpsAsked >= max) return { action: 'none', prompt: '' };

  const text = answerText.toLowerCase();
  const words = countWords(answerText);

  // Too short → clarify first.
  if (words < 40) return { action: 'clarify', prompt: PROMPTS.clarify };

  // No clear personal ownership → probe contribution.
  const ownership = (text.match(/\bi\b/g) ?? []).length;
  if (ownership < 2 && has(text, /\bwe\b/)) {
    return { action: 'contribution', prompt: PROMPTS.contribution };
  }

  // No result / measurable outcome → ask for it.
  const hasResult =
    /\d/.test(answerText) ||
    has(text, /\b(result|outcome|led to|increased|reduced|improved|delivered|shipped|achieved|as a result)\b/);
  if (!hasResult) return { action: 'result', prompt: PROMPTS.result };

  // Challenging difficulty may probe once more.
  if (max >= 2) {
    if (!has(text, /\b(difficult|hardest|challenge|struggled)\b/)) {
      return { action: 'difficulty', prompt: PROMPTS.difficulty };
    }
    if (!has(text, /\b(learn|learned|takeaway|differently)\b/)) {
      return { action: 'learning', prompt: PROMPTS.learning };
    }
  }

  return { action: 'none', prompt: '' };
}
