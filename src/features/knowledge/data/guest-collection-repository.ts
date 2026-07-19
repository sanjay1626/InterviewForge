import type { LocalCollection } from '@/core/data/local-collection';
import { makeError } from '@/core/domain/errors';
import { err, ok, type Result } from '@/core/domain/result';
import { newId } from '@/core/utils/id';
import type { CollectionRepository } from './collection-repository';

interface Entity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Generic guest (local) implementation of a user-owned collection. The `build`
 * function turns an input + timestamps into a domain entity, keeping this class
 * agnostic to the specific shape (experiences, projects, ...).
 */
export class GuestCollectionRepository<TDomain extends Entity, TInput>
  implements CollectionRepository<TDomain, TInput>
{
  constructor(
    private readonly collection: LocalCollection<TDomain>,
    private readonly build: (
      id: string,
      input: TInput,
      createdAt: string,
      updatedAt: string,
    ) => TDomain,
  ) {}

  async list(): Promise<Result<TDomain[]>> {
    try {
      return ok(await this.collection.list());
    } catch (cause) {
      return err(makeError('unknown', 'Could not read local data.', { cause }));
    }
  }

  async create(_userId: string, input: TInput): Promise<Result<TDomain>> {
    const now = new Date().toISOString();
    const entity = this.build(newId(), input, now, now);
    try {
      await this.collection.upsert(entity);
      return ok(entity);
    } catch (cause) {
      return err(makeError('unknown', 'Could not save locally.', { cause }));
    }
  }

  async update(
    _userId: string,
    id: string,
    input: TInput,
  ): Promise<Result<TDomain>> {
    const existing = await this.collection.get(id);
    if (!existing) return err(makeError('not-found', 'Item not found.'));
    const entity = this.build(
      id,
      input,
      existing.createdAt,
      new Date().toISOString(),
    );
    try {
      await this.collection.upsert(entity);
      return ok(entity);
    } catch (cause) {
      return err(makeError('unknown', 'Could not save locally.', { cause }));
    }
  }

  async remove(_userId: string, id: string): Promise<Result<void>> {
    try {
      await this.collection.remove(id);
      return ok(undefined);
    } catch (cause) {
      return err(makeError('unknown', 'Could not delete locally.', { cause }));
    }
  }
}
