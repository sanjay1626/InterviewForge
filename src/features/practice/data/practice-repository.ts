import type { Result } from '@/core/domain/result';
import type { PracticeAttempt, SaveAttemptInput } from '../domain/attempt';

/**
 * Persists practice attempts (session + answer + evaluation) and lists recent
 * ones. Cloud-backed for authenticated users, local for guests.
 */
export interface PracticeRepository {
  saveAttempt(
    userId: string,
    input: SaveAttemptInput,
  ): Promise<Result<PracticeAttempt>>;
  listAttempts(userId: string, limit?: number): Promise<Result<PracticeAttempt[]>>;
  deleteAttempt(userId: string, id: string): Promise<Result<void>>;
}
