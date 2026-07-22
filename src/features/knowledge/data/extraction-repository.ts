import { makeError } from '@/core/domain/errors';
import { err, ok, type Result } from '@/core/domain/result';
import type { TypedSupabaseClient } from '@/core/supabase/client';
import { describeFunctionError } from '@/core/supabase/function-error';
import { isGuestUserId } from '@/features/auth/data/guest-session';
import type { ExtractedProfile } from '../domain/types';
import { normalizeExtraction } from './normalize-extraction';

/**
 * Extracts structured experiences/projects/skills from an ingested resume.
 * Results are *candidates* the user reviews — nothing is persisted here.
 */
export interface ExtractionRepository {
  extractFromDocument(
    userId: string,
    documentId: string,
  ): Promise<Result<ExtractedProfile>>;
}

const NEEDS_ACCOUNT = makeError(
  'auth/not-configured',
  'Resume extraction needs a signed-in account with the AI provider configured. You can still add experience manually.',
);

export class CompositeExtractionRepository implements ExtractionRepository {
  constructor(private readonly client: TypedSupabaseClient | null) {}

  async extractFromDocument(
    userId: string,
    documentId: string,
  ): Promise<Result<ExtractedProfile>> {
    if (!this.client || isGuestUserId(userId)) return err(NEEDS_ACCOUNT);
    try {
      const { data, error } = await this.client.functions.invoke('extract-profile', {
        body: { documentId },
      });
      // Surface the real reason (not deployed / no API key / not analyzed yet)
      // instead of one blanket message.
      if (error) return err(await describeFunctionError(error, 'extract-profile'));
      if (!data || typeof data !== 'object') {
        return err(
          makeError('unknown', 'The extraction service returned an unexpected response.', {
            retryable: true,
          }),
        );
      }
      return ok(normalizeExtraction(data as Record<string, unknown>));
    } catch (cause) {
      return err(
        makeError('unknown', 'Could not read your resume.', { retryable: true, cause }),
      );
    }
  }
}
