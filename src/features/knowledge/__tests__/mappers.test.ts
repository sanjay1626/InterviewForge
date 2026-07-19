import type { Tables } from '@/core/supabase/database.types';
import {
  buildLocalExperience,
  experienceToInsert,
  mapDocumentRow,
  mapExperienceRow,
  mapProjectRow,
  projectToInsert,
} from '../data/mappers';
import type { WorkExperienceInput } from '../domain/types';

describe('experience mappers', () => {
  const input: WorkExperienceInput = {
    company: '  Acme  ',
    title: '  Engineer ',
    location: ' Remote ',
    startDate: ' 2022-01 ',
    endDate: ' 2024-02 ',
    isCurrent: true,
    description: '  built things  ',
    highlights: ['Shipped X'],
    skills: ['TypeScript'],
  };

  it('experienceToInsert trims and nulls current end date', () => {
    const row = experienceToInsert('u1', input);
    expect(row.user_id).toBe('u1');
    expect(row.company).toBe('Acme');
    expect(row.title).toBe('Engineer');
    expect(row.is_current).toBe(true);
    expect(row.end_date).toBeNull(); // current role -> no end date
    expect(row.location).toBe('Remote');
  });

  it('buildLocalExperience mirrors insert semantics for guest storage', () => {
    const exp = buildLocalExperience('local-1', input, 'A', 'B');
    expect(exp.id).toBe('local-1');
    expect(exp.endDate).toBeNull();
    expect(exp.createdAt).toBe('A');
    expect(exp.updatedAt).toBe('B');
    expect(exp.highlights).toEqual(['Shipped X']);
  });

  it('mapExperienceRow defaults null arrays to empty', () => {
    const row = {
      id: 'e1',
      user_id: 'u1',
      company: 'Acme',
      title: 'Eng',
      location: null,
      start_date: null,
      end_date: null,
      is_current: false,
      description: null,
      highlights: null as unknown as string[],
      skills: null as unknown as string[],
      created_at: 't',
      updated_at: 't',
    } as Tables<'work_experiences'>;
    const exp = mapExperienceRow(row);
    expect(exp.highlights).toEqual([]);
    expect(exp.skills).toEqual([]);
  });
});

describe('project mappers', () => {
  it('projectToInsert trims and nulls empty optionals', () => {
    const row = projectToInsert('u1', {
      name: ' Portfolio ',
      role: '',
      description: '',
      highlights: [],
      skills: ['React'],
      link: '',
      startDate: '',
      endDate: '',
    });
    expect(row.name).toBe('Portfolio');
    expect(row.role).toBeNull();
    expect(row.link).toBeNull();
    expect(row.skills).toEqual(['React']);
  });

  it('mapProjectRow maps fields', () => {
    const row = {
      id: 'p1',
      user_id: 'u1',
      name: 'App',
      role: 'Lead',
      description: null,
      highlights: ['Launched'],
      skills: [],
      link: null,
      start_date: null,
      end_date: null,
      created_at: 't',
      updated_at: 't',
    } as Tables<'projects'>;
    const project = mapProjectRow(row);
    expect(project.name).toBe('App');
    expect(project.role).toBe('Lead');
    expect(project.highlights).toEqual(['Launched']);
  });
});

describe('document mapper', () => {
  it('maps a document row into the domain record', () => {
    const row = {
      id: 'd1',
      user_id: 'u1',
      title: 'Resume',
      source_type: 'resume',
      mime_type: 'text/plain',
      storage_path: 'u1/x.txt',
      status: 'ready',
      error: null,
      char_count: 1200,
      chunk_count: 3,
      created_at: 't',
      updated_at: 't',
    } as Tables<'documents'>;
    const doc = mapDocumentRow(row);
    expect(doc.status).toBe('ready');
    expect(doc.chunkCount).toBe(3);
    expect(doc.sourceType).toBe('resume');
  });
});
