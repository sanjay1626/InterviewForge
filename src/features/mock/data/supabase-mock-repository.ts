import { err, ok, type Result } from '@/core/domain/result';
import type { TypedSupabaseClient } from '@/core/supabase/client';
import type { Json } from '@/core/supabase/database.types';
import { mapPostgrestError } from '@/core/supabase/errors';
import type { MockConfig, MockInterviewType, MockLength } from '../domain/config';
import type { MockReport, MockSession, MockStatus } from '../domain/session';
import type {
  MockInterviewRepository,
  MockReportView,
  MockSessionSummary,
} from './mock-repository';

export class SupabaseMockRepository implements MockInterviewRepository {
  constructor(private readonly client: TypedSupabaseClient) {}

  async saveSession(userId: string, session: MockSession): Promise<Result<void>> {
    const { error: sessionErr } = await this.client
      .from('mock_interview_sessions')
      .upsert({
        id: session.id,
        user_id: userId,
        config: session.config as unknown as Json,
        status: session.status,
        plan: session.plan as unknown as Json,
        question_count: session.plan.length,
        started_at: session.startedAt,
        completed_at: session.completedAt,
      });
    if (sessionErr) return err(mapPostgrestError(sessionErr.message, sessionErr.code, sessionErr));

    // Rewrite children idempotently (a session is saved once, on finish/exit).
    await this.client.from('mock_interview_questions').delete().eq('session_id', session.id);
    await this.client.from('mock_interview_answers').delete().eq('session_id', session.id);
    await this.client.from('mock_interview_followups').delete().eq('session_id', session.id);

    if (session.plan.length > 0) {
      await this.client.from('mock_interview_questions').insert(
        session.plan.map((q, i) => ({
          session_id: session.id,
          user_id: userId,
          order_index: i,
          kind: q.kind,
          competency: q.competency,
          prompt: q.prompt,
        })),
      );
    }
    if (session.answers.length > 0) {
      await this.client.from('mock_interview_answers').insert(
        session.answers.map((a, i) => ({
          session_id: session.id,
          user_id: userId,
          order_index: i,
          question_text: a.questionText,
          kind: a.kind,
          competency: a.competency,
          transcript: a.transcript,
          mode: a.mode,
          duration_ms: a.durationMs,
        })),
      );
      const followups = session.answers.flatMap((a) =>
        a.followUps.map((f) => ({
          session_id: session.id,
          user_id: userId,
          prompt: f.prompt,
          response: f.response,
        })),
      );
      if (followups.length > 0) {
        await this.client.from('mock_interview_followups').insert(followups);
      }
    }

    if (session.report) {
      const { error: reportErr } = await this.client
        .from('mock_interview_reports')
        .upsert(
          {
            session_id: session.id,
            user_id: userId,
            overall_score: session.report.overallScore,
            report: session.report as unknown as Json,
            source: session.report.source,
          },
          { onConflict: 'session_id' },
        );
      if (reportErr) return err(mapPostgrestError(reportErr.message, reportErr.code, reportErr));
    }

    return ok(undefined);
  }

  async listSessions(
    userId: string,
    limit = 25,
  ): Promise<Result<MockSessionSummary[]>> {
    const { data, error } = await this.client
      .from('mock_interview_sessions')
      .select('id, config, status, created_at, completed_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return err(mapPostgrestError(error.message, error.code, error));

    const ids = data.map((r) => r.id);
    const scoreBySession = new Map<string, number>();
    if (ids.length > 0) {
      const { data: reports } = await this.client
        .from('mock_interview_reports')
        .select('session_id, overall_score')
        .in('session_id', ids);
      for (const r of reports ?? []) scoreBySession.set(r.session_id, r.overall_score);
    }

    return ok(
      data.map((r) => {
        const config = (r.config ?? {}) as unknown as MockConfig;
        return {
          id: r.id,
          role: config.targetRole ?? '',
          type: (config.type ?? 'mixed') as MockInterviewType,
          length: (config.length ?? 'standard') as MockLength,
          status: r.status as MockStatus,
          overallScore: scoreBySession.get(r.id) ?? null,
          createdAt: r.created_at,
          completedAt: r.completed_at,
        };
      }),
    );
  }

  async getReport(
    userId: string,
    sessionId: string,
  ): Promise<Result<MockReportView | null>> {
    const { data: sess, error } = await this.client
      .from('mock_interview_sessions')
      .select('config, status, completed_at')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return err(mapPostgrestError(error.message, error.code, error));
    if (!sess) return ok(null);

    const { data: report } = await this.client
      .from('mock_interview_reports')
      .select('report')
      .eq('session_id', sessionId)
      .maybeSingle();

    return ok({
      config: (sess.config ?? {}) as unknown as MockConfig,
      status: sess.status as MockStatus,
      report: report ? (report.report as unknown as MockReport) : null,
      completedAt: sess.completed_at,
    });
  }
}
