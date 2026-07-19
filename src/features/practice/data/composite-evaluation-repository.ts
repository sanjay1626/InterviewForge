import { ok, type Result } from '@/core/domain/result';
import type { TypedSupabaseClient } from '@/core/supabase/client';
import { isGuestUserId } from '@/features/auth/data/guest-session';
import type { AnswerEvaluation, EvaluationRequest } from '../domain/evaluation';
import { evaluateLocally } from '../domain/local-evaluator';
import type { EvaluationRepository } from './evaluation-repository';
import { normalizeEvaluation } from './normalize-evaluation';

/**
 * Evaluation with graceful degradation:
 *  - Authenticated + Supabase configured → invoke the grounded `evaluate-answer`
 *    Edge Function (source: 'ai').
 *  - On any failure (function not deployed, no API key → 501, network) OR for
 *    guest/offline users → the deterministic local heuristic (source: 'offline').
 * Always resolves to a usable evaluation.
 */
export class CompositeEvaluationRepository implements EvaluationRepository {
  constructor(private readonly client: TypedSupabaseClient | null) {}

  async evaluate(
    userId: string,
    request: EvaluationRequest,
  ): Promise<Result<AnswerEvaluation>> {
    const canUseCloud = this.client && !isGuestUserId(userId);
    if (canUseCloud) {
      const cloud = await this.tryCloud(request);
      if (cloud) return ok(cloud);
      // fall through to offline
    }
    return ok(evaluateLocally(request));
  }

  private async tryCloud(
    request: EvaluationRequest,
  ): Promise<AnswerEvaluation | null> {
    try {
      const { data, error } = await this.client!.functions.invoke('evaluate-answer', {
        body: {
          questionText: request.questionText,
          competency: request.competency,
          answer: request.answer,
        },
      });
      if (error || !data || typeof data !== 'object') return null;
      return normalizeEvaluation(data as Record<string, unknown>, 'ai');
    } catch {
      return null;
    }
  }
}
