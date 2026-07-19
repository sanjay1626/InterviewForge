/**
 * Filler-word analysis over a transcript. Pure and deterministic — it only
 * counts the user's own words (available when they practiced by voice); it never
 * rewrites or fabricates anything.
 */

const FILLERS: string[] = [
  'um', 'uh', 'er', 'ah', 'like', 'basically', 'actually', 'literally',
  'honestly', 'right', 'okay', 'so', 'well',
];

// Multi-word fillers matched as phrases.
const FILLER_PHRASES: string[] = ['you know', 'i mean', 'sort of', 'kind of'];

export interface FillerAnalysis {
  totalWords: number;
  fillerCount: number;
  /** Fillers per 100 words. */
  rate: number;
  breakdown: { word: string; count: number }[];
}

export function analyzeFillers(text: string): FillerAnalysis {
  const normalized = ' ' + text.toLowerCase().replace(/[^a-z\s']/g, ' ').replace(/\s+/g, ' ') + ' ';
  const totalWords = normalized.trim() ? normalized.trim().split(' ').length : 0;

  const counts = new Map<string, number>();
  let fillerCount = 0;

  for (const phrase of FILLER_PHRASES) {
    const re = new RegExp(`\\b${phrase}\\b`, 'g');
    const n = (normalized.match(re) ?? []).length;
    if (n > 0) {
      counts.set(phrase, n);
      fillerCount += n;
    }
  }
  for (const word of FILLERS) {
    const re = new RegExp(`\\s${word}\\s`, 'g');
    const n = (normalized.match(re) ?? []).length;
    if (n > 0) {
      counts.set(word, n);
      fillerCount += n;
    }
  }

  const breakdown = [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);

  const rate = totalWords > 0 ? Math.round((fillerCount / totalWords) * 1000) / 10 : 0;

  return { totalWords, fillerCount, rate, breakdown };
}
