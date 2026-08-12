import { makeError } from '@/core/domain/errors';
import { err, ok, type Result } from '@/core/domain/result';
import type { Competency } from '@/core/domain/competencies';
import type { TypedSupabaseClient } from '@/core/supabase/client';
import { describeFunctionError } from '@/core/supabase/function-error';
import { isGuestUserId } from '@/features/auth/data/guest-session';
import type {
  AssistantDraftInput,
  DraftResult,
  MemoryCard,
  MemoryType,
  RecallResult,
} from '../domain/assistant';

/**
 * Cloud side of the Blank Page Assistant (the `blank-page` Edge Function).
 * When unavailable (guest, no backend, no API key, error) it returns a typed
 * error and the hook falls back to local recall / local draft assembly.
 */
export interface AssistantRepository {
  recall(
    userId: string,
    input: { questionText: string; competency: Competency | null },
  ): Promise<Result<RecallResult>>;
  draft(userId: string, input: AssistantDraftInput): Promise<Result<DraftResult>>;
}

const NEEDS_CLOUD = makeError(
  'auth/not-configured',
  'AI recall is unavailable; showing your own records instead.',
);

const str = (v: unknown, max = 400): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';
const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()) : [];

const MEMORY_TYPES: MemoryType[] = ['experience', 'project', 'story', 'resume', 'answer'];

function normalizeRecall(raw: Record<string, unknown>): RecallResult {
  const memories: MemoryCard[] = (Array.isArray(raw.memories) ? raw.memories : [])
    .filter((m): m is Record<string, unknown> => typeof m === 'object' && m !== null)
    .map((m) => {
      const type = MEMORY_TYPES.includes(m.type as MemoryType)
        ? (m.type as MemoryType)
        : 'experience';
      return {
        ref: str(m.ref, 80),
        type,
        title: str(m.title, 160) || 'Untitled',
        whyRelevant: str(m.whyRelevant, 240),
        situationSummary: str(m.situationSummary, 280),
        skills: strArr(m.skills).slice(0, 12),
        sourceLabel: str(m.sourceLabel, 40) || 'Record',
      };
    })
    .filter((m) => m.ref);

  return {
    hasMemories: raw.hasMemories !== false && memories.length > 0,
    memories,
    chips: strArr(raw.chips).slice(0, 14),
    source: 'ai',
  };
}

function normalizeDraft(raw: Record<string, unknown>): DraftResult {
  const paragraphs = (Array.isArray(raw.paragraphs) ? raw.paragraphs : [])
    .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
    .map((p) => ({ text: str(p.text, 1200), sources: strArr(p.sources).slice(0, 8) }))
    .filter((p) => p.text);

  return {
    draft: str(raw.draft, 6000) || paragraphs.map((p) => p.text).join('\n\n'),
    paragraphs,
    missingInfo: strArr(raw.missingInfo).slice(0, 8),
    source: 'ai',
  };
}

export class CompositeAssistantRepository implements AssistantRepository {
  constructor(private readonly client: TypedSupabaseClient | null) {}

  private available(userId: string): boolean {
    return Boolean(this.client) && !isGuestUserId(userId);
  }

  async recall(
    userId: string,
    input: { questionText: string; competency: Competency | null },
  ): Promise<Result<RecallResult>> {
    if (!this.available(userId)) return err(NEEDS_CLOUD);
    try {
      const { data, error } = await this.client!.functions.invoke('blank-page', {
        body: { mode: 'recall', questionText: input.questionText, competency: input.competency },
      });
      if (error) return err(await describeFunctionError(error, 'blank-page'));
      if (!data || typeof data !== 'object') return err(NEEDS_CLOUD);
      return ok(normalizeRecall(data as Record<string, unknown>));
    } catch (cause) {
      return err(makeError('unknown', 'Recall failed.', { cause }));
    }
  }

  async draft(
    userId: string,
    input: AssistantDraftInput,
  ): Promise<Result<DraftResult>> {
    if (!this.available(userId)) return err(NEEDS_CLOUD);
    try {
      const { data, error } = await this.client!.functions.invoke('blank-page', {
        body: {
          mode: 'draft',
          questionText: input.questionText,
          competency: input.competency,
          chips: input.chips,
          refs: input.refs,
          reflection: input.reflection,
        },
      });
      if (error) return err(await describeFunctionError(error, 'blank-page'));
      if (!data || typeof data !== 'object') return err(NEEDS_CLOUD);
      return ok(normalizeDraft(data as Record<string, unknown>));
    } catch (cause) {
      return err(makeError('unknown', 'Draft failed.', { cause }));
    }
  }
}
