import { makeError } from '@/core/domain/errors';
import { err, ok, type Result } from '@/core/domain/result';
import type { TypedSupabaseClient } from '@/core/supabase/client';
import { isGuestUserId } from '@/features/auth/data/guest-session';

export interface TranscribeInput {
  /** Base64-encoded audio (no data: prefix required). */
  audioBase64: string;
  mimeType: string;
  fileName: string;
}

/**
 * Produces a first-draft transcript from recorded audio. Always shown to the
 * user for correction before evaluation. When transcription is unavailable
 * (guest, no backend, no provider key, or an error) it returns a typed
 * not-available error so the UI can offer manual transcript entry instead —
 * voice practice never hard-fails.
 */
export interface TranscriptionRepository {
  transcribe(userId: string, input: TranscribeInput): Promise<Result<string>>;
}

const NOT_AVAILABLE = makeError(
  'auth/not-configured',
  'Automatic transcription is unavailable. Type or paste what you said below.',
);

export class CompositeTranscriptionRepository
  implements TranscriptionRepository
{
  constructor(private readonly client: TypedSupabaseClient | null) {}

  async transcribe(
    userId: string,
    input: TranscribeInput,
  ): Promise<Result<string>> {
    if (!this.client || isGuestUserId(userId)) return err(NOT_AVAILABLE);
    try {
      const { data, error } = await this.client.functions.invoke('transcribe-audio', {
        body: input,
      });
      if (error || !data || typeof (data as { text?: unknown }).text !== 'string') {
        return err(NOT_AVAILABLE);
      }
      const text = (data as { text: string }).text.trim();
      if (!text) return err(NOT_AVAILABLE);
      return ok(text);
    } catch {
      return err(NOT_AVAILABLE);
    }
  }
}
