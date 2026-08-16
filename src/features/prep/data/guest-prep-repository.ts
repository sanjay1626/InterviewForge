import { LocalCollection } from '@/core/data/local-collection';
import { makeError } from '@/core/domain/errors';
import { err, ok, type Result } from '@/core/domain/result';
import { newId } from '@/core/utils/id';
import type { PrepPackage } from '../domain/package';
import type { PrepPersistence, PrepSummary, SavedPrepRecord } from './prep-repository';

/** Local prep storage for guest mode (full package aggregate). */
export class GuestPrepRepository implements PrepPersistence {
  private readonly collection = new LocalCollection<SavedPrepRecord>(
    'interviewforge.guest.interview_prep',
  );

  async save(_userId: string, pkg: PrepPackage): Promise<Result<string>> {
    try {
      const id = newId();
      await this.collection.upsert({ id, createdAt: new Date().toISOString(), pkg });
      return ok(id);
    } catch (cause) {
      return err(makeError('unknown', 'Could not save prep locally.', { cause }));
    }
  }

  async list(_userId: string, limit = 25): Promise<Result<PrepSummary[]>> {
    try {
      const all = await this.collection.list();
      const sorted = [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return ok(
        sorted.slice(0, limit).map((r) => ({
          id: r.id,
          jobTitle: r.pkg.analysis.jobTitle,
          company: r.pkg.input.company,
          source: r.pkg.source,
          createdAt: r.createdAt,
        })),
      );
    } catch (cause) {
      return err(makeError('unknown', 'Could not read local prep.', { cause }));
    }
  }

  async get(_userId: string, id: string): Promise<Result<PrepPackage | null>> {
    try {
      const record = await this.collection.get(id);
      return ok(record?.pkg ?? null);
    } catch (cause) {
      return err(makeError('unknown', 'Could not read the prep.', { cause }));
    }
  }

  async remove(_userId: string, id: string): Promise<Result<void>> {
    try {
      await this.collection.remove(id);
      return ok(undefined);
    } catch (cause) {
      return err(makeError('unknown', 'Could not delete the prep.', { cause }));
    }
  }
}
