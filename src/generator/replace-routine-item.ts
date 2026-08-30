import { prepareGeneration } from '@/generator/prepare-generation';
import {
  createPrescription,
  maximumSelectableDose,
  requiredVariant,
} from '@/generator/prescription';
import {
  composeRoutineItem,
  computeTargetCoverage,
} from '@/generator/routine-composition';
import { validateRoutine } from '@/generator/routine-validation';
import { computeTargetPriorities, scoreCandidates } from '@/generator/scoring';
import type {
  ExactPrescription,
  GeneratedRoutine,
  GenerationCatalog,
  GenerationFailure,
  GenerationResult,
  GenerationRules,
  ScoredCandidate,
} from '@/generator/types';

export interface ReplaceRoutineItemInput {
  readonly routine: GeneratedRoutine;
  readonly item_order: number;
  readonly replacement_exercise_id: string;
  readonly routine_id: string;
  readonly generated_at: string;
}

function failure(
  code: 'replacement_unavailable' | 'routine_invalid',
): GenerationFailure {
  return {
    ok: false,
    code,
    explanation_key: `generator.failure.${code}`,
    rejection_report: [],
  };
}

function closestPrescription(
  candidate: ScoredCandidate,
  requestedSeconds: number,
  routine: GeneratedRoutine,
  rules: GenerationRules,
): ExactPrescription {
  let best = createPrescription(candidate, routine.input_snapshot, rules);
  const maximumDose = maximumSelectableDose(candidate);
  for (
    let dose = candidate.exercise.prescription.minimum + 1;
    dose <= maximumDose;
    dose += 1
  ) {
    const prescription = createPrescription(
      candidate,
      routine.input_snapshot,
      rules,
      dose,
    );
    if (
      Math.abs(prescription.estimated_duration_seconds - requestedSeconds) <
      Math.abs(best.estimated_duration_seconds - requestedSeconds)
    ) {
      best = prescription;
    }
  }
  return best;
}

export function replaceRoutineItem(
  request: ReplaceRoutineItemInput,
  catalog: GenerationCatalog,
  rules: GenerationRules,
): GenerationResult {
  const sourceItem = request.routine.items[request.item_order];
  const listedAlternative = sourceItem?.alternatives.find(
    (alternative) =>
      alternative.exercise_id === request.replacement_exercise_id,
  );
  if (!sourceItem || !listedAlternative) {
    return failure('replacement_unavailable');
  }

  const nextInput = {
    ...request.routine.input_snapshot,
    routine_id: request.routine_id,
    generated_at: request.generated_at,
  };
  const prepared = prepareGeneration(nextInput, catalog, rules);
  if (!prepared.ok) return prepared;
  if (
    prepared.template.id !== request.routine.template_id ||
    prepared.template.version !== request.routine.template_version
  ) {
    return failure('replacement_unavailable');
  }

  const priorities = computeTargetPriorities(prepared.input, rules);
  const scoredCandidates = scoreCandidates(
    prepared.eligible_candidates,
    prepared.input,
    priorities,
    rules,
  );
  const candidatesById = new Map(
    scoredCandidates.map((candidate) => [candidate.exercise.id, candidate]),
  );
  const replacementCandidate = candidatesById.get(
    listedAlternative.exercise_id,
  );
  if (
    !replacementCandidate ||
    replacementCandidate.exercise.version !==
      listedAlternative.exercise_version ||
    !replacementCandidate.exercise.phases.includes(sourceItem.phase) ||
    requiredVariant(replacementCandidate) !== null ||
    request.routine.items.some(
      (item) =>
        item.order !== sourceItem.order &&
        item.exercise_id === replacementCandidate.exercise.id,
    )
  ) {
    return failure('replacement_unavailable');
  }

  const selectedCandidates: ScoredCandidate[] = [];
  for (const item of request.routine.items) {
    const candidate =
      item.order === sourceItem.order
        ? replacementCandidate
        : candidatesById.get(item.exercise_id);
    if (
      !candidate ||
      (item.order !== sourceItem.order &&
        candidate.exercise.version !== item.exercise_version)
    ) {
      return failure('replacement_unavailable');
    }
    selectedCandidates.push(candidate);
  }
  const selectedIds = new Set(
    selectedCandidates.map((candidate) => candidate.exercise.id),
  );
  const replacementPrescription = closestPrescription(
    replacementCandidate,
    sourceItem.prescription.estimated_duration_seconds,
    { ...request.routine, input_snapshot: prepared.input },
    rules,
  );
  const items = request.routine.items.map((item, index) => {
    const candidate = selectedCandidates[index];
    if (!candidate) throw new Error('Routine candidate order is incomplete.');
    return composeRoutineItem(
      candidate,
      item.phase,
      item.order,
      item.order === sourceItem.order
        ? replacementPrescription
        : item.prescription,
      prepared,
      selectedIds,
    );
  });
  const estimatedDuration = items.reduce(
    (total, item) => total + item.prescription.estimated_duration_seconds,
    0,
  );
  const requestedDuration = prepared.input.available_minutes * 60;
  const tolerance = Math.floor(
    (requestedDuration * rules.duration_tolerance_basis_points) / 10_000,
  );
  const durationStatus =
    estimatedDuration >= requestedDuration - tolerance &&
    estimatedDuration <= requestedDuration + tolerance
      ? 'within_tolerance'
      : 'indivisible_difference';
  const selectableCandidates = scoredCandidates.filter(
    (candidate) => requiredVariant(candidate) === null,
  );
  const coverage = computeTargetCoverage(
    prepared,
    priorities,
    selectedCandidates.map((candidate) => candidate.exercise),
    selectableCandidates,
  );
  const validation = validateRoutine(
    items,
    prepared,
    coverage,
    estimatedDuration,
    durationStatus,
    rules,
  );
  if (!validation.valid) return failure('routine_invalid');

  return {
    ok: true,
    routine_id: prepared.input.routine_id,
    check_in_id: prepared.input.check_in_id,
    generated_at: prepared.input.generated_at,
    input_snapshot: prepared.input,
    template_id: prepared.template.id,
    template_version: prepared.template.version,
    mode: prepared.input.mode,
    content_version: prepared.input.content_version,
    engine_version: prepared.input.engine_version,
    rules_version: prepared.input.rules_version,
    configuration_version: prepared.input.configuration_version,
    seed: prepared.input.seed,
    target_priorities: priorities,
    items,
    estimated_duration_seconds: estimatedDuration,
    explanation_key: request.routine.explanation_key,
    validation,
    rejection_report: prepared.rejection_report,
  };
}
