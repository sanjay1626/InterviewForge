import AsyncStorage from '@react-native-async-storage/async-storage';

import { CompositeFollowUpRepository } from '../data/follow-up-repository';

const GUEST_ID = 'guest-local-user';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('CompositeFollowUpRepository (guest, local)', () => {
  it('saves a follow-up answer locally', async () => {
    const repo = new CompositeFollowUpRepository(null);
    const result = await repo.save(GUEST_ID, {
      answerId: 'local-abc',
      prompt: 'What was your personal contribution?',
      response: 'I owned the database migration end to end.',
      overallScore: 72,
      feedback: 'Make the impact explicit.',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.overallScore).toBe(72);
    expect(result.value.prompt).toContain('personal contribution');
    expect(result.value.id).toBeTruthy();
  });
});
