import { makeError } from '@/core/domain/errors';
import { err, ok, type Result } from '@/core/domain/result';
import type { TypedSupabaseClient } from '@/core/supabase/client';
import { describeFunctionError } from '@/core/supabase/function-error';
import { isGuestUserId } from '@/features/auth/data/guest-session';

/**
 * Natural text-to-speech via the `speak` Edge Function (OpenAI TTS). Returns
 * base64 MP3. When unavailable (guest, no backend, no provider key, error) it
 * returns a typed error and the caller falls back to the on-device system voice.
 */
export interface TtsRepository {
  synthesize(userId: string, text: string): Promise<Result<string>>;
}

const UNAVAILABLE = makeError(
  'auth/not-configured',
  'Natural voice is unavailable; using the device voice.',
);

export class CompositeTtsRepository implements TtsRepository {
  constructor(private readonly client: TypedSupabaseClient | null) {}

  async synthesize(userId: string, text: string): Promise<Result<string>> {
    if (!this.client || isGuestUserId(userId)) return err(UNAVAILABLE);
    try {
      const { data, error } = await this.client.functions.invoke('speak', {
        body: { text },
      });
      if (error) return err(await describeFunctionError(error, 'speak'));
      const audioBase64 = (data as { audioBase64?: unknown })?.audioBase64;
      if (typeof audioBase64 !== 'string' || !audioBase64) return err(UNAVAILABLE);
      return ok(audioBase64);
    } catch (cause) {
      return err(makeError('unknown', 'Could not generate speech.', { cause }));
    }
  }
}
