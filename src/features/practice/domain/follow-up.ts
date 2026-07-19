/** A user's response to a follow-up question, with concise feedback. */
export interface FollowUpRecord {
  id: string;
  answerId: string | null;
  prompt: string;
  response: string;
  overallScore: number;
  feedback: string;
  createdAt: string;
}

export interface SaveFollowUpInput {
  answerId: string | null;
  prompt: string;
  response: string;
  overallScore: number;
  feedback: string;
}
