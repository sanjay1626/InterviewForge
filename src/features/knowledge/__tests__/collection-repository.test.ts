import AsyncStorage from '@react-native-async-storage/async-storage';

import type { WorkExperienceInput } from '../domain/types';
import { GuestDocumentRepository } from '../data/guest-document-repository';
import { createExperienceRepository } from '../data/repositories';

const GUEST_ID = 'guest-local-user';

const input: WorkExperienceInput = {
  company: 'Acme',
  title: 'Engineer',
  location: '',
  startDate: '2022-01',
  endDate: '',
  isCurrent: true,
  description: 'Did work',
  highlights: ['Shipped a feature'],
  skills: ['TypeScript'],
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('guest collection repository (via composite, no backend)', () => {
  it('creates, lists, updates, and removes experiences locally', async () => {
    const repo = createExperienceRepository(null);

    const created = await repo.create(GUEST_ID, input);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const id = created.value.id;
    expect(created.value.company).toBe('Acme');
    expect(created.value.endDate).toBeNull(); // current role

    const listed = await repo.list(GUEST_ID);
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.value).toHaveLength(1);

    const updated = await repo.update(GUEST_ID, id, {
      ...input,
      title: 'Senior Engineer',
    });
    expect(updated.ok && updated.value.title).toBe('Senior Engineer');
    if (updated.ok) {
      // createdAt preserved, updatedAt refreshed
      expect(updated.value.createdAt).toBe(created.value.createdAt);
    }

    const removed = await repo.remove(GUEST_ID, id);
    expect(removed.ok).toBe(true);

    const after = await repo.list(GUEST_ID);
    expect(after.ok && after.value).toHaveLength(0);
  });

  it('update returns not-found for a missing id', async () => {
    const repo = createExperienceRepository(null);
    const result = await repo.update(GUEST_ID, 'nope', input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not-found');
  });
});

describe('guest document repository', () => {
  it('lists empty and blocks upload without an account', async () => {
    const repo = new GuestDocumentRepository();

    const list = await repo.list();
    expect(list.ok && list.value).toEqual([]);

    const upload = await repo.uploadResume();
    expect(upload.ok).toBe(false);
    if (upload.ok) return;
    expect(upload.error.code).toBe('auth/not-configured');
  });
});
