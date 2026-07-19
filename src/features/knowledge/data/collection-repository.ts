import type { Result } from '@/core/domain/result';

/**
 * Generic contract for a user-owned collection (work experiences, projects).
 * Concrete implementations back it with Supabase or local guest storage; the
 * composite picks between them by user id.
 */
export interface CollectionRepository<TDomain, TInput> {
  list(userId: string): Promise<Result<TDomain[]>>;
  create(userId: string, input: TInput): Promise<Result<TDomain>>;
  update(userId: string, id: string, input: TInput): Promise<Result<TDomain>>;
  remove(userId: string, id: string): Promise<Result<void>>;
}
