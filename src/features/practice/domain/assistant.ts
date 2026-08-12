import type { Competency } from '@/core/domain/competencies';
import type { Project, WorkExperience } from '@/features/knowledge/domain/types';
import type { StarStory } from '@/features/stories/domain/types';

/**
 * Blank Page Assistant — helps the user *recall* their own experience before
 * writing, and (only after reflection) assembles a draft from retrieved facts.
 * It is a coach, not a ghostwriter: nothing here invents experiences, metrics,
 * or outcomes.
 */

export type MemoryType = 'experience' | 'project' | 'story' | 'resume' | 'answer';

/** A retrieved memory shown in the Recall panel. `ref` ties it to a real record. */
export interface MemoryCard {
  ref: string; // exp:<id> | proj:<id> | story:<id> | resume | answer:<id>
  type: MemoryType;
  title: string;
  whyRelevant: string;
  situationSummary: string;
  skills: string[];
  sourceLabel: string;
}

export interface RecallResult {
  hasMemories: boolean;
  memories: MemoryCard[];
  chips: string[];
  source: 'ai' | 'local';
}

export interface ReflectionAnswers {
  responsibility: string;
  challenge: string;
  actions: string;
  result: string;
  learned: string;
}

export function emptyReflection(): ReflectionAnswers {
  return { responsibility: '', challenge: '', actions: '', result: '', learned: '' };
}

export const REFLECTION_QUESTIONS: {
  key: keyof ReflectionAnswers;
  prompt: string;
}[] = [
  { key: 'challenge', prompt: 'What challenge did you personally face?' },
  { key: 'responsibility', prompt: 'What was your specific responsibility?' },
  { key: 'actions', prompt: 'What actions did you take?' },
  { key: 'result', prompt: 'What measurable result occurred?' },
  { key: 'learned', prompt: 'What did you learn?' },
];

export interface DraftParagraph {
  text: string;
  sources: string[]; // refs, e.g. ['story:uuid', 'resume']
}

export interface DraftResult {
  draft: string;
  paragraphs: DraftParagraph[];
  missingInfo: string[];
  source: 'ai' | 'local';
}

const SOURCE_LABELS: Record<MemoryType, string> = {
  experience: 'Work experience',
  project: 'Project',
  story: 'STAR story',
  resume: 'Resume',
  answer: 'Previous answer',
};

export function sourceLabelFor(type: MemoryType): string {
  return SOURCE_LABELS[type];
}

function firstSentence(text: string | null | undefined, max = 180): string {
  if (!text) return '';
  const trimmed = text.trim();
  const cut = trimmed.split(/(?<=[.!?])\s/)[0] ?? trimmed;
  return cut.length > max ? cut.slice(0, max) + '…' : cut;
}

/**
 * Build memory cards directly from the user's own records — no AI. Used as the
 * offline/guest fallback and as the always-available base. `question` keywords
 * lightly rank cards whose skills/text overlap the question.
 */
export function buildLocalRecall(
  input: {
    experiences: WorkExperience[];
    projects: Project[];
    stories: StarStory[];
    profileSkills: string[];
  },
  questionText: string,
): RecallResult {
  const qWords = new Set(
    questionText
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z]/g, ''))
      .filter((w) => w.length > 4),
  );
  const overlap = (haystack: string): number => {
    const words = haystack.toLowerCase().split(/\s+/);
    return words.filter((w) => qWords.has(w.replace(/[^a-z]/g, ''))).length;
  };

  const cards: (MemoryCard & { score: number })[] = [];

  for (const e of input.experiences) {
    cards.push({
      ref: `exp:${e.id}`,
      type: 'experience',
      title: `${e.title}${e.company ? ` · ${e.company}` : ''}`,
      whyRelevant: `Draws on your role as ${e.title}${e.company ? ` at ${e.company}` : ''}.`,
      situationSummary: firstSentence(e.description || e.highlights[0] || ''),
      skills: e.skills,
      sourceLabel: SOURCE_LABELS.experience,
      score: overlap(`${e.title} ${e.company} ${e.description ?? ''} ${e.skills.join(' ')} ${e.highlights.join(' ')}`),
    });
  }
  for (const p of input.projects) {
    cards.push({
      ref: `proj:${p.id}`,
      type: 'project',
      title: p.name,
      whyRelevant: `Based on your ${p.name} project.`,
      situationSummary: firstSentence(p.description || p.highlights[0] || ''),
      skills: p.skills,
      sourceLabel: SOURCE_LABELS.project,
      score: overlap(`${p.name} ${p.description ?? ''} ${p.skills.join(' ')} ${p.highlights.join(' ')}`),
    });
  }
  for (const s of input.stories) {
    cards.push({
      ref: `story:${s.id}`,
      type: 'story',
      title: s.title,
      whyRelevant: `Your STAR story “${s.title}”.`,
      situationSummary: firstSentence(s.situation || s.task || ''),
      skills: s.skills,
      sourceLabel: SOURCE_LABELS.story,
      score:
        overlap(`${s.title} ${s.situation ?? ''} ${s.task ?? ''} ${s.action ?? ''} ${s.skills.join(' ')}`) +
        1, // stories are already interview-ready → slight boost
    });
  }

  cards.sort((a, b) => b.score - a.score);

  const chips = Array.from(
    new Set(
      [
        ...input.experiences.flatMap((e) => e.skills),
        ...input.projects.flatMap((p) => p.skills),
        ...input.stories.flatMap((s) => s.skills),
        ...input.profileSkills,
      ]
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ).slice(0, 14);

  return {
    hasMemories: cards.length > 0,
    memories: cards.map(({ score: _score, ...card }) => card),
    chips,
    source: 'local',
  };
}

/**
 * Deterministic draft assembled purely from the user's reflection answers, in
 * STAR order. Empty fields become editable [brackets] — never invented content.
 */
export function assembleLocalDraft(reflection: ReflectionAnswers): DraftResult {
  const order: { key: keyof ReflectionAnswers; prompt: string }[] = [
    { key: 'challenge', prompt: 'the situation you faced' },
    { key: 'responsibility', prompt: 'your specific responsibility' },
    { key: 'actions', prompt: 'the actions you took' },
    { key: 'result', prompt: 'the measurable result' },
    { key: 'learned', prompt: 'what you learned' },
  ];

  const paragraphs: DraftParagraph[] = [];
  const missingInfo: string[] = [];

  for (const { key, prompt } of order) {
    const value = reflection[key].trim();
    if (value) {
      paragraphs.push({ text: value, sources: ['Your reflection'] });
    } else {
      missingInfo.push(prompt);
    }
  }

  const draftParts = order.map(({ key, prompt }) => {
    const value = reflection[key].trim();
    return value || `[Add ${prompt}]`;
  });

  return {
    draft: draftParts.join(' ').replace(/\s+/g, ' ').trim(),
    paragraphs,
    missingInfo,
    source: 'local',
  };
}

export interface AssistantDraftInput {
  questionText: string;
  competency: Competency | null;
  chips: string[];
  refs: string[];
  reflection: ReflectionAnswers;
}
