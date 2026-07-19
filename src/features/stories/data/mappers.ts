import { isCompetency } from '@/core/domain/competencies';
import type { Tables, TablesInsert } from '@/core/supabase/database.types';
import { clampStatus } from '../domain/star-helpers';
import type { StarStory, StarStoryInput } from '../domain/types';

export function mapStoryRow(row: Tables<'star_stories'>): StarStory {
  return {
    id: row.id,
    title: row.title,
    situation: row.situation,
    task: row.task,
    action: row.action,
    result: row.result,
    lesson: row.lesson,
    skills: row.skills ?? [],
    competencies: (row.competencies ?? []).filter(isCompetency),
    company: row.company,
    project: row.project,
    tags: row.tags ?? [],
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function storyToInsert(
  userId: string,
  input: StarStoryInput,
): TablesInsert<'star_stories'> {
  return {
    user_id: userId,
    title: input.title.trim(),
    situation: input.situation.trim() || null,
    task: input.task.trim() || null,
    action: input.action.trim() || null,
    result: input.result.trim() || null,
    lesson: input.lesson.trim() || null,
    skills: input.skills,
    competencies: input.competencies,
    company: input.company.trim() || null,
    project: input.project.trim() || null,
    tags: input.tags,
    // Never persist "ready" while STAR parts are missing.
    status: clampStatus(input.status, input),
  };
}

export function buildLocalStory(
  id: string,
  input: StarStoryInput,
  createdAt: string,
  updatedAt: string,
): StarStory {
  return {
    id,
    title: input.title.trim(),
    situation: input.situation.trim() || null,
    task: input.task.trim() || null,
    action: input.action.trim() || null,
    result: input.result.trim() || null,
    lesson: input.lesson.trim() || null,
    skills: input.skills,
    competencies: input.competencies,
    company: input.company.trim() || null,
    project: input.project.trim() || null,
    tags: input.tags,
    status: clampStatus(input.status, input),
    createdAt,
    updatedAt,
  };
}
