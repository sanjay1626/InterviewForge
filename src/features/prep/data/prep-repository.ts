import { ok, type Result } from '@/core/domain/result';
import type { TypedSupabaseClient } from '@/core/supabase/client';
import { isGuestUserId } from '@/features/auth/data/guest-session';
import {
  buildCandidateProfile,
  type CandidateSources,
} from '../domain/evidence';
import { analyzeJobDescription } from '../domain/job-analysis';
import {
  assembleFromAnalysis,
  assemblePackageLocally,
  type PrepInput,
  type PrepPackage,
} from '../domain/package';
import { GuestPrepRepository } from './guest-prep-repository';
import { normalizeAnalysis, normalizeAnswers } from './normalize-analysis';
import { SupabasePrepRepository } from './supabase-prep-repository';

/**
 * Generates a grounded interview-prep package. Cloud path (`fast-prep` Edge
 * Function) provides a sharper JD analysis + AI-drafted personalized answers;
 * when unavailable (guest, no backend, no API key, or any error) it falls back
 * to the deterministic offline analyzer. Either way, the grounding-critical
 * requirement→evidence matching runs in the pure domain, not the model.
 */
export interface GeneratePrepInput {
  input: PrepInput;
  /** Verified candidate data, gathered client-side for matching + fallback. */
  sources: CandidateSources;
  answeredCount?: number;
}

/** A saved prep record as stored for guest mode (full package aggregate). */
export interface SavedPrepRecord {
  id: string;
  createdAt: string;
  pkg: PrepPackage;
}

/** Lightweight row for the "your saved prep" list. */
export interface PrepSummary {
  id: string;
  jobTitle: string;
  company: string;
  source: 'ai' | 'offline';
  createdAt: string;
}

/** Persistence contract shared by the guest (local) and cloud impls. */
export interface PrepPersistence {
  save(userId: string, pkg: PrepPackage): Promise<Result<string>>;
  list(userId: string, limit?: number): Promise<Result<PrepSummary[]>>;
  get(userId: string, id: string): Promise<Result<PrepPackage | null>>;
  remove(userId: string, id: string): Promise<Result<void>>;
}

export interface PrepRepository extends PrepPersistence {
  generate(userId: string, input: GeneratePrepInput): Promise<Result<PrepPackage>>;
}

export class CompositePrepRepository implements PrepRepository {
  private readonly guest = new GuestPrepRepository();
  private readonly cloud: SupabasePrepRepository | null;

  constructor(private readonly client: TypedSupabaseClient | null) {
    this.cloud = client ? new SupabasePrepRepository(client) : null;
  }

  private cloudAvailable(userId: string): boolean {
    return Boolean(this.client) && !isGuestUserId(userId);
  }

  /** Persistence routes guest → local, everyone else → cloud. */
  private store(userId: string): PrepPersistence {
    return this.cloudAvailable(userId) && this.cloud ? this.cloud : this.guest;
  }

  save(userId: string, pkg: PrepPackage): Promise<Result<string>> {
    return this.store(userId).save(userId, pkg);
  }
  list(userId: string, limit?: number): Promise<Result<PrepSummary[]>> {
    return this.store(userId).list(userId, limit);
  }
  get(userId: string, id: string): Promise<Result<PrepPackage | null>> {
    return this.store(userId).get(userId, id);
  }
  remove(userId: string, id: string): Promise<Result<void>> {
    return this.store(userId).remove(userId, id);
  }

  async generate(
    userId: string,
    { input, sources, answeredCount }: GeneratePrepInput,
  ): Promise<Result<PrepPackage>> {
    const offline = (): Result<PrepPackage> =>
      ok(assemblePackageLocally(input, sources, { answeredCount }));

    if (!this.cloudAvailable(userId)) return offline();

    try {
      const { data, error } = await this.client!.functions.invoke('fast-prep', {
        body: { jobTitle: input.jobTitle, jobDescription: input.jobDescription },
      });
      // Any provider/deploy/config problem (no API key → 501, not deployed →
      // 404, etc.) → fall back to the offline package so the user still gets
      // useful prep rather than an error.
      if (error) return offline();
      if (!data || typeof data !== 'object') return offline();

      const raw = data as Record<string, unknown>;
      const profile = buildCandidateProfile(sources);
      const analysis = normalizeAnalysis(raw.analysis, input.jobDescription, input.jobTitle);
      // If the model returned nothing usable, use the offline analysis instead.
      const effective =
        analysis.requirements.length > 0
          ? analysis
          : analyzeJobDescription(input.jobDescription, { jobTitle: input.jobTitle });
      const answers = normalizeAnswers(raw.answers);

      return ok(
        assembleFromAnalysis(input, effective, profile, 'ai', {
          answeredCount,
          answers,
        }),
      );
    } catch {
      // Network or unexpected error → still deliver an offline package.
      return offline();
    }
  }
}
