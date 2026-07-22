/**
 * Knowledge-base domain model (Phase 2). Framework-independent. These describe
 * the user's real experience; nothing here is ever AI-generated or inferred.
 */

export interface WorkExperience {
  id: string;
  company: string;
  title: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  highlights: string[]; // accomplishments
  skills: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkExperienceInput {
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
  highlights: string[];
  skills: string[];
}

export interface Project {
  id: string;
  name: string;
  role: string | null;
  description: string | null;
  highlights: string[];
  skills: string[];
  link: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectInput {
  name: string;
  role: string;
  description: string;
  highlights: string[];
  skills: string[];
  link: string;
  startDate: string;
  endDate: string;
}

export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'failed';
export type DocumentSourceType = 'resume' | 'notes' | 'other';

export interface DocumentRecord {
  id: string;
  title: string;
  sourceType: DocumentSourceType;
  mimeType: string | null;
  storagePath: string | null;
  status: DocumentStatus;
  error: string | null;
  charCount: number;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Structured data extracted from an uploaded resume. These are *candidates*
 * only — the user reviews, edits, and approves them before anything is saved.
 */
export interface ExtractedProfile {
  experiences: WorkExperienceInput[];
  projects: ProjectInput[];
  skills: string[];
  certifications: string[];
}

/** A locally-picked resume file ready to upload + ingest. */
export interface ResumeUpload {
  title: string;
  fileName: string;
  mimeType: string;
  /**
   * Plain-text contents for TXT/MD (read on-device and sent inline to skip a
   * round-trip). `null` for binary formats like PDF, which are parsed
   * server-side after upload.
   */
  text: string | null;
  /** Base64 of the raw file bytes — always the original file, stored as-is. */
  base64: string;
}
