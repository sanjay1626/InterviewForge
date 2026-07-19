/** Shared text helpers for word counts and spoken-duration estimates. */

const WORDS_PER_MINUTE = 130;

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function spokenSecondsForWords(words: number): number {
  return Math.round((words / WORDS_PER_MINUTE) * 60);
}

/** Rough spoken length (~130 wpm) for a block of text. */
export function estimateSpokenSeconds(text: string): number {
  return spokenSecondsForWords(countWords(text));
}
