import { buildCandidateProfile, type CandidateSources } from '../domain/evidence';
import { analyzeJobDescription } from '../domain/job-analysis';
import { matchRequirements, summarizeMatches } from '../domain/matching';

const SOURCES: CandidateSources = {
  skills: ['Playwright', 'TypeScript'],
  experiences: [
    {
      id: 'exp-1',
      company: 'Runestone Academy',
      title: 'QA Engineer',
      description: 'Built Playwright automation for web applications.',
      highlights: ['Automated the regression suite with Playwright and TypeScript'],
      skills: ['Playwright', 'TypeScript'],
    },
  ],
};

const JD = `Required: Playwright, TypeScript, REST APIs. Preferred: SQL.`;

function build() {
  const profile = buildCandidateProfile(SOURCES);
  const analysis = analyzeJobDescription(JD, { jobTitle: 'QA Engineer' });
  const matches = matchRequirements(analysis.requirements, profile);
  return { profile, analysis, matches };
}

describe('requirement matching', () => {
  it('marks a listed skill as a STRONG match with a rationale', () => {
    const { matches } = build();
    const playwright = matches.find((m) => m.requirement.text === 'playwright');
    expect(playwright?.status).toBe('strong');
    expect(playwright?.rationale.length).toBeGreaterThan(0);
  });

  it('marks a requirement with no verified evidence as NONE (a gap)', () => {
    const { matches } = build();
    const sql = matches.find((m) => m.requirement.text === 'sql');
    expect(sql?.status).toBe('none');
    // Grounding: a gap carries no evidence — nothing is invented.
    expect(sql?.evidence).toEqual([]);
  });

  it('never turns a job requirement into a candidate skill', () => {
    const { profile } = build();
    // The JD asks for SQL and REST APIs, but the candidate never listed them.
    expect(profile.skills).not.toContain('sql');
    expect(profile.skills).not.toContain('rest apis');
    // Only the user's own skills are present.
    expect(profile.skills).toEqual(
      expect.arrayContaining(['playwright', 'typescript']),
    );
  });

  it('summarizes matches into a weighted coverage score', () => {
    const { matches } = build();
    const summary = summarizeMatches(matches);
    expect(summary.strong.length).toBeGreaterThan(0);
    expect(summary.gaps.length).toBeGreaterThan(0);
    expect(summary.coverageScore).toBeGreaterThan(0);
    expect(summary.coverageScore).toBeLessThan(100);
  });

  it('recognizes evidence-backed partial matches without a listed skill', () => {
    // "automation" appears in the candidate's experience text but is not a listed skill.
    const profile = buildCandidateProfile({
      experiences: [
        {
          company: 'Acme',
          title: 'Engineer',
          description: 'Owned end-to-end automation for the CI pipeline.',
          skills: [],
        },
      ],
    });
    const analysis = analyzeJobDescription('You will build automation for pipelines.', {
      jobTitle: 'Engineer',
    });
    const matches = matchRequirements(analysis.requirements, profile);
    // At least one requirement should find partial/strong evidence, none fabricated.
    expect(matches.some((m) => m.status !== 'none')).toBe(true);
  });
});
