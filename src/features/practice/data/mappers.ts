import { isCompetency } from '@/core/domain/competencies';
import type { Json, Tables, TablesInsert } from '@/core/supabase/database.types';
import type { AnswerEvaluation } from '../domain/evaluation';
import { normalizeEvaluation } from './normalize-evaluation';

export function evaluationToInsert(
  userId: string,
  answerId: string,
  evaluation: AnswerEvaluation,
): TablesInsert<'answer_evaluations'> {
  return {
    answer_id: answerId,
    user_id: userId,
    overall_score: evaluation.overallScore,
    scores: evaluation.scores as unknown as Json,
    strengths: evaluation.strengths,
    missing_details: evaluation.missingDetails,
    unsupported_claims: evaluation.unsupportedClaims,
    suggested_followups: evaluation.suggestedFollowUps,
    recommendations: evaluation.recommendations,
    improved_answer: evaluation.improvedAnswer || null,
    facts_used: evaluation.factsUsed,
    missing_info: evaluation.missingInfo,
    change_explanation: evaluation.changeExplanation || null,
    source: evaluation.source,
  };
}

export function mapEvaluationRow(row: Tables<'answer_evaluations'>): AnswerEvaluation {
  return normalizeEvaluation(
    {
      scores: row.scores,
      overallScore: row.overall_score,
      strengths: row.strengths,
      missingDetails: row.missing_details,
      unsupportedClaims: row.unsupported_claims,
      suggestedFollowUps: row.suggested_followups,
      recommendations: row.recommendations,
      improvedAnswer: row.improved_answer ?? '',
      factsUsed: row.facts_used,
      missingInfo: row.missing_info,
      changeExplanation: row.change_explanation ?? '',
    },
    row.source,
  );
}

export function competencyOrNull(value: string | null) {
  return value && isCompetency(value) ? value : null;
}
