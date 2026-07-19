import { RUBRIC_KEYS, type EvaluationRequest } from '../domain/evaluation';
import { evaluateLocally } from '../domain/local-evaluator';

const base: Omit<EvaluationRequest, 'answer'> = {
  questionText: 'Tell me about a difficult problem you faced and how you solved it.',
  competency: 'problem-solving',
  mode: 'text',
};

describe('evaluateLocally', () => {
  it('scores every rubric category within 0–10 and overall within 0–100', () => {
    const evaluation = evaluateLocally({
      ...base,
      answer:
        'When our checkout was failing, I owned the fix. I traced the root cause, ' +
        'rewrote the retry logic, and we reduced errors by 30%. I learned to add ' +
        'monitoring earlier next time.',
    });
    for (const k of RUBRIC_KEYS) {
      expect(evaluation.scores[k]).toBeGreaterThanOrEqual(0);
      expect(evaluation.scores[k]).toBeLessThanOrEqual(10);
    }
    expect(evaluation.overallScore).toBeGreaterThanOrEqual(0);
    expect(evaluation.overallScore).toBeLessThanOrEqual(100);
    expect(evaluation.source).toBe('offline');
  });

  it('rewards a complete STAR answer with numbers over a bare one', () => {
    const strong = evaluateLocally({
      ...base,
      answer:
        'At my last company our release was slipping. I was responsible for checkout. ' +
        'I re-scoped the work, paired with QA daily, and shipped on time. As a result ' +
        'we cut P1 bugs by 40%. I learned to cut scope early rather than add heroics.',
    });
    const weak = evaluateLocally({ ...base, answer: 'We did some stuff and it worked.' });
    expect(strong.overallScore).toBeGreaterThan(weak.overallScore);
    expect(strong.scores.impact).toBeGreaterThan(weak.scores.impact);
  });

  it('never fabricates: flags missing parts as bracketed prompts, not content', () => {
    const evaluation = evaluateLocally({ ...base, answer: 'I fixed a bug.' });
    // improved answer contains only the user's text plus [bracketed] prompts
    expect(evaluation.improvedAnswer.startsWith('I fixed a bug.')).toBe(true);
    expect(evaluation.improvedAnswer).toMatch(/\[.+\]/);
    expect(evaluation.missingDetails.length).toBeGreaterThan(0);
    // offline mode must not invent unsupported-claim assertions
    expect(evaluation.unsupportedClaims).toEqual([]);
    expect(evaluation.factsUsed).toEqual([]);
  });

  it('penalizes over-long answers on conciseness', () => {
    const longAnswer = Array.from({ length: 400 }, () => 'word').join(' ');
    const evaluation = evaluateLocally({ ...base, answer: longAnswer });
    expect(evaluation.scores.conciseness).toBeLessThan(6);
  });
});
