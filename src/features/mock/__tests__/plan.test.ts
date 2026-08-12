import {
  defaultMockConfig,
  estimatedMinutes,
  questionCountFor,
} from '../domain/config';
import { buildInterviewPlan } from '../domain/plan';

const ctx = {
  weakCompetencies: ['leadership', 'communication'] as const,
  hasResume: true,
  roleTitle: 'Backend Engineer',
};

describe('config presets', () => {
  it('maps length to question counts and estimates', () => {
    expect(questionCountFor('quick')).toBe(3);
    expect(questionCountFor('standard')).toBe(5);
    expect(questionCountFor('full')).toBe(8);
    expect(estimatedMinutes('quick')).toBeGreaterThan(0);
  });
});

describe('buildInterviewPlan', () => {
  it('produces exactly the configured number of questions', () => {
    for (const length of ['quick', 'standard', 'full'] as const) {
      const plan = buildInterviewPlan(
        { ...defaultMockConfig('SWE'), length },
        { ...ctx, weakCompetencies: [...ctx.weakCompetencies] },
      );
      expect(plan).toHaveLength(questionCountFor(length));
      expect(new Set(plan.map((q) => q.id)).size).toBe(plan.length); // no dup questions
    }
  });

  it('opens with an opening question and includes a resume slot for mixed/resume', () => {
    const plan = buildInterviewPlan(
      { ...defaultMockConfig('SWE'), type: 'mixed', length: 'full' },
      { ...ctx, weakCompetencies: [...ctx.weakCompetencies] },
    );
    expect(plan[0]?.kind).toBe('opening');
    expect(plan.some((q) => q.kind === 'resume')).toBe(true);
    expect(plan[plan.length - 1]?.kind).toBe('closing');
  });

  it('behavioral type skips the resume deep-dive', () => {
    const plan = buildInterviewPlan(
      { ...defaultMockConfig('SWE'), type: 'behavioral', length: 'standard' },
      { ...ctx, weakCompetencies: [...ctx.weakCompetencies] },
    );
    expect(plan.some((q) => q.kind === 'resume')).toBe(false);
  });

  it('includes a weak-area question from the user’s weakest competency', () => {
    const plan = buildInterviewPlan(
      { ...defaultMockConfig('SWE'), type: 'behavioral', length: 'standard' },
      { weakCompetencies: ['leadership'], hasResume: false, roleTitle: 'SWE' },
    );
    const weak = plan.find((q) => q.kind === 'weak');
    expect(weak?.competency).toBe('leadership');
  });
});
