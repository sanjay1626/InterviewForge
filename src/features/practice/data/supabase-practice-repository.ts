import { err, ok, type Result } from '@/core/domain/result';
import type { TypedSupabaseClient } from '@/core/supabase/client';
import { mapPostgrestError } from '@/core/supabase/errors';
import type { PracticeAttempt, SaveAttemptInput } from '../domain/attempt';
import {
  competencyOrNull,
  evaluationToInsert,
  mapEvaluationRow,
} from './mappers';
import type { PracticeRepository } from './practice-repository';

export class SupabasePracticeRepository implements PracticeRepository {
  constructor(private readonly client: TypedSupabaseClient) {}

  async saveAttempt(
    userId: string,
    input: SaveAttemptInput,
  ): Promise<Result<PracticeAttempt>> {
    const now = new Date().toISOString();

    const { data: session, error: sessErr } = await this.client
      .from('practice_sessions')
      .insert({
        user_id: userId,
        mode: input.mode,
        status: 'completed',
        question_count: 1,
        completed_at: now,
      })
      .select('id')
      .single();
    if (sessErr) return err(mapPostgrestError(sessErr.message, sessErr.code, sessErr));

    const { data: answer, error: ansErr } = await this.client
      .from('practice_answers')
      .insert({
        session_id: session.id,
        user_id: userId,
        // Bundled question ids are not DB uuids; the text snapshot is the record.
        question_id: null,
        question_text: input.questionText,
        competency: input.competency,
        answer_text: input.answer,
        mode: input.mode,
      })
      .select('id, created_at')
      .single();
    if (ansErr) return err(mapPostgrestError(ansErr.message, ansErr.code, ansErr));

    const { error: evalErr } = await this.client
      .from('answer_evaluations')
      .insert(evaluationToInsert(userId, answer.id, input.evaluation));
    if (evalErr) return err(mapPostgrestError(evalErr.message, evalErr.code, evalErr));

    return ok({
      id: answer.id,
      questionId: input.questionId,
      questionText: input.questionText,
      competency: input.competency,
      answer: input.answer,
      mode: input.mode,
      evaluation: input.evaluation,
      createdAt: answer.created_at,
    });
  }

  async listAttempts(
    userId: string,
    limit = 20,
  ): Promise<Result<PracticeAttempt[]>> {
    const { data: answers, error: ansErr } = await this.client
      .from('practice_answers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (ansErr) return err(mapPostgrestError(ansErr.message, ansErr.code, ansErr));

    const ids = answers.map((a) => a.id);
    if (ids.length === 0) return ok([]);

    const { data: evals, error: evalErr } = await this.client
      .from('answer_evaluations')
      .select('*')
      .in('answer_id', ids);
    if (evalErr) return err(mapPostgrestError(evalErr.message, evalErr.code, evalErr));

    const byAnswer = new Map(evals.map((e) => [e.answer_id, e]));
    const attempts: PracticeAttempt[] = [];
    for (const a of answers) {
      const evalRow = byAnswer.get(a.id);
      if (!evalRow) continue;
      attempts.push({
        id: a.id,
        questionId: null,
        questionText: a.question_text,
        competency: competencyOrNull(a.competency),
        answer: a.answer_text,
        mode: (a.mode as PracticeAttempt['mode']) ?? 'text',
        evaluation: mapEvaluationRow(evalRow),
        createdAt: a.created_at,
      });
    }
    return ok(attempts);
  }
}
