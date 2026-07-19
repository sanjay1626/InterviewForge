import type { Result } from '@/core/domain/result';
import type { AnswerEvaluation, EvaluationRequest } from '../domain/evaluation';

/**
 * Produces a structured evaluation for an answer. The composite implementation
 * tries the grounded AI Edge Function first and falls back to the offline
 * heuristic evaluator, so it always resolves to a usable evaluation.
 */
export interface EvaluationRepository {
  evaluate(
    userId: string,
    request: EvaluationRequest,
  ): Promise<Result<AnswerEvaluation>>;
}
