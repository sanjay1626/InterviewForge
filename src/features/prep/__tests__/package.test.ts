import { assemblePackageLocally, type PrepInput } from '../domain/package';
import type { CandidateSources } from '../domain/evidence';

const INPUT: PrepInput = {
  jobTitle: 'Senior QA Engineer',
  company: 'Globex',
  jobDescription: `Required: Playwright, TypeScript, REST APIs.
Preferred: SQL.
You will build automated test suites and mentor junior engineers.
Strong communication skills required.`,
  interviewDate: null,
};

const SOURCES: CandidateSources = {
  skills: ['Playwright', 'TypeScript'],
  experiences: [
    {
      id: 'exp-1',
      company: 'Runestone Academy',
      title: 'QA Engineer',
      description: 'Built and owned Playwright automation for web applications.',
      highlights: ['Delivered a regression suite that shipped with every release'],
      skills: ['Playwright', 'TypeScript'],
    },
  ],
  projects: [
    {
      id: 'proj-1',
      name: 'Test Dashboard',
      role: 'Lead',
      description: 'Led a small team to build an internal flaky-test dashboard.',
      skills: ['TypeScript'],
    },
  ],
};

describe('assemblePackageLocally', () => {
  const pkg = assemblePackageLocally(INPUT, SOURCES);

  it('assembles a complete, offline-sourced package', () => {
    expect(pkg.source).toBe('offline');
    expect(pkg.analysis.requirements.length).toBeGreaterThan(0);
    expect(pkg.matches.length).toBe(pkg.analysis.requirements.length);
    expect(pkg.questions.length).toBeGreaterThan(0);
    expect(pkg.studyTopics.length).toBeGreaterThan(0);
    expect(pkg.readiness.length).toBe(4);
  });

  it('ranks questions with high-priority items first', () => {
    const priorities = pkg.questions.map((q) => q.priority);
    const firstBonus = priorities.indexOf('bonus');
    const lastHigh = priorities.lastIndexOf('high');
    if (firstBonus !== -1 && lastHigh !== -1) {
      expect(lastHigh).toBeLessThan(firstBonus);
    }
    expect(pkg.questions.some((q) => q.priority === 'high')).toBe(true);
  });

  it('generates study topics as general knowledge, tied to the job not the candidate', () => {
    const sql = pkg.studyTopics.find((t) => t.topic.toLowerCase() === 'sql');
    expect(sql).toBeDefined();
    // Copy frames it as something the interviewer may probe — never "you know SQL".
    expect(sql!.whyItMatters.toLowerCase()).toContain('job description');
  });

  it('produces Needs-Your-Input questions for gaps instead of fabricating', () => {
    expect(pkg.needsInput.length).toBeGreaterThan(0);
    for (const n of pkg.needsInput) {
      expect(n.question.trim().length).toBeGreaterThan(0);
      expect(n.evidenceHint.trim().length).toBeGreaterThan(0);
    }
  });

  it('discovers suggested STAR stories from verified experience', () => {
    expect(pkg.suggestedStories.length).toBeGreaterThan(0);
    for (const s of pkg.suggestedStories) {
      expect(s.competencies.length).toBeGreaterThan(0);
      expect(s.evidenceSource.trim().length).toBeGreaterThan(0);
    }
  });

  it('computes explainable readiness with improvement actions', () => {
    const categories = pkg.readiness.map((r) => r.category).sort();
    expect(categories).toEqual(['behavioral', 'job_coverage', 'resume', 'technical']);
    for (const r of pkg.readiness) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(r.explanation.length).toBeGreaterThan(0);
      expect(r.actions.length).toBeGreaterThan(0);
    }
  });

  it('does not fabricate qualifications the candidate lacks', () => {
    const restApis = pkg.matches.find((m) => m.requirement.text.includes('rest'));
    if (restApis) {
      expect(restApis.status).toBe('none');
      expect(restApis.evidence).toEqual([]);
    }
    // Behavioral readiness starts low with zero practiced answers.
    const behavioral = pkg.readiness.find((r) => r.category === 'behavioral');
    expect(behavioral!.score).toBeLessThan(50);
  });

  it('reflects practice progress in behavioral readiness', () => {
    const withPractice = assemblePackageLocally(INPUT, SOURCES, { answeredCount: 5 });
    const before = pkg.readiness.find((r) => r.category === 'behavioral')!.score;
    const after = withPractice.readiness.find((r) => r.category === 'behavioral')!.score;
    expect(after).toBeGreaterThan(before);
  });

  it('handles an empty profile without crashing (new user, no resume yet)', () => {
    const empty = assemblePackageLocally(INPUT, {});
    expect(empty.matches.every((m) => m.status === 'none')).toBe(true);
    expect(empty.suggestedStories).toEqual([]);
    expect(empty.needsInput.length).toBeGreaterThan(0);
  });
});
