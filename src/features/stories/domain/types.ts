import type { Competency } from '@/core/domain/competencies';

/**
 * STAR story domain model (Phase 3). Framework-independent. Every field is
 * authored by the user — the builder never invents Situation/Task/Action/Result
 * content on their behalf.
 */

export type StarStatus = 'draft' | 'needs_details' | 'ready';

export interface StarStory {
  id: string;
  title: string;
  situation: string | null;
  task: string | null;
  action: string | null;
  result: string | null;
  lesson: string | null;
  skills: string[];
  competencies: Competency[];
  company: string | null;
  project: string | null;
  tags: string[];
  status: StarStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StarStoryInput {
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  lesson: string;
  skills: string[];
  competencies: Competency[];
  company: string;
  project: string;
  tags: string[];
  status: StarStatus;
}

export const STAR_STATUS_META: Record<
  StarStatus,
  { label: string; description: string }
> = {
  draft: { label: 'Draft', description: 'A work in progress' },
  needs_details: {
    label: 'Needs details',
    description: 'Missing one or more STAR parts',
  },
  ready: { label: 'Ready', description: 'Complete and interview-ready' },
};
