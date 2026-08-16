import { analyzeJobDescription } from '../domain/job-analysis';

const JD = `Senior QA Engineer

Required: Playwright, TypeScript, and REST APIs.
Preferred: SQL is a nice to have.
You will build automated test suites and mentor junior engineers.
Strong communication skills are required.
Bachelor's degree in Computer Science required.`;

describe('analyzeJobDescription', () => {
  it('extracts the job title and detects seniority', () => {
    const a = analyzeJobDescription(JD, { jobTitle: 'Senior QA Engineer' });
    expect(a.jobTitle).toBe('Senior QA Engineer');
    expect(a.seniority).toBe('senior');
  });

  it('detects technologies mentioned in the JD', () => {
    const a = analyzeJobDescription(JD, { jobTitle: 'QA Engineer' });
    expect(a.technologies).toEqual(
      expect.arrayContaining(['playwright', 'typescript', 'sql']),
    );
  });

  it('produces weighted requirements, with preferred skills weighted lower', () => {
    const a = analyzeJobDescription(JD, { jobTitle: 'QA Engineer' });
    const playwright = a.requirements.find((r) => r.text === 'playwright');
    const sql = a.requirements.find((r) => r.text === 'sql');
    expect(playwright).toBeDefined();
    expect(sql).toBeDefined();
    // "nice to have" SQL should be less important than a required technology.
    expect(sql!.importance).toBeLessThan(playwright!.importance);
  });

  it('maps behavioral cues to competencies', () => {
    const a = analyzeJobDescription(JD, { jobTitle: 'QA Engineer' });
    expect(a.behavioralCompetencies).toEqual(
      expect.arrayContaining(['communication', 'leadership']),
    );
  });

  it('is safe on empty input', () => {
    const a = analyzeJobDescription('', {});
    expect(a.requirements).toEqual([]);
    expect(a.technologies).toEqual([]);
  });
});
