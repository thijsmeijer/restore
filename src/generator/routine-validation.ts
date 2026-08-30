import { estimateExerciseSeconds } from '@/generator/duration';
import {
  explanationKey,
  explanationReferences,
  selectionReasons,
} from '@/generator/explanations';
import {
  createPrescription,
  maximumSelectableDose,
  prescriptionLimits,
  requiredVariant,
  warningKeys,
} from '@/generator/prescription';
import { computeTargetPriorities, scoreCandidates } from '@/generator/scoring';
import { exerciseAddressesTarget } from '@/generator/targeting';
import type {
  GeneratedRoutineItem,
  GenerationRules,
  PreparedGeneration,
  RoutineValidationCode,
  RoutineValidationReport,
  ScoredCandidate,
  TargetCoverage,
} from '@/generator/types';

const validationOrder: readonly RoutineValidationCode[] = [
  'empty_routine',
  'hard_filter_violation',
  'alternative_invalid',
  'caution_requirement_invalid',
  'duplicate_exercise',
  'item_limit_exceeded',
  'scoring_invalid',
  'explanation_invalid',
  'phase_order_invalid',
  'phase_budget_invalid',
  'movement_pattern_limit_exceeded',
  'prescription_invalid',
  'target_coverage_unexplained',
  'duration_out_of_bounds',
  'duration_indivisible_difference',
];

function uniqueOrderedIssues(
  issues: readonly RoutineValidationCode[],
): RoutineValidationCode[] {
  return [...new Set(issues)].sort(
    (left, right) =>
      validationOrder.indexOf(left) - validationOrder.indexOf(right),
  );
}

function sameStringArray(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function phaseBudgetIssues(
  items: readonly GeneratedRoutineItem[],
  prepared: PreparedGeneration,
  requestedSeconds: number,
): RoutineValidationCode[] {
  const issues: RoutineValidationCode[] = [];
  let previousPhaseIndex = -1;

  for (const [itemIndex, item] of items.entries()) {
    const phaseIndex = prepared.template.phases.findIndex(
      (phase) => phase.phase === item.phase,
    );
    const candidate = prepared.eligible_candidates.find(
      (entry) =>
        entry.exercise.id === item.exercise_id &&
        entry.exercise.version === item.exercise_version,
    );
    if (
      phaseIndex < previousPhaseIndex ||
      phaseIndex < 0 ||
      item.order !== itemIndex ||
      !candidate?.exercise.phases.includes(item.phase)
    ) {
      issues.push('phase_order_invalid');
    }
    previousPhaseIndex = Math.max(previousPhaseIndex, phaseIndex);
  }

  prepared.template.phases.forEach((phase) => {
    const duration = items
      .filter((item) => item.phase === phase.phase)
      .reduce(
        (total, item) => total + item.prescription.estimated_duration_seconds,
        0,
      );
    const minimum = Math.ceil(
      (requestedSeconds * phase.minimum_share_basis_points) / 10_000,
    );
    const maximum = Math.floor(
      (requestedSeconds * phase.maximum_share_basis_points) / 10_000,
    );
    if (
      duration > maximum ||
      (phase.requirement === 'required' && duration < minimum)
    ) {
      issues.push('phase_budget_invalid');
    }
  });

  return issues;
}

function prescriptionIssues(
  item: GeneratedRoutineItem,
  candidate: ScoredCandidate,
  prepared: PreparedGeneration,
  rules: GenerationRules,
): RoutineValidationCode[] {
  const issues: RoutineValidationCode[] = [];
  const limits = prescriptionLimits(candidate);
  const expected = createPrescription(
    candidate,
    prepared.input,
    rules,
    item.prescription.dose,
  );

  if (requiredVariant(candidate) !== null) {
    issues.push('caution_requirement_invalid');
  }
  if (
    !sameStringArray(item.caution_rule_ids, candidate.caution_rule_ids) ||
    !sameStringArray(item.warning_keys, warningKeys(candidate))
  ) {
    issues.push('caution_requirement_invalid');
  }
  if (
    !Number.isInteger(item.prescription.dose) ||
    !Number.isInteger(item.prescription.sets) ||
    item.prescription.dose < candidate.exercise.prescription.minimum ||
    item.prescription.dose > maximumSelectableDose(candidate) ||
    item.prescription.dose > limits.maximumDose ||
    item.prescription.sets < 1 ||
    item.prescription.sets !== expected.sets ||
    item.prescription.sets > limits.maximumSets ||
    item.prescription.sets >
      candidate.exercise.dosage_limits.max_sets_per_routine ||
    item.prescription.type !== candidate.exercise.prescription.type ||
    item.prescription.tempo !== candidate.exercise.prescription.tempo ||
    item.prescription.side_mode !== candidate.exercise.prescription.side_mode ||
    !sameStringArray(item.prescription.side_sequence, expected.side_sequence) ||
    item.prescription.rest_seconds !==
      candidate.exercise.prescription.rest_seconds ||
    item.prescription.transition_seconds !== rules.transition_seconds ||
    item.prescription.estimated_duration_seconds !==
      estimateExerciseSeconds(
        candidate.exercise,
        rules,
        item.prescription.dose,
        item.prescription.sets,
      )
  ) {
    issues.push('prescription_invalid');
  }

  return issues;
}

function durationIssues(
  items: readonly GeneratedRoutineItem[],
  reportedDuration: number,
  durationStatus: RoutineValidationReport['duration_status'],
  prepared: PreparedGeneration,
  rules: GenerationRules,
): RoutineValidationCode[] {
  const requestedSeconds = prepared.input.available_minutes * 60;
  const toleranceSeconds = Math.floor(
    (requestedSeconds * rules.duration_tolerance_basis_points) / 10_000,
  );
  const actualDuration = items.reduce(
    (total, item) => total + item.prescription.estimated_duration_seconds,
    0,
  );
  if (actualDuration !== reportedDuration) return ['duration_out_of_bounds'];

  const withinTolerance =
    actualDuration >= requestedSeconds - toleranceSeconds &&
    actualDuration <= requestedSeconds + toleranceSeconds;
  if (withinTolerance) {
    return durationStatus === 'within_tolerance'
      ? []
      : ['duration_out_of_bounds'];
  }

  const shortestIndivisible = Math.min(
    ...prepared.eligible_candidates
      .filter(
        (candidate) =>
          requiredVariant({
            ...candidate,
            score: 0,
            score_terms: [],
            tie_break: 0,
            matched_target_keys: [],
          }) === null,
      )
      .map(
        (candidate) =>
          createPrescription(
            {
              ...candidate,
              score: 0,
              score_terms: [],
              tie_break: 0,
              matched_target_keys: [],
            },
            prepared.input,
            rules,
          ).estimated_duration_seconds,
      ),
  );
  if (
    durationStatus === 'indivisible_difference' &&
    Number.isFinite(shortestIndivisible) &&
    Math.abs(requestedSeconds - actualDuration) <= shortestIndivisible
  ) {
    return ['duration_indivisible_difference'];
  }

  return ['duration_out_of_bounds'];
}

function targetCoverageIssues(
  coverage: readonly TargetCoverage[],
  items: readonly GeneratedRoutineItem[],
  prepared: PreparedGeneration,
  rules: GenerationRules,
): RoutineValidationCode[] {
  const issues: RoutineValidationCode[] = [];
  const priorities = computeTargetPriorities(prepared.input, rules);
  const selectableCandidates = scoreCandidates(
    prepared.eligible_candidates,
    prepared.input,
    priorities,
    rules,
  ).filter((candidate) => requiredVariant(candidate) === null);
  const selectedExercises = items.flatMap((item) => {
    const candidate = prepared.eligible_candidates.find(
      (entry) =>
        entry.exercise.id === item.exercise_id &&
        entry.exercise.version === item.exercise_version,
    );
    return candidate ? [candidate.exercise] : [];
  });

  if (coverage.length !== prepared.input.target_regions.length) {
    issues.push('target_coverage_unexplained');
  }
  prepared.input.target_regions.forEach((target, index) => {
    const entry = coverage[index];
    const priority = priorities[index];
    const actualExerciseIds = selectedExercises
      .filter((exercise) => exerciseAddressesTarget(exercise, target))
      .map((exercise) => exercise.id);
    const actuallyAddressed = actualExerciseIds.length > 0;
    const hasEligibleCandidate = selectableCandidates.some((candidate) =>
      exerciseAddressesTarget(candidate.exercise, target),
    );
    const expectedOmission = actuallyAddressed
      ? null
      : hasEligibleCandidate
        ? 'routine_constraints_limited_selection'
        : 'no_eligible_candidate';
    if (
      !entry ||
      entry.region_slug !== target.region_slug ||
      entry.side !== target.side ||
      entry.priority_basis_points !== priority?.priority_basis_points ||
      entry.high_priority !== priority?.high_priority ||
      entry.addressed !== actuallyAddressed ||
      !sameStringArray(entry.exercise_ids, actualExerciseIds) ||
      entry.omission_reason_code !== expectedOmission
    ) {
      issues.push('target_coverage_unexplained');
    }
  });

  return issues;
}

function alternativeIssues(
  items: readonly GeneratedRoutineItem[],
  prepared: PreparedGeneration,
): RoutineValidationCode[] {
  const selectedIds = new Set(items.map((item) => item.exercise_id));
  const eligibleByIdentity = new Set(
    prepared.eligible_candidates.map(
      (candidate) => `${candidate.exercise.id}@${candidate.exercise.version}`,
    ),
  );

  for (const item of items) {
    const source = prepared.eligible_candidates.find(
      (candidate) =>
        candidate.exercise.id === item.exercise_id &&
        candidate.exercise.version === item.exercise_version,
    );
    const identities = item.alternatives.map(
      (alternative) =>
        `${alternative.exercise_id}@${alternative.exercise_version}`,
    );
    if (new Set(identities).size !== identities.length) {
      return ['alternative_invalid'];
    }

    for (const alternative of item.alternatives) {
      const relation = source?.exercise.relations.find(
        (entry) =>
          entry.type === alternative.relation_type &&
          entry.target_exercise_id === alternative.exercise_id &&
          entry.supported_modes.includes(prepared.input.mode) &&
          (entry.version_policy === 'compatible' ||
            entry.target_version === alternative.exercise_version),
      );
      if (
        !relation ||
        selectedIds.has(alternative.exercise_id) ||
        !eligibleByIdentity.has(
          `${alternative.exercise_id}@${alternative.exercise_version}`,
        )
      ) {
        return ['alternative_invalid'];
      }
    }
  }

  return [];
}

function scoringAndExplanationIssues(
  items: readonly GeneratedRoutineItem[],
  prepared: PreparedGeneration,
  rules: GenerationRules,
): RoutineValidationCode[] {
  const expectedCandidates = new Map(
    scoreCandidates(
      prepared.eligible_candidates,
      prepared.input,
      computeTargetPriorities(prepared.input, rules),
      rules,
    ).map((candidate) => [candidate.exercise.id, candidate]),
  );
  const issues: RoutineValidationCode[] = [];

  for (const item of items) {
    const expected = expectedCandidates.get(item.exercise_id);
    if (
      !expected ||
      item.score !== expected.score ||
      JSON.stringify(item.score_terms) !== JSON.stringify(expected.score_terms)
    ) {
      issues.push('scoring_invalid');
    }

    const expectedReasons = expected ? selectionReasons(expected) : [];
    const expectedKey = explanationKey(expectedReasons);
    const expectedReferences = expected ? explanationReferences(expected) : [];
    if (
      !sameStringArray(item.selection_reason_codes, expectedReasons) ||
      item.explanation_key !== expectedKey ||
      !sameStringArray(item.explanation_reference_ids, expectedReferences)
    ) {
      issues.push('explanation_invalid');
    }
  }

  return issues;
}

export function validateRoutine(
  items: readonly GeneratedRoutineItem[],
  prepared: PreparedGeneration,
  targetCoverage: readonly TargetCoverage[],
  reportedDuration: number,
  durationStatus: RoutineValidationReport['duration_status'],
  rules: GenerationRules,
): RoutineValidationReport {
  const issues: RoutineValidationCode[] = [];
  const eligibleByIdentity = new Map(
    prepared.eligible_candidates.map((candidate) => [
      `${candidate.exercise.id}@${candidate.exercise.version}`,
      candidate,
    ]),
  );
  const exerciseIds = items.map((item) => item.exercise_id);

  if (items.length === 0) issues.push('empty_routine');
  if (new Set(exerciseIds).size !== exerciseIds.length) {
    issues.push('duplicate_exercise');
  }
  if (items.length > rules.maximum_items) issues.push('item_limit_exceeded');

  const scoredCandidates = new Map<string, ScoredCandidate>();
  for (const item of items) {
    const candidate = eligibleByIdentity.get(
      `${item.exercise_id}@${item.exercise_version}`,
    );
    if (!candidate) {
      issues.push('hard_filter_violation');
      continue;
    }
    const scoredCandidate: ScoredCandidate = {
      ...candidate,
      score: item.score,
      score_terms: item.score_terms,
      tie_break: 0,
      matched_target_keys: [],
    };
    scoredCandidates.set(item.exercise_id, scoredCandidate);
    issues.push(...prescriptionIssues(item, scoredCandidate, prepared, rules));
  }

  issues.push(
    ...phaseBudgetIssues(
      items,
      prepared,
      prepared.input.available_minutes * 60,
    ),
  );

  const patternCounts = new Map<string, number>();
  for (const candidate of scoredCandidates.values()) {
    for (const pattern of candidate.exercise.movement_patterns) {
      patternCounts.set(pattern, (patternCounts.get(pattern) ?? 0) + 1);
    }
  }
  if (
    [...patternCounts.values()].some(
      (count) => count > rules.maximum_same_movement_pattern,
    )
  ) {
    issues.push('movement_pattern_limit_exceeded');
  }

  issues.push(
    ...alternativeIssues(items, prepared),
    ...scoringAndExplanationIssues(items, prepared, rules),
    ...targetCoverageIssues(targetCoverage, items, prepared, rules),
    ...durationIssues(items, reportedDuration, durationStatus, prepared, rules),
  );

  const orderedIssues = uniqueOrderedIssues(issues);
  const blockingIssues = orderedIssues.filter(
    (code) => code !== 'duration_indivisible_difference',
  );
  const requestedDurationSeconds = prepared.input.available_minutes * 60;

  return {
    valid: blockingIssues.length === 0,
    issue_codes: orderedIssues,
    duration_status: durationStatus,
    requested_duration_seconds: requestedDurationSeconds,
    estimated_duration_seconds: reportedDuration,
    tolerance_seconds: Math.floor(
      (requestedDurationSeconds * rules.duration_tolerance_basis_points) /
        10_000,
    ),
    target_coverage: targetCoverage,
  };
}
