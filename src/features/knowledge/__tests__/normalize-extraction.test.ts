import {
  isEmptyExtraction,
  normalizeExtraction,
} from '../data/normalize-extraction';

describe('normalizeExtraction', () => {
  it('maps a well-formed payload into typed candidates', () => {
    const result = normalizeExtraction({
      experiences: [
        {
          company: '  Acme  ',
          title: 'Engineer',
          location: 'Remote',
          startDate: 'Jan 2022',
          endDate: '',
          isCurrent: true,
          description: 'Built things',
          highlights: ['Shipped X', 'Shipped Y'],
          skills: ['TypeScript', 'typescript'], // dedupe, case-insensitive
        },
      ],
      projects: [{ name: 'Portfolio', role: 'Solo', skills: ['React'] }],
      skills: ['SQL', ' ', 'SQL'],
      certifications: ['PMP'],
    });

    expect(result.experiences).toHaveLength(1);
    expect(result.experiences[0]?.company).toBe('Acme');
    expect(result.experiences[0]?.isCurrent).toBe(true);
    expect(result.experiences[0]?.skills).toEqual(['TypeScript']);
    expect(result.projects[0]?.name).toBe('Portfolio');
    // missing fields become empty strings, never invented
    expect(result.projects[0]?.description).toBe('');
    expect(result.projects[0]?.link).toBe('');
    expect(result.skills).toEqual(['SQL']);
    expect(result.certifications).toEqual(['PMP']);
  });

  it('drops unusable rows and survives malformed input', () => {
    const result = normalizeExtraction({
      experiences: [{ location: 'Nowhere' }, null, 'nope'],
      projects: [{ role: 'no name' }],
      skills: 'not-an-array',
      certifications: null,
    });
    expect(result.experiences).toEqual([]); // no company/title → unusable
    expect(result.projects).toEqual([]); // no name → unusable
    expect(result.skills).toEqual([]);
    expect(result.certifications).toEqual([]);
    expect(isEmptyExtraction(result)).toBe(true);
  });

  it('coerces non-boolean isCurrent to false (never assumes ongoing)', () => {
    const result = normalizeExtraction({
      experiences: [{ company: 'Acme', title: 'Eng', isCurrent: 'yes' }],
    });
    expect(result.experiences[0]?.isCurrent).toBe(false);
  });

  it('caps list sizes and string lengths', () => {
    const many = Array.from({ length: 200 }, (_, i) => ({
      company: `Co${i}`,
      title: 'T',
    }));
    const result = normalizeExtraction({
      experiences: many,
      skills: Array.from({ length: 200 }, (_, i) => `skill-${i}`),
    });
    expect(result.experiences.length).toBeLessThanOrEqual(25);
    expect(result.skills.length).toBeLessThanOrEqual(60);
  });
});
