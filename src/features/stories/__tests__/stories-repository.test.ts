import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Tables } from '@/core/supabase/database.types';
import { mapStoryRow, storyToInsert } from '../data/mappers';
import { createStoryRepository } from '../data/repositories';
import type { StarStoryInput } from '../domain/types';

const GUEST_ID = 'guest-local-user';

const input: StarStoryInput = {
  title: 'Rescued a launch',
  situation: 'Release slipping.',
  task: 'Owned checkout.',
  action: 'Re-scoped and paired with QA.',
  result: 'Shipped on time.',
  lesson: 'Cut scope early.',
  skills: ['prioritization'],
  competencies: ['ownership'],
  company: 'Acme',
  project: 'Checkout v2',
  tags: ['launch'],
  status: 'ready',
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('story mappers', () => {
  it('storyToInsert trims, nulls blanks, and clamps status', () => {
    const row = storyToInsert('u1', { ...input, result: '' });
    expect(row.result).toBeNull();
    expect(row.status).toBe('needs_details'); // ready downgraded (result missing)
    expect(row.company).toBe('Acme');
  });

  it('mapStoryRow filters invalid competencies', () => {
    const row = {
      id: 's1',
      user_id: 'u1',
      title: 'T',
      situation: null,
      task: null,
      action: null,
      result: null,
      lesson: null,
      skills: [],
      competencies: ['ownership', 'bogus'],
      company: null,
      project: null,
      tags: [],
      status: 'draft',
      created_at: 't',
      updated_at: 't',
    } as Tables<'star_stories'>;
    expect(mapStoryRow(row).competencies).toEqual(['ownership']);
  });
});

describe('guest story repository (via composite, no backend)', () => {
  it('creates and clamps an incomplete ready story to needs_details', async () => {
    const repo = createStoryRepository(null);
    const created = await repo.create(GUEST_ID, { ...input, action: '' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value.status).toBe('needs_details');
    expect(created.value.competencies).toEqual(['ownership']);
  });

  it('persists a complete ready story and lists it', async () => {
    const repo = createStoryRepository(null);
    const created = await repo.create(GUEST_ID, input);
    expect(created.ok && created.value.status).toBe('ready');

    const listed = await repo.list(GUEST_ID);
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.value).toHaveLength(1);
    expect(listed.value[0]?.title).toBe('Rescued a launch');
  });
});
