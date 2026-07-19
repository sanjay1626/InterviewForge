import type { Result } from '@/core/domain/result';
import type { TypedSupabaseClient } from '@/core/supabase/client';
import { isGuestUserId } from '@/features/auth/data/guest-session';
import type { DocumentRecord, ResumeUpload } from '../domain/types';
import type { DocumentRepository } from './document-repository';
import { GuestDocumentRepository } from './guest-document-repository';
import { SupabaseDocumentRepository } from './supabase-document-repository';

export class CompositeDocumentRepository implements DocumentRepository {
  private readonly guest = new GuestDocumentRepository();
  private readonly cloud: SupabaseDocumentRepository | null;

  constructor(client: TypedSupabaseClient | null) {
    this.cloud = client ? new SupabaseDocumentRepository(client) : null;
  }

  private pick(userId: string): DocumentRepository {
    if (isGuestUserId(userId) || !this.cloud) return this.guest;
    return this.cloud;
  }

  list(userId: string): Promise<Result<DocumentRecord[]>> {
    return this.pick(userId).list(userId);
  }
  uploadResume(
    userId: string,
    upload: ResumeUpload,
  ): Promise<Result<DocumentRecord>> {
    return this.pick(userId).uploadResume(userId, upload);
  }
  reingest(userId: string, id: string): Promise<Result<DocumentRecord>> {
    return this.pick(userId).reingest(userId, id);
  }
  remove(userId: string, id: string): Promise<Result<void>> {
    return this.pick(userId).remove(userId, id);
  }
}
