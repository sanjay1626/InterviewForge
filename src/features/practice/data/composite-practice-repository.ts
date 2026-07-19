import type { Result } from '@/core/domain/result';
import type { TypedSupabaseClient } from '@/core/supabase/client';
import { isGuestUserId } from '@/features/auth/data/guest-session';
import type { PracticeAttempt, SaveAttemptInput } from '../domain/attempt';
import { GuestPracticeRepository } from './guest-practice-repository';
import type { PracticeRepository } from './practice-repository';
import { SupabasePracticeRepository } from './supabase-practice-repository';

export class CompositePracticeRepository implements PracticeRepository {
  private readonly guest = new GuestPracticeRepository();
  private readonly cloud: SupabasePracticeRepository | null;

  constructor(client: TypedSupabaseClient | null) {
    this.cloud = client ? new SupabasePracticeRepository(client) : null;
  }

  private pick(userId: string): PracticeRepository {
    if (isGuestUserId(userId) || !this.cloud) return this.guest;
    return this.cloud;
  }

  saveAttempt(
    userId: string,
    input: SaveAttemptInput,
  ): Promise<Result<PracticeAttempt>> {
    return this.pick(userId).saveAttempt(userId, input);
  }

  listAttempts(userId: string, limit?: number): Promise<Result<PracticeAttempt[]>> {
    return this.pick(userId).listAttempts(userId, limit);
  }
}
