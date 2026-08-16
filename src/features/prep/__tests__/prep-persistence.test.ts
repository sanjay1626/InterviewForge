import AsyncStorage from '@react-native-async-storage/async-storage';

import { CompositePrepRepository } from '../data/prep-repository';
import { assemblePackageLocally } from '../domain/package';

const GUEST_ID = 'guest-local-user';

const pkg = assemblePackageLocally(
  {
    jobTitle: 'QA Engineer',
    company: 'Globex',
    jobDescription: 'Required: Playwright and TypeScript. You will build automated tests.',
    interviewDate: null,
  },
  {
    skills: ['Playwright'],
    experiences: [
      { id: 'e1', company: 'Runestone Academy', title: 'QA Engineer', skills: ['Playwright'] },
    ],
  },
);

describe('prep persistence (guest, local)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('saves, lists, reopens, and deletes a package', async () => {
    const repo = new CompositePrepRepository(null);

    const saved = await repo.save(GUEST_ID, pkg);
    expect(saved.ok).toBe(true);
    const id = saved.ok ? saved.value : '';
    expect(id).toBeTruthy();

    const listed = await repo.list(GUEST_ID);
    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.value).toHaveLength(1);
      expect(listed.value[0]!.jobTitle).toBe('QA Engineer');
      expect(listed.value[0]!.company).toBe('Globex');
    }

    const reopened = await repo.get(GUEST_ID, id);
    expect(reopened.ok).toBe(true);
    if (reopened.ok && reopened.value) {
      // Round-trips losslessly, including the derived summary.
      expect(reopened.value.analysis.jobTitle).toBe('QA Engineer');
      expect(reopened.value.matches.length).toBe(pkg.matches.length);
      expect(reopened.value.summary.coverageScore).toBe(pkg.summary.coverageScore);
    }

    const removed = await repo.remove(GUEST_ID, id);
    expect(removed.ok).toBe(true);
    const afterDelete = await repo.list(GUEST_ID);
    expect(afterDelete.ok && afterDelete.value).toHaveLength(0);
  });

  it('returns null when reopening a missing id', async () => {
    const repo = new CompositePrepRepository(null);
    const res = await repo.get(GUEST_ID, 'does-not-exist');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value).toBeNull();
  });
});
