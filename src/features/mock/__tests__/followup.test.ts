import { decideFollowUp } from '../domain/followup';

const LONG_COMPLETE =
  'At my company I owned the migration. I profiled the queries, I rewrote the ' +
  'slow ones, and I added indexes. As a result we reduced latency by 40% and I ' +
  'learned to measure before optimizing. The hardest part was the rollout.';

describe('decideFollowUp', () => {
  it('asks for clarification on very short answers', () => {
    expect(decideFollowUp('We did it.', 0, 'realistic').action).toBe('clarify');
  });

  it('probes personal contribution when ownership is unclear', () => {
    const answer =
      'We had a really big project last quarter and we all worked together as a ' +
      'team to get it done, and we coordinated across several groups, and we kept ' +
      'going after a lot of late nights and back and forth with the other people ' +
      'and teams that were involved in the whole effort from start to finish.';
    expect(decideFollowUp(answer, 0, 'realistic').action).toBe('contribution');
  });

  it('asks for the result when no outcome is present', () => {
    const answer =
      'I took the lead on the redesign of the onboarding flow for our mobile app, ' +
      'and I coordinated closely with the design team, and I personally built the ' +
      'new screens myself, and I carefully handled all of the tricky edge cases ' +
      'and states that came up throughout the whole process from beginning to end.';
    expect(decideFollowUp(answer, 0, 'realistic').action).toBe('result');
  });

  it('stops (none) once a complete answer is given at realistic difficulty', () => {
    expect(decideFollowUp(LONG_COMPLETE, 0, 'realistic').action).toBe('none');
  });

  it('respects the per-question follow-up limit by difficulty', () => {
    // supportive & realistic allow 1; challenging allows 2
    expect(decideFollowUp('We did it.', 1, 'supportive').action).toBe('none');
    expect(decideFollowUp('We did it.', 1, 'realistic').action).toBe('none');
    expect(decideFollowUp('We did it.', 1, 'challenging').action).not.toBe('none');
    expect(decideFollowUp('We did it.', 2, 'challenging').action).toBe('none');
  });
});
