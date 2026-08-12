import type { Project, WorkExperience } from '@/features/knowledge/domain/types';
import type { StarStory } from '@/features/stories/domain/types';
import {
  assembleLocalDraft,
  buildLocalRecall,
  emptyReflection,
} from '../domain/assistant';

const experience = (over: Partial<WorkExperience>): WorkExperience => ({
  id: over.id ?? 'e1',
  company: over.company ?? 'BlackArrow',
  title: over.title ?? 'QA Engineer',
  location: null,
  startDate: null,
  endDate: null,
  isCurrent: false,
  description: over.description ?? 'Owned regression testing for the warehouse app.',
  highlights: over.highlights ?? ['Cut escaped defects'],
  skills: over.skills ?? ['Playwright', 'Regression Testing'],
  createdAt: 't',
  updatedAt: 't',
});

const project = (over: Partial<Project>): Project => ({
  id: over.id ?? 'p1',
  name: over.name ?? 'RSVP Wedding App',
  role: null,
  description: over.description ?? 'A React + Supabase RSVP app.',
  highlights: [],
  skills: over.skills ?? ['React', 'Supabase'],
  link: null,
  startDate: null,
  endDate: null,
  createdAt: 't',
  updatedAt: 't',
});

const story = (over: Partial<StarStory>): StarStory => ({
  id: over.id ?? 's1',
  title: over.title ?? 'Rescued a deadline',
  situation: over.situation ?? 'The release was slipping.',
  task: null,
  action: null,
  result: null,
  lesson: null,
  skills: over.skills ?? ['Leadership'],
  competencies: [],
  company: null,
  project: null,
  tags: [],
  status: 'ready',
  createdAt: 't',
  updatedAt: 't',
});

describe('buildLocalRecall', () => {
  it('builds memory cards from the user records with stable refs', () => {
    const result = buildLocalRecall(
      {
        experiences: [experience({ id: 'e1' })],
        projects: [project({ id: 'p1' })],
        stories: [story({ id: 's1' })],
        profileSkills: ['Communication'],
      },
      'Tell me about a time you met a strict deadline.',
    );
    expect(result.source).toBe('local');
    expect(result.hasMemories).toBe(true);
    expect(result.memories.map((m) => m.ref)).toEqual(
      expect.arrayContaining(['exp:e1', 'proj:p1', 'story:s1']),
    );
    // chips are aggregated skills, deduped
    expect(result.chips).toEqual(expect.arrayContaining(['Playwright', 'React', 'Leadership', 'Communication']));
    // each card carries a coaching "why" and its own skills — never invented
    const exp = result.memories.find((m) => m.ref === 'exp:e1')!;
    expect(exp.whyRelevant).toContain('QA Engineer');
    expect(exp.skills).toEqual(['Playwright', 'Regression Testing']);
  });

  it('reports no memories when the user has no records', () => {
    const result = buildLocalRecall(
      { experiences: [], projects: [], stories: [], profileSkills: [] },
      'Q',
    );
    expect(result.hasMemories).toBe(false);
    expect(result.memories).toEqual([]);
  });
});

describe('assembleLocalDraft', () => {
  it('assembles the reflection in STAR order and brackets missing parts', () => {
    const result = assembleLocalDraft({
      ...emptyReflection(),
      challenge: 'The release was slipping two weeks out.',
      actions: 'I re-scoped and paired with QA daily.',
    });
    expect(result.source).toBe('local');
    expect(result.draft).toContain('The release was slipping two weeks out.');
    expect(result.draft).toContain('I re-scoped and paired with QA daily.');
    // empty fields become editable brackets, never invented
    expect(result.draft).toMatch(/\[Add the measurable result[^\]]*\]/);
    expect(result.missingInfo.length).toBeGreaterThan(0);
    // only the user's own words are cited
    expect(result.paragraphs.every((p) => p.sources.includes('Your reflection'))).toBe(true);
  });

  it('produces an all-bracket scaffold for an empty reflection (no fabrication)', () => {
    const result = assembleLocalDraft(emptyReflection());
    expect(result.paragraphs).toEqual([]);
    expect(result.draft.startsWith('[Add')).toBe(true);
    expect(result.missingInfo).toHaveLength(5);
  });
});
