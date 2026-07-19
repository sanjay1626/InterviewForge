import type { Tables, TablesInsert } from '@/core/supabase/database.types';
import type {
  DocumentRecord,
  Project,
  ProjectInput,
  WorkExperience,
  WorkExperienceInput,
} from '../domain/types';

// --- work experiences ------------------------------------------------------

export function mapExperienceRow(
  row: Tables<'work_experiences'>,
): WorkExperience {
  return {
    id: row.id,
    company: row.company,
    title: row.title,
    location: row.location,
    startDate: row.start_date,
    endDate: row.end_date,
    isCurrent: row.is_current,
    description: row.description,
    highlights: row.highlights ?? [],
    skills: row.skills ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function experienceToInsert(
  userId: string,
  input: WorkExperienceInput,
): TablesInsert<'work_experiences'> {
  return {
    user_id: userId,
    company: input.company.trim(),
    title: input.title.trim(),
    location: input.location.trim() || null,
    start_date: input.startDate.trim() || null,
    end_date: input.isCurrent ? null : input.endDate.trim() || null,
    is_current: input.isCurrent,
    description: input.description.trim() || null,
    highlights: input.highlights,
    skills: input.skills,
  };
}

export function buildLocalExperience(
  id: string,
  input: WorkExperienceInput,
  createdAt: string,
  updatedAt: string,
): WorkExperience {
  return {
    id,
    company: input.company.trim(),
    title: input.title.trim(),
    location: input.location.trim() || null,
    startDate: input.startDate.trim() || null,
    endDate: input.isCurrent ? null : input.endDate.trim() || null,
    isCurrent: input.isCurrent,
    description: input.description.trim() || null,
    highlights: input.highlights,
    skills: input.skills,
    createdAt,
    updatedAt,
  };
}

// --- projects --------------------------------------------------------------

export function mapProjectRow(row: Tables<'projects'>): Project {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    description: row.description,
    highlights: row.highlights ?? [],
    skills: row.skills ?? [],
    link: row.link,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function projectToInsert(
  userId: string,
  input: ProjectInput,
): TablesInsert<'projects'> {
  return {
    user_id: userId,
    name: input.name.trim(),
    role: input.role.trim() || null,
    description: input.description.trim() || null,
    highlights: input.highlights,
    skills: input.skills,
    link: input.link.trim() || null,
    start_date: input.startDate.trim() || null,
    end_date: input.endDate.trim() || null,
  };
}

export function buildLocalProject(
  id: string,
  input: ProjectInput,
  createdAt: string,
  updatedAt: string,
): Project {
  return {
    id,
    name: input.name.trim(),
    role: input.role.trim() || null,
    description: input.description.trim() || null,
    highlights: input.highlights,
    skills: input.skills,
    link: input.link.trim() || null,
    startDate: input.startDate.trim() || null,
    endDate: input.endDate.trim() || null,
    createdAt,
    updatedAt,
  };
}

// --- documents -------------------------------------------------------------

export function mapDocumentRow(row: Tables<'documents'>): DocumentRecord {
  return {
    id: row.id,
    title: row.title,
    sourceType: row.source_type,
    mimeType: row.mime_type,
    storagePath: row.storage_path,
    status: row.status,
    error: row.error,
    charCount: row.char_count,
    chunkCount: row.chunk_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
