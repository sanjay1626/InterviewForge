import { analyzeFillers } from '../domain/fillers';

describe('analyzeFillers', () => {
  it('returns zero for clean text', () => {
    const r = analyzeFillers('I led the migration and delivered it on time.');
    expect(r.fillerCount).toBe(0);
    expect(r.rate).toBe(0);
    expect(r.breakdown).toEqual([]);
  });

  it('counts single-word and phrase fillers', () => {
    const r = analyzeFillers(
      'So um I was like basically leading it, you know, and uh it worked.',
    );
    const map = Object.fromEntries(r.breakdown.map((b) => [b.word, b.count]));
    expect(map['um']).toBe(1);
    expect(map['uh']).toBe(1);
    expect(map['like']).toBe(1);
    expect(map['basically']).toBe(1);
    expect(map['you know']).toBe(1);
    expect(map['so']).toBe(1);
    expect(r.fillerCount).toBeGreaterThanOrEqual(6);
    expect(r.rate).toBeGreaterThan(0);
  });

  it('handles empty input', () => {
    const r = analyzeFillers('   ');
    expect(r.totalWords).toBe(0);
    expect(r.fillerCount).toBe(0);
    expect(r.rate).toBe(0);
  });

  it('does not match filler substrings inside other words', () => {
    // "likely" and "somewhat" contain "like"/"so" but must not count.
    const r = analyzeFillers('It is likely somewhat correct.');
    expect(r.fillerCount).toBe(0);
  });
});
