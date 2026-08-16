/**
 * Tiny, dependency-free text helpers shared by the Fast Prep engine. Kept
 * separate so the analysis/matching modules stay focused on meaning, not
 * string mechanics.
 */

/** Common English + resume/JD filler words we never treat as signal. */
export const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'you', 'your', 'our', 'are', 'was', 'were', 'this',
  'that', 'these', 'those', 'will', 'have', 'has', 'had', 'not', 'but', 'from',
  'their', 'they', 'them', 'who', 'what', 'when', 'where', 'which', 'how', 'why',
  'able', 'about', 'across', 'into', 'onto', 'over', 'under', 'per', 'via', 'etc',
  'a', 'an', 'in', 'on', 'of', 'to', 'at', 'as', 'by', 'or', 'is', 'be', 'we',
  'us', 'it', 'its', 'may', 'can', 'should', 'must', 'would', 'could', 'also',
  'including', 'include', 'includes', 'strong', 'excellent', 'good', 'great',
  'ability', 'experience', 'experienced', 'years', 'year', 'work', 'working',
  'role', 'team', 'teams', 'candidate', 'ideal', 'plus', 'preferred', 'required',
  'requirements', 'responsibilities', 'skills', 'looking', 'seeking', 'join',
]);

/** Lowercase alphanumeric tokens, stop-words removed, length >= 2. */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9+#.]+/g) ?? [])
    .map((t) => t.replace(/^[.]+|[.]+$/g, '')) // keep node.js / .net but trim stray dots
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

/** Normalizes a skill/keyword for comparison (lowercase, trimmed, collapsed spaces). */
export function normalizeKeyword(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Splits raw text into candidate "lines" (bullets, sentences) for scanning. */
export function toLines(text: string): string[] {
  return text
    .split(/[\n\r]+|(?<=[.!?])\s+|•|·|•|\s-\s/g)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/** Word-frequency map over tokens, most frequent first. */
export function keywordCounts(text: string): { keyword: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const t of tokenize(text)) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword));
}
