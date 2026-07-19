import { err, ok, type Result } from '@/core/domain/result';
import type { TypedSupabaseClient } from '@/core/supabase/client';
import { mapPostgrestError } from '@/core/supabase/errors';
import type { CollectionRepository } from '@/features/knowledge/data/collection-repository';
import type { StarStory, StarStoryInput } from '../domain/types';
import { mapStoryRow, storyToInsert } from './mappers';

/** Supabase-backed STAR story store (owner-only via RLS). */
export class SupabaseStoryRepository
  implements CollectionRepository<StarStory, StarStoryInput>
{
  constructor(private readonly client: TypedSupabaseClient) {}

  async list(userId: string): Promise<Result<StarStory[]>> {
    const { data, error } = await this.client
      .from('star_stories')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) return err(mapPostgrestError(error.message, error.code, error));
    return ok(data.map(mapStoryRow));
  }

  async create(userId: string, input: StarStoryInput): Promise<Result<StarStory>> {
    const { data, error } = await this.client
      .from('star_stories')
      .insert(storyToInsert(userId, input))
      .select('*')
      .single();
    if (error) return err(mapPostgrestError(error.message, error.code, error));
    return ok(mapStoryRow(data));
  }

  async update(
    userId: string,
    id: string,
    input: StarStoryInput,
  ): Promise<Result<StarStory>> {
    const { data, error } = await this.client
      .from('star_stories')
      .update(storyToInsert(userId, input))
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) return err(mapPostgrestError(error.message, error.code, error));
    return ok(mapStoryRow(data));
  }

  async remove(userId: string, id: string): Promise<Result<void>> {
    const { error } = await this.client
      .from('star_stories')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) return err(mapPostgrestError(error.message, error.code, error));
    return ok(undefined);
  }
}
