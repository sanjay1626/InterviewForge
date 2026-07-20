import { makeError } from '@/core/domain/errors';
import { err, ok, type Result } from '@/core/domain/result';
import type { TypedSupabaseClient } from '@/core/supabase/client';
import { mapPostgrestError, mapStorageError } from '@/core/supabase/errors';
import { base64ToBytes } from '@/core/utils/base64';
import { newId } from '@/core/utils/id';
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
    const isPdf =
      upload.mimeType.includes('pdf') || upload.fileName.toLowerCase().endsWith('.pdf');
    const ext = isPdf
      ? 'pdf'
      : upload.mimeType.includes('markdown') || upload.fileName.endsWith('.md')
        ? 'md'
        : 'txt';
    const storagePath = `${userId}/${newId()}.${ext}`;

    // 1. Upload the original file bytes to the private bucket.
    const bytes = base64ToBytes(upload.base64);
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
        char_count: upload.text?.length ?? 0,
      })
      .select('*')
      .single();
    if (insertErr) {
      // Best-effort cleanup of the orphaned object.
      await this.client.storage.from('documents').remove([storagePath]);
      return err(mapPostgrestError(insertErr.message, insertErr.code, insertErr));
    }

    // 3. Trigger ingestion. TXT/MD send inline text; PDF is parsed server-side
    //    from the uploaded file (no inline text).
    return this.invokeIngest(userId, inserted.id, upload.text ?? undefined);
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
