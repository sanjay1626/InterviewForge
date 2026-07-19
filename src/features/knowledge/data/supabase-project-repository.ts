import { err, ok, type Result } from '@/core/domain/result';
import type { TypedSupabaseClient } from '@/core/supabase/client';
import { mapPostgrestError } from '@/core/supabase/errors';
import type { Project, ProjectInput } from '../domain/types';
import type { CollectionRepository } from './collection-repository';
import { mapProjectRow, projectToInsert } from './mappers';

export class SupabaseProjectRepository
  implements CollectionRepository<Project, ProjectInput>
{
  constructor(private readonly client: TypedSupabaseClient) {}

  async list(userId: string): Promise<Result<Project[]>> {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) return err(mapPostgrestError(error.message, error.code, error));
    return ok(data.map(mapProjectRow));
  }

  async create(userId: string, input: ProjectInput): Promise<Result<Project>> {
    const { data, error } = await this.client
      .from('projects')
      .insert(projectToInsert(userId, input))
      .select('*')
      .single();
    if (error) return err(mapPostgrestError(error.message, error.code, error));
    return ok(mapProjectRow(data));
  }

  async update(
    userId: string,
    id: string,
    input: ProjectInput,
  ): Promise<Result<Project>> {
    const { data, error } = await this.client
      .from('projects')
      .update(projectToInsert(userId, input))
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) return err(mapPostgrestError(error.message, error.code, error));
    return ok(mapProjectRow(data));
  }

  async remove(userId: string, id: string): Promise<Result<void>> {
    const { error } = await this.client
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) return err(mapPostgrestError(error.message, error.code, error));
    return ok(undefined);
  }
}
