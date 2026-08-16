import type { JobAnalysis } from './job-analysis';

/**
 * Technical study topics drawn from the JD's technologies. These are
 * `general_knowledge` about the ROLE — the app never claims the candidate knows
 * a technology just because the JD lists it (spec section 6 & 12). The offline
 * refresher text is intentionally generic; the AI path may enrich it.
 */

export interface StudyTopic {
  topic: string;
  /** Why it matters for THIS job (about the employer, not the candidate). */
  whyItMatters: string;
  likelyQuestions: string[];
  /** Neutral concept refresher — general knowledge, not a candidate claim. */
  refresher: string;
  practiceQuestion: string;
}

function titleCase(s: string): string {
  return s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export function generateStudyTopics(analysis: JobAnalysis): StudyTopic[] {
  const seen = new Set<string>();
  const topics: StudyTopic[] = [];
  for (const tech of analysis.technologies) {
    const key = tech.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const name = titleCase(tech);
    topics.push({
      topic: name,
      whyItMatters: `${name} appears in the job description for ${analysis.jobTitle}, so the interviewer may probe your familiarity with it.`,
      likelyQuestions: [
        `What is your experience with ${name}?`,
        `Describe how you would approach a task using ${name}.`,
      ],
      refresher: `Review the core concepts of ${name}, when to use it, and one project or scenario where you have applied it (or could apply it).`,
      practiceQuestion: `Explain ${name} to a teammate who has never used it, then describe a time you used it.`,
    });
  }
  return topics;
}
