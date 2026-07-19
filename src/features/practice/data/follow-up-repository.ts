import { LocalCollection } from '@/core/data/local-collection';
import { makeError } from '@/core/domain/errors';
import { err, ok, type Result } from '@/core/domain/result';
import type { TypedSupabaseClient } from '@/core/supabase/client';
import { mapPostgrestError } from '@/core/supabase/errors';
import { newId } from '@/core/utils/id';
import { isGuestUserId } from '@/features/auth/data/guest-session';
import type { FollowUpRecord, SaveFollowUpInput } from '../domain/follow-up';

export interface FollowUpRepository {
  save(userId: string, input: SaveFollowUpInput): Promise<Result<FollowUpRecord>>;
}

class SupabaseFollowUpRepository implements FollowUpRepository {
  constructor(private readonly client: TypedSupabaseClient) {}

  async save(
    userId: string,
    input: SaveFollowUpInput,
  ): Promise<Result<FollowUpRecord>> {
    const { data, error } = await this.client
      .from('follow_up_answers')
      .insert({
        // Guest/local attempt ids are not DB uuids; only persist real uuids.
        answer_id: input.answerId && input.answerId.startsWith('local-') ? null : input.answerId,
        user_id: userId,
        prompt: input.prompt,
        response: input.response,
        overall_score: input.overallScore,
        feedback: input.feedback || null,
      })
      .select('*')
      .single();
    if (error) return err(mapPostgrestError(error.message, error.code, error));
    return ok({
      id: data.id,
      answerId: data.answer_id,
      prompt: data.prompt,
      response: data.response,
      overallScore: data.overall_score,
      feedback: data.feedback ?? '',
      createdAt: data.created_at,
    });
  }
}

class GuestFollowUpRepository implements FollowUpRepository {
  private readonly collection = new LocalCollection<FollowUpRecord>(
    'interviewforge.guest.follow_ups',
  );

  async save(
    _userId: string,
    input: SaveFollowUpInput,
  ): Promise<Result<FollowUpRecord>> {
    const record: FollowUpRecord = {
      id: newId(),
      answerId: input.answerId,
      prompt: input.prompt,
      response: input.response,
      overallScore: input.overallScore,
      feedback: input.feedback,
      createdAt: new Date().toISOString(),
    };
    try {
      await this.collection.upsert(record);
      return ok(record);
    } catch (cause) {
      return err(makeError('unknown', 'Could not save follow-up locally.', { cause }));
    }
  }
}

export class CompositeFollowUpRepository implements FollowUpRepository {
  private readonly guest = new GuestFollowUpRepository();
  private readonly cloud: SupabaseFollowUpRepository | null;

  constructor(client: TypedSupabaseClient | null) {
    this.cloud = client ? new SupabaseFollowUpRepository(client) : null;
  }

  save(userId: string, input: SaveFollowUpInput): Promise<Result<FollowUpRecord>> {
    const repo = isGuestUserId(userId) || !this.cloud ? this.guest : this.cloud;
    return repo.save(userId, input);
  }
}
