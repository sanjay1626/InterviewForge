import { LocalCollection } from '@/core/data/local-collection';
import type { TypedSupabaseClient } from '@/core/supabase/client';
import type {
  Project,
  ProjectInput,
  WorkExperience,
  WorkExperienceInput,
} from '../domain/types';
import type { CollectionRepository } from './collection-repository';
import { CompositeCollectionRepository } from './composite-collection-repository';
import { CompositeDocumentRepository } from './composite-document-repository';
import { CompositeExtractionRepository } from './extraction-repository';
import type { DocumentRepository } from './document-repository';
import type { ExtractionRepository } from './extraction-repository';
import { GuestCollectionRepository } from './guest-collection-repository';
import {
  buildLocalExperience,
  buildLocalProject,
} from './mappers';
import { SupabaseProjectRepository } from './supabase-project-repository';
import { SupabaseWorkExperienceRepository } from './supabase-experience-repository';

export type ExperienceRepository = CollectionRepository<
  WorkExperience,
  WorkExperienceInput
>;
export type ProjectRepository = CollectionRepository<Project, ProjectInput>;

export function createExperienceRepository(
  client: TypedSupabaseClient | null,
): ExperienceRepository {
  const guest = new GuestCollectionRepository<WorkExperience, WorkExperienceInput>(
    new LocalCollection('interviewforge.guest.work_experiences'),
    buildLocalExperience,
  );
  const cloud = client ? new SupabaseWorkExperienceRepository(client) : null;
  return new CompositeCollectionRepository(guest, cloud);
}

export function createProjectRepository(
  client: TypedSupabaseClient | null,
): ProjectRepository {
  const guest = new GuestCollectionRepository<Project, ProjectInput>(
    new LocalCollection('interviewforge.guest.projects'),
    buildLocalProject,
  );
  const cloud = client ? new SupabaseProjectRepository(client) : null;
  return new CompositeCollectionRepository(guest, cloud);
}

export function createDocumentRepository(
  client: TypedSupabaseClient | null,
): DocumentRepository {
  return new CompositeDocumentRepository(client);
}

export interface KnowledgeRepositories {
  experiences: ExperienceRepository;
  projects: ProjectRepository;
  documents: DocumentRepository;
  extraction: ExtractionRepository;
}

export function createKnowledgeRepositories(
  client: TypedSupabaseClient | null,
): KnowledgeRepositories {
  return {
    experiences: createExperienceRepository(client),
    projects: createProjectRepository(client),
    documents: createDocumentRepository(client),
    extraction: new CompositeExtractionRepository(client),
  };
}
