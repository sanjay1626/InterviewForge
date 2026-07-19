import {
  assembleNarrative,
  clampStatus,
  estimateSpokenSeconds,
  isReadyEligible,
  missingStarParts,
} from '../domain/star-helpers';
import type { StarStoryInput } from '../domain/types';

const base: StarStoryInput = {
  title: 'Rescued a launch',
  situation: 'Our release was slipping two weeks before launch.',
  task: 'I owned the checkout flow and had to hit the date.',
  action: 'I re-scoped the work and paired with QA daily.',
  result: 'We shipped on time with no P1 bugs.',
  lesson: 'Early scope cuts beat late heroics.',
  skills: [],
  competencies: [],
  company: '',
  project: '',
  tags: [],
  status: 'ready',
};

describe('missingStarParts / isReadyEligible', () => {
  it('reports all four parts present', () => {
    expect(missingStarParts(base)).toEqual([]);
    expect(isReadyEligible(base)).toBe(true);
  });

  it('flags empty parts and blanks-only as missing', () => {
    const partial = { ...base, action: '', result: '   ' };
    const missing = missingStarParts(partial).map((m) => m.key);
    expect(missing).toEqual(['action', 'result']);
    expect(isReadyEligible(partial)).toBe(false);
  });
});

describe('clampStatus', () => {
  it('downgrades ready to needs_details when incomplete', () => {
    expect(clampStatus('ready', { ...base, result: '' })).toBe('needs_details');
  });
  it('keeps ready when complete', () => {
    expect(clampStatus('ready', base)).toBe('ready');
  });
  it('passes through non-ready statuses untouched', () => {
    expect(clampStatus('draft', { ...base, result: '' })).toBe('draft');
  });
});

describe('assembleNarrative', () => {
  it('joins only the user words in STAR+lesson order and adds nothing', () => {
    const narrative = assembleNarrative(base);
    expect(narrative).toBe(
      'Our release was slipping two weeks before launch. ' +
        'I owned the checkout flow and had to hit the date. ' +
        'I re-scoped the work and paired with QA daily. ' +
        'We shipped on time with no P1 bugs. ' +
        'Early scope cuts beat late heroics.',
    );
  });

  it('skips empty sections and collapses whitespace', () => {
    const narrative = assembleNarrative({
      situation: 'A.',
      task: '',
      action: '  B.  ',
      result: '',
      lesson: '',
    });
    expect(narrative).toBe('A. B.');
  });

  it('estimateSpokenSeconds grows with length', () => {
    expect(estimateSpokenSeconds('')).toBe(0);
    expect(estimateSpokenSeconds(assembleNarrative(base))).toBeGreaterThan(0);
  });
});
