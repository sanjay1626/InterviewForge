import { makeError } from '@/core/domain/errors';
import { err, ok, type Result } from '@/core/domain/result';
import type { DocumentRecord } from '../domain/types';
import type { DocumentRepository } from './document-repository';

const NEEDS_ACCOUNT = makeError(
  'auth/not-configured',
  'Resume upload and analysis need a signed-in account with Supabase configured. Create an account to enable it.',
);

/**
 * Guest documents are unsupported: ingestion requires Storage + the Edge
 * Function, which need an authenticated user. The list is simply empty.
 */
export class GuestDocumentRepository implements DocumentRepository {
  async list(): Promise<Result<DocumentRecord[]>> {
    return ok([]);
  }
  async uploadResume(): Promise<Result<DocumentRecord>> {
    return err(NEEDS_ACCOUNT);
  }
  async reingest(): Promise<Result<DocumentRecord>> {
    return err(NEEDS_ACCOUNT);
  }
  async remove(): Promise<Result<void>> {
    return err(NEEDS_ACCOUNT);
  }
}
