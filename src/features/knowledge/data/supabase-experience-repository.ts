import { err, ok, type Result } from '@/core/domain/result';
import type { TypedSupabaseClient } from '@/core/supabase/client';
import { mapPostgrestError } from '@/core/supabase/errors';
import type { WorkExperience, WorkExperienceInput } from '../domain/types';
import type { CollectionRepository } from './collection-repository';
import { experienceToInsert, mapExperienceRow } from './mappers';

export class SupabaseWorkExperienceRepository
  implements CollectionRepository<WorkExperience, WorkExperienceInput>
{
  constructor(private readonly client: TypedSupabaseClient) {}

  async list(userId: string): Promise<Result<WorkExperience[]>> {
    const { data, error } = await this.client
      .from('work_experiences')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) return err(mapPostgrestError(error.message, error.code, error));
    return ok(data.map(mapExperienceRow));
  }

  async create(
    userId: string,
    input: WorkExperienceInput,
  ): Promise<Result<WorkExperience>> {
    const { data, error } = await this.client
      .from('work_experiences')
      .insert(experienceToInsert(userId, input))
      .select('*')
      .single();
    if (error) return err(mapPostgrestError(error.message, error.code, error));
    return ok(mapExperienceRow(data));
  }

  async update(
    userId: string,
    id: string,
    input: WorkExperienceInput,
  ): Promise<Result<WorkExperience>> {
    const { data, error } = await this.client
      .from('work_experiences')
      .update(experienceToInsert(userId, input))
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) return err(mapPostgrestError(error.message, error.code, error));
    return ok(mapExperienceRow(data));
  }

  async remove(userId: string, id: string): Promise<Result<void>> {
    const { error } = await this.client
      .from('work_experiences')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) return err(mapPostgrestError(error.message, error.code, error));
    return ok(undefined);
  }
}
