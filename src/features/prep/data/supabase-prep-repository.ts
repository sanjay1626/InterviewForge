import { err, ok, type Result } from '@/core/domain/result';
import type { TypedSupabaseClient } from '@/core/supabase/client';
import type { Json } from '@/core/supabase/database.types';
import { mapPostgrestError } from '@/core/supabase/errors';
import { newId } from '@/core/utils/id';
import type { JobAnalysis } from '../domain/job-analysis';
import { summarizeMatches, type RequirementMatch } from '../domain/matching';
import type {
  NeedsInput,
  PersonalizedAnswer,
  PrepPackage,
  SuggestedStory,
} from '../domain/package';
import type { PrepQuestion } from '../domain/questions';
import type { ReadinessScore } from '../domain/readiness';
import type { StudyTopic } from '../domain/study-topics';
import type { PrepPersistence, PrepSummary } from './prep-repository';

/**
 * Cloud persistence for interview_prep. The generated package is stored across
 * granular jsonb columns; `summary` is recomputed on read (it is derivable from
 * the matches, so it is never stored).
 */
export class SupabasePrepRepository implements PrepPersistence {
  constructor(private readonly client: TypedSupabaseClient) {}

  async save(userId: string, pkg: PrepPackage): Promise<Result<string>> {
    const id = newId();
    const { error } = await this.client.from('interview_prep').insert({
      id,
      user_id: userId,
      job_title: pkg.analysis.jobTitle,
      company: pkg.input.company,
      job_description: pkg.input.jobDescription,
      interview_date: pkg.input.interviewDate ?? null,
      analysis: pkg.analysis as unknown as Json,
      requirement_matches: pkg.matches as unknown as Json,
      question_plan: pkg.questions as unknown as Json,
      study_topics: pkg.studyTopics as unknown as Json,
      readiness: pkg.readiness as unknown as Json,
      suggested_stories: pkg.suggestedStories as unknown as Json,
      needs_input: pkg.needsInput as unknown as Json,
      answers: pkg.answers as unknown as Json,
      source: pkg.source,
    });
    if (error) return err(mapPostgrestError(error.message, error.code, error));
    return ok(id);
  }

  async list(userId: string, limit = 25): Promise<Result<PrepSummary[]>> {
    const { data, error } = await this.client
      .from('interview_prep')
      .select('id, job_title, company, source, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return err(mapPostgrestError(error.message, error.code, error));
    return ok(
      data.map((r) => ({
        id: r.id,
        jobTitle: r.job_title,
        company: r.company,
        source: r.source,
        createdAt: r.created_at,
      })),
    );
  }

  async get(userId: string, id: string): Promise<Result<PrepPackage | null>> {
    const { data, error } = await this.client
      .from('interview_prep')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return err(mapPostgrestError(error.message, error.code, error));
    if (!data) return ok(null);

    const analysis = (data.analysis ?? {}) as unknown as JobAnalysis;
    const matches = (data.requirement_matches ?? []) as unknown as RequirementMatch[];
    const pkg: PrepPackage = {
      input: {
        jobTitle: data.job_title,
        company: data.company,
        jobDescription: data.job_description,
        interviewDate: data.interview_date,
      },
      analysis,
      matches,
      summary: summarizeMatches(matches),
      questions: (data.question_plan ?? []) as unknown as PrepQuestion[],
      studyTopics: (data.study_topics ?? []) as unknown as StudyTopic[],
      readiness: (data.readiness ?? []) as unknown as ReadinessScore[],
      suggestedStories: (data.suggested_stories ?? []) as unknown as SuggestedStory[],
      needsInput: (data.needs_input ?? []) as unknown as NeedsInput[],
      answers: (data.answers ?? []) as unknown as PersonalizedAnswer[],
      source: data.source,
    };
    return ok(pkg);
  }

  async remove(userId: string, id: string): Promise<Result<void>> {
    const { error } = await this.client
      .from('interview_prep')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) return err(mapPostgrestError(error.message, error.code, error));
    return ok(undefined);
  }
}
