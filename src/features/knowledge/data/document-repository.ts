import type { Result } from '@/core/domain/result';
import type { DocumentRecord, ResumeUpload } from '../domain/types';

/**
 * Contract for resume/document management + ingestion. The cloud implementation
 * uploads to Storage and triggers the `ingest-document` Edge Function; the guest
 * implementation reports that ingestion needs a signed-in account.
 */
export interface DocumentRepository {
  list(userId: string): Promise<Result<DocumentRecord[]>>;
  uploadResume(
    userId: string,
    upload: ResumeUpload,
  ): Promise<Result<DocumentRecord>>;
  /** Re-run ingestion for an existing document (e.g. after a failure). */
  reingest(userId: string, id: string): Promise<Result<DocumentRecord>>;
  remove(userId: string, id: string): Promise<Result<void>>;
}
