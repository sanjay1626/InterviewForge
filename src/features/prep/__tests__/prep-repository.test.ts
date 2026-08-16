import type { TypedSupabaseClient } from '@/core/supabase/client';
import { CompositePrepRepository, type GeneratePrepInput } from '../data/prep-repository';

const CLOUD_ID = 'user-123';
const GUEST_ID = 'guest-local-user';

const BASE: GeneratePrepInput = {
  input: {
    jobTitle: 'QA Engineer',
    company: 'Globex',
    jobDescription: 'Required: Playwright and TypeScript. You will build automated tests.',
    interviewDate: null,
  },
  sources: {
    skills: ['Playwright', 'TypeScript'],
    experiences: [
      {
        id: 'exp-1',
        company: 'Runestone Academy',
        title: 'QA Engineer',
        description: 'Built Playwright automation.',
        highlights: ['Owned the regression suite'],
        skills: ['Playwright', 'TypeScript'],
      },
    ],
  },
};

/** Minimal fake client whose functions.invoke returns a scripted response. */
function fakeClient(
  impl: () => Promise<{ data: unknown; error: unknown }>,
): TypedSupabaseClient {
  return {
    functions: { invoke: (_name: string, _opts: unknown) => impl() },
  } as unknown as TypedSupabaseClient;
}

describe('CompositePrepRepository', () => {
  it('produces an offline package for guest users (no cloud call)', async () => {
    let called = false;
    const repo = new CompositePrepRepository(
      fakeClient(async () => {
        called = true;
        return { data: null, error: null };
      }),
    );
    const res = await repo.generate(GUEST_ID, BASE);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.source).toBe('offline');
      expect(res.value.matches.length).toBeGreaterThan(0);
    }
    expect(called).toBe(false);
  });

  it('produces an offline package when there is no client at all', async () => {
    const repo = new CompositePrepRepository(null);
    const res = await repo.generate(CLOUD_ID, BASE);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.source).toBe('offline');
  });

  it('falls back to offline when the function errors (e.g. no API key / 501)', async () => {
    const repo = new CompositePrepRepository(
      fakeClient(async () => ({ data: null, error: { message: 'not configured' } })),
    );
    const res = await repo.generate(CLOUD_ID, BASE);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.source).toBe('offline');
  });

  it('uses the AI analysis + answers on success, still matching in the pure domain', async () => {
    const repo = new CompositePrepRepository(
      fakeClient(async () => ({
        data: {
          analysis: {
            jobTitle: 'Senior QA Engineer',
            seniority: 'senior',
            technologies: ['playwright', 'typescript'],
            behavioralCompetencies: ['problem-solving'],
            requirements: [
              { category: 'technology', text: 'Playwright', keywords: ['playwright'], importance: 5 },
              { category: 'required_skill', text: 'SQL', keywords: ['sql'], importance: 4 },
            ],
          },
          answers: [
            {
              questionText: 'Tell me about your automation work.',
              answer: 'At Runestone Academy I built Playwright automation. [add a metric]',
              sources: ['exp:exp-1'],
              missingInfo: ['A measurable result'],
            },
          ],
          source: 'ai',
        },
        error: null,
      })),
    );
    const res = await repo.generate(CLOUD_ID, BASE);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const pkg = res.value;
    expect(pkg.source).toBe('ai');
    expect(pkg.analysis.jobTitle).toBe('Senior QA Engineer');
    // Matching still runs in the pure domain against verified evidence:
    const playwright = pkg.matches.find((m) => m.requirement.text.toLowerCase() === 'playwright');
    const sql = pkg.matches.find((m) => m.requirement.text.toLowerCase() === 'sql');
    expect(playwright?.status).toBe('strong'); // listed skill
    expect(sql?.status).toBe('none'); // JD asks for it, candidate lacks it → gap, not fabricated
    expect(pkg.answers.length).toBe(1);
    expect(pkg.answers[0]!.answer).toContain('[add a metric]');
  });

  it('ignores an empty AI analysis and uses the offline analysis instead', async () => {
    const repo = new CompositePrepRepository(
      fakeClient(async () => ({
        data: { analysis: { requirements: [] }, answers: [], source: 'ai' },
        error: null,
      })),
    );
    const res = await repo.generate(CLOUD_ID, BASE);
    expect(res.ok).toBe(true);
    // source stays 'ai' (cloud responded) but requirements come from the offline analyzer.
    if (res.ok) expect(res.value.matches.length).toBeGreaterThan(0);
  });
});
