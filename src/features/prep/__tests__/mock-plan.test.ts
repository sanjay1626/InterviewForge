import { defaultMockConfig } from '@/features/mock/domain/config';
import { assemblePackageLocally } from '../domain/package';
import { buildPlanFromPrep } from '../domain/mock-plan';

const pkg = assemblePackageLocally(
  {
    jobTitle: 'Senior QA Engineer',
    company: 'Globex',
    jobDescription: `Required: Playwright, TypeScript, REST APIs.
You will build automated test suites and mentor junior engineers.
Strong communication skills required.`,
    interviewDate: null,
  },
  {
    skills: ['Playwright', 'TypeScript'],
    experiences: [
      {
        id: 'exp-1',
        company: 'Runestone Academy',
        title: 'QA Engineer',
        description: 'Built Playwright automation.',
        skills: ['Playwright', 'TypeScript'],
      },
    ],
  },
);

describe('buildPlanFromPrep', () => {
  it('opens with an opening question and respects the length', () => {
    const config = { ...defaultMockConfig('QA Engineer'), length: 'standard' as const };
    const plan = buildPlanFromPrep(pkg, config);
    expect(plan.length).toBe(5); // standard = 5
    expect(plan[0]!.kind).toBe('opening');
  });

  it('draws its questions from the prep package (prioritized), not the generic library', () => {
    const config = { ...defaultMockConfig('QA Engineer'), length: 'standard' as const };
    const plan = buildPlanFromPrep(pkg, config);
    const prepPrompts = new Set(pkg.questions.map((q) => q.prompt.trim()));
    const nonOpening = plan.slice(1);
    // Every non-opening question should be one of the prep questions.
    expect(nonOpening.every((q) => prepPrompts.has(q.prompt.trim()))).toBe(true);
  });

  it('reserves a closing question for full-length interviews', () => {
    const config = { ...defaultMockConfig('QA Engineer'), length: 'full' as const };
    const plan = buildPlanFromPrep(pkg, config);
    expect(plan.length).toBe(8);
    expect(plan[plan.length - 1]!.kind).toBe('closing');
  });

  it('produces no duplicate prompts', () => {
    const config = { ...defaultMockConfig('QA Engineer'), length: 'full' as const };
    const plan = buildPlanFromPrep(pkg, config);
    const prompts = plan.map((q) => q.prompt.trim());
    expect(new Set(prompts).size).toBe(prompts.length);
  });
});
