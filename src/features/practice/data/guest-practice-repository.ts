import { LocalCollection } from '@/core/data/local-collection';
import { makeError } from '@/core/domain/errors';
import { err, ok, type Result } from '@/core/domain/result';
import { newId } from '@/core/utils/id';
import type { PracticeAttempt, SaveAttemptInput } from '../domain/attempt';
import type { PracticeRepository } from './practice-repository';

/** Local practice history for guest mode. */
export class GuestPracticeRepository implements PracticeRepository {
  private readonly collection = new LocalCollection<PracticeAttempt>(
    'interviewforge.guest.practice_attempts',
  );

  async saveAttempt(
    _userId: string,
    input: SaveAttemptInput,
  ): Promise<Result<PracticeAttempt>> {
    const attempt: PracticeAttempt = {
      id: newId(),
      questionId: input.questionId,
      questionText: input.questionText,
      competency: input.competency,
      answer: input.answer,
      mode: input.mode,
      evaluation: input.evaluation,
      createdAt: new Date().toISOString(),
    };
    try {
      await this.collection.upsert(attempt);
      return ok(attempt);
    } catch (cause) {
      return err(makeError('unknown', 'Could not save attempt locally.', { cause }));
    }
  }

  async listAttempts(
    _userId: string,
    limit = 20,
  ): Promise<Result<PracticeAttempt[]>> {
    try {
      const all = await this.collection.list();
      const sorted = [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return ok(sorted.slice(0, limit));
    } catch (cause) {
      return err(makeError('unknown', 'Could not read local history.', { cause }));
    }
  }

  async deleteAttempt(_userId: string, id: string): Promise<Result<void>> {
    try {
      await this.collection.remove(id);
      return ok(undefined);
    } catch (cause) {
      return err(makeError('unknown', 'Could not delete locally.', { cause }));
    }
  }
}
