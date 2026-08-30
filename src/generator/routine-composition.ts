import type { Exercise } from '@/content/schemas';
import {
  explanationKey,
  explanationReferences,
  selectionReasons,
} from '@/generator/explanations';
import { warningKeys } from '@/generator/prescription';
import { exerciseAddressesTarget } from '@/generator/targeting';
import type {
  ExactPrescription,
  GeneratedRoutineItem,
  PreparedGeneration,
  RoutineAlternative,
  ScoredCandidate,
  TargetCoverage,
  TargetPriority,
} from '@/generator/types';

export function candidateAlternatives(
  candidate: ScoredCandidate,
  phase: GeneratedRoutineItem['phase'],
  prepared: PreparedGeneration,
  selectedExerciseIds: ReadonlySet<string>,
): RoutineAlternative[] {
  const alternatives: RoutineAlternative[] = [];

  for (const relation of candidate.exercise.relations) {
    if (
      (relation.type !== 'alternative' && relation.type !== 'regression') ||
      !relation.supported_modes.includes(prepared.input.mode)
    ) {
      continue;
    }
    const target = prepared.eligible_candidates.find(
      (entry) =>
        entry.exercise.id === relation.target_exercise_id &&
        entry.exercise.phases.includes(phase) &&
        (relation.version_policy === 'compatible' ||
          entry.exercise.version === relation.target_version),
    );
    if (!target || selectedExerciseIds.has(target.exercise.id)) continue;

    alternatives.push({
      relation_type: relation.type,
      exercise_id: target.exercise.id,
      exercise_version: target.exercise.version,
    });
  }

  return alternatives;
}

export function composeRoutineItem(
  candidate: ScoredCandidate,
  phase: GeneratedRoutineItem['phase'],
  order: number,
  prescription: ExactPrescription,
  prepared: PreparedGeneration,
  selectedExerciseIds: ReadonlySet<string>,
): GeneratedRoutineItem {
  const reasons = selectionReasons(candidate);
  return {
    order,
    phase,
    exercise_id: candidate.exercise.id,
    exercise_version: candidate.exercise.version,
    prescription,
    selection_reason_codes: reasons,
    explanation_key: explanationKey(reasons),
    explanation_reference_ids: explanationReferences(candidate),
    caution_rule_ids: candidate.caution_rule_ids,
    warning_keys: warningKeys(candidate),
    alternatives: candidateAlternatives(
      candidate,
      phase,
      prepared,
      selectedExerciseIds,
    ),
    score: candidate.score,
    score_terms: candidate.score_terms,
  };
}

export function computeTargetCoverage(
  prepared: PreparedGeneration,
  priorities: readonly TargetPriority[],
  selectedExercises: readonly Exercise[],
  selectableCandidates: readonly ScoredCandidate[],
): TargetCoverage[] {
  return prepared.input.target_regions.map((target, index) => {
    const priority = priorities[index];
    const exerciseIds = selectedExercises
      .filter((exercise) => exerciseAddressesTarget(exercise, target))
      .map((exercise) => exercise.id);
    const addressed = exerciseIds.length > 0;
    const hasEligibleCandidate = selectableCandidates.some((candidate) =>
      exerciseAddressesTarget(candidate.exercise, target),
    );

    return {
      region_slug: target.region_slug,
      side: target.side,
      priority_basis_points: priority?.priority_basis_points ?? 0,
      high_priority: priority?.high_priority ?? false,
      addressed,
      exercise_ids: exerciseIds,
      omission_reason_code: addressed
        ? null
        : hasEligibleCandidate
          ? 'routine_constraints_limited_selection'
          : 'no_eligible_candidate',
    };
  });
}
