import type { Result } from '@/core/domain/result';
import { isGuestUserId } from '@/features/auth/data/guest-session';
import type { CollectionRepository } from './collection-repository';

/**
 * Routes a collection's reads/writes to the local guest repo or the cloud repo
 * based on the user id (or when no cloud repo is configured).
 */
export class CompositeCollectionRepository<TDomain, TInput>
  implements CollectionRepository<TDomain, TInput>
{
  constructor(
    private readonly guest: CollectionRepository<TDomain, TInput>,
    private readonly cloud: CollectionRepository<TDomain, TInput> | null,
  ) {}

  private pick(userId: string): CollectionRepository<TDomain, TInput> {
    if (isGuestUserId(userId) || !this.cloud) return this.guest;
    return this.cloud;
  }

  list(userId: string): Promise<Result<TDomain[]>> {
    return this.pick(userId).list(userId);
  }
  create(userId: string, input: TInput): Promise<Result<TDomain>> {
    return this.pick(userId).create(userId, input);
  }
  update(userId: string, id: string, input: TInput): Promise<Result<TDomain>> {
    return this.pick(userId).update(userId, id, input);
  }
  remove(userId: string, id: string): Promise<Result<void>> {
    return this.pick(userId).remove(userId, id);
  }
}
