import type { Competency } from '@/core/domain/competencies';

/**
 * Behavioral question library — bundled locally so practice works offline and
 * in guest mode. Mirrors the `behavioral_questions` seed in migration 0004.
 * The three foundational questions are flagged.
 */
export interface BehavioralQuestion {
  id: string;
  competency: Competency;
  prompt: string;
  isFoundational: boolean;
}

function q(
  competency: Competency,
  prompts: string[],
  foundationalFirst = false,
): BehavioralQuestion[] {
  return prompts.map((prompt, i) => ({
    id: `${competency}-${i + 1}`,
    competency,
    prompt,
    isFoundational: foundationalFirst && i === 0,
  }));
}

export const QUESTION_LIBRARY: BehavioralQuestion[] = [
  ...q(
    'problem-solving',
    [
      'Tell me about a difficult problem you faced and how you solved it.',
      'Describe a time you had to analyze a complex issue with limited information.',
      'Tell me about a situation where your first solution did not work. What did you do next?',
      'Describe a time you identified the root cause of a recurring problem.',
      'Tell me about a creative or unconventional solution you came up with.',
    ],
    true,
  ),
  ...q(
    'conflict-resolution',
    [
      'Tell me about a conflict or disagreement with a coworker.',
      'Describe a time you disagreed with your manager. How did you handle it?',
      'Tell me about a time you had to work with someone difficult.',
      'Describe a situation where you had to mediate a disagreement between others.',
      'Tell me about a time you received critical feedback you disagreed with.',
    ],
    true,
  ),
  ...q(
    'failure-learning',
    [
      'Tell me about a failure or mistake and what you learned from it.',
      'Describe a time a project did not go as planned.',
      'Tell me about a goal you set but failed to reach.',
      'Describe a decision you made that you later regretted.',
      'Tell me about a time you received negative feedback and how you responded.',
    ],
    true,
  ),
  ...q('leadership', [
    'Tell me about a time you led a team or project.',
    'Describe a situation where you had to motivate others.',
    'Tell me about a time you had to make an unpopular decision.',
    'Describe how you delegated work on an important initiative.',
    'Tell me about a time you mentored or developed someone.',
  ]),
  ...q('teamwork', [
    'Tell me about a time you collaborated to achieve a shared goal.',
    'Describe a situation where you supported a struggling teammate.',
    'Tell me about a time you had to compromise for the good of the team.',
    'Describe how you contributed to a team with diverse perspectives.',
    'Tell me about a time you helped resolve a team bottleneck.',
  ]),
  ...q('ownership', [
    'Tell me about a time you took responsibility for a mistake.',
    'Describe a situation where you went beyond your defined role.',
    'Tell me about a time you owned a problem no one else would.',
    'Describe how you followed through on a commitment under pressure.',
    'Tell me about a time you took initiative without being asked.',
  ]),
  ...q('adaptability', [
    'Tell me about a time you had to adapt to a significant change.',
    'Describe a situation where priorities shifted suddenly.',
    'Tell me about a time you had to learn something new quickly.',
    'Describe how you handled ambiguity on a project.',
    'Tell me about a time you adjusted your approach based on new information.',
  ]),
  ...q('communication', [
    'Tell me about a time you explained a complex idea to a non-expert.',
    'Describe a situation where clear communication prevented a problem.',
    'Tell me about a time you had to deliver difficult news.',
    'Describe how you persuaded someone to your point of view.',
    'Tell me about a time a miscommunication caused an issue and how you fixed it.',
  ]),
  ...q('customer-focus', [
    'Tell me about a time you went above and beyond for a customer or user.',
    'Describe a situation where you balanced customer needs with business constraints.',
    'Tell me about a time you turned an unhappy customer around.',
    'Describe how you used customer feedback to improve something.',
    'Tell me about a time you advocated for the user in a decision.',
  ]),
  ...q('time-management', [
    'Tell me about a time you managed competing priorities.',
    'Describe a situation where you met a tight deadline.',
    'Tell me about a time you had to say no to protect your priorities.',
    'Describe how you organized a large or long-running task.',
    'Tell me about a time you recovered a project that was behind schedule.',
  ]),
];

export function questionsByCompetency(competency: Competency): BehavioralQuestion[] {
  return QUESTION_LIBRARY.filter((question) => question.competency === competency);
}

export function findQuestion(id: string): BehavioralQuestion | undefined {
  return QUESTION_LIBRARY.find((question) => question.id === id);
}

/** Realistic follow-up prompts used both as a fallback and for follow-up practice. */
export const GENERIC_FOLLOW_UPS: string[] = [
  'What was your specific personal contribution?',
  'How did you measure success?',
  'What would you do differently next time?',
  'What was the most difficult part?',
  'How did others respond?',
  'What did you learn from it?',
];
