import { makeError } from '@/core/domain/errors';
import { err, ok, type Result } from '@/core/domain/result';
import type { TypedSupabaseClient } from '@/core/supabase/client';
import { mapPostgrestError, mapStorageError } from '@/core/supabase/errors';
import { newId } from '@/core/utils/id';
import { utf8Bytes } from '@/core/utils/utf8';
import type { DocumentRecord, ResumeUpload } from '../domain/types';
import type { DocumentRepository } from './document-repository';
import { mapDocumentRow } from './mappers';

export class SupabaseDocumentRepository implements DocumentRepository {
  constructor(private readonly client: TypedSupabaseClient) {}

  async list(userId: string): Promise<Result<DocumentRecord[]>> {
    const { data, error } = await this.client
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) return err(mapPostgrestError(error.message, error.code, error));
    return ok(data.map(mapDocumentRow));
  }

  async uploadResume(
    userId: string,
    upload: ResumeUpload,
  ): Promise<Result<DocumentRecord>> {
    const ext =
      upload.mimeType.includes('markdown') || upload.fileName.endsWith('.md')
        ? 'md'
        : 'txt';
    const storagePath = `${userId}/${newId()}.${ext}`;

    // 1. Upload the original file bytes to the private bucket.
    const bytes = utf8Bytes(upload.text);
    const { error: uploadErr } = await this.client.storage
      .from('documents')
      .upload(storagePath, bytes as unknown as ArrayBuffer, {
        contentType: upload.mimeType || 'text/plain',
        upsert: false,
      });
    if (uploadErr) return err(mapStorageError(uploadErr.message, uploadErr));

    // 2. Create the document row (pending).
    const { data: inserted, error: insertErr } = await this.client
      .from('documents')
      .insert({
        user_id: userId,
        title: upload.title.trim() || upload.fileName,
        source_type: 'resume',
        mime_type: upload.mimeType || 'text/plain',
        storage_path: storagePath,
        status: 'pending',
        char_count: upload.text.length,
      })
      .select('*')
      .single();
    if (insertErr) {
      // Best-effort cleanup of the orphaned object.
      await this.client.storage.from('documents').remove([storagePath]);
      return err(mapPostgrestError(insertErr.message, insertErr.code, insertErr));
    }

    // 3. Trigger ingestion (synchronous invoke) and return the final row.
    return this.invokeIngest(userId, inserted.id, upload.text);
  }

  async reingest(userId: string, id: string): Promise<Result<DocumentRecord>> {
    return this.invokeIngest(userId, id);
  }

  private async invokeIngest(
    userId: string,
    documentId: string,
    text?: string,
  ): Promise<Result<DocumentRecord>> {
    const { error: fnErr } = await this.client.functions.invoke(
      'ingest-document',
      { body: text ? { documentId, text } : { documentId } },
    );

    if (fnErr) {
      // The function may not be deployed yet, or the network failed. Record it
      // on the row so the UI can show a retry affordance.
      await this.client
        .from('documents')
        .update({
          status: 'failed',
          error:
            'Ingestion function unavailable. Deploy `ingest-document` (see setup guide) and retry.',
        })
        .eq('id', documentId)
        .eq('user_id', userId);
    }

    // Re-fetch to reflect the status the function wrote.
    const { data, error } = await this.client
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();
    if (error || !data) {
      return err(makeError('unknown', 'Could not load document after ingestion.'));
    }
    return ok(mapDocumentRow(data));
  }

  async remove(userId: string, id: string): Promise<Result<void>> {
    const { data: existing } = await this.client
      .from('documents')
      .select('storage_path')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing?.storage_path) {
      await this.client.storage.from('documents').remove([existing.storage_path]);
    }

    const { error } = await this.client
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) return err(mapPostgrestError(error.message, error.code, error));
    return ok(undefined);
  }
}
