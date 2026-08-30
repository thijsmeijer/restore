import type { ScoredCandidate, SelectionReasonCode } from '@/generator/types';

export function selectionReasons(
  candidate: ScoredCandidate,
): SelectionReasonCode[] {
  const reasons: SelectionReasonCode[] = [];
  const positiveCodes = new Set(
    candidate.score_terms
      .filter((term) => term.points > 0)
      .map((term) => term.code),
  );

  if (positiveCodes.has('target_match')) reasons.push('target_match');
  if (positiveCodes.has('intent_match')) reasons.push('intent_match');
  if (positiveCodes.has('profile_goal_match')) {
    reasons.push('profile_goal_match');
  }
  if (positiveCodes.has('training_context_match')) {
    reasons.push('training_context_match');
  }
  if (positiveCodes.has('favorite')) reasons.push('favorite_history');
  if (positiveCodes.has('helpful_response')) reasons.push('helpful_history');
  reasons.push('phase_requirement');

  return reasons;
}

export function explanationKey(
  reasons: readonly SelectionReasonCode[],
): string {
  return `generator.item.${reasons[0] ?? 'phase_requirement'}`;
}

export function explanationReferences(candidate: ScoredCandidate): string[] {
  const references = candidate.score_terms
    .filter((term) => term.points > 0 && term.reference_id !== null)
    .flatMap((term) => (term.reference_id === null ? [] : [term.reference_id]));

  return [...new Set(references)];
}
