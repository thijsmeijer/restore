import { prepareGeneration } from '@/generator/prepare-generation';
import { requiredVariant } from '@/generator/prescription';
import {
  composeRoutineItem,
  computeTargetCoverage,
} from '@/generator/routine-composition';
import { buildRoutineSelections } from '@/generator/routine-builder';
import { validateRoutine } from '@/generator/routine-validation';
import { computeTargetPriorities, scoreCandidates } from '@/generator/scoring';
import type {
  GeneratedRoutineItem,
  GenerationCatalog,
  GenerationFailure,
  GenerationFailureCode,
  GenerationResult,
  GenerationRules,
  PreparedGeneration,
} from '@/generator/types';

const failureExplanationKeys: Record<GenerationFailureCode, string> = {
  blocked_by_safety: 'generator.failure.blocked_by_safety',
  catalog_duplicate_exercise: 'generator.failure.catalog_duplicate_exercise',
  catalog_not_clinically_reviewed:
    'generator.failure.catalog_not_clinically_reviewed',
  content_version_mismatch: 'generator.failure.content_version_mismatch',
  duration_unfillable: 'generator.failure.duration_unfillable',
  input_invalid: 'generator.failure.input_invalid',
  no_eligible_content: 'generator.failure.no_eligible_content',
  phase_unfillable: 'generator.failure.phase_unfillable',
  replacement_unavailable: 'generator.failure.replacement_unavailable',
  routine_invalid: 'generator.failure.routine_invalid',
  template_ambiguous: 'generator.failure.template_ambiguous',
  template_unavailable: 'generator.failure.template_unavailable',
  version_mismatch: 'generator.failure.version_mismatch',
};

function generationFailure(
  code: GenerationFailureCode,
  prepared?: PreparedGeneration,
): GenerationFailure {
  return {
    ok: false,
    code,
    explanation_key: failureExplanationKeys[code],
    rejection_report: prepared?.rejection_report ?? [],
  };
}

export function generateRoutine(
  rawInput: unknown,
  catalog: GenerationCatalog,
  rules: GenerationRules,
): GenerationResult {
  const prepared = prepareGeneration(rawInput, catalog, rules);
  if (!prepared.ok) return prepared;

  const priorities = computeTargetPriorities(prepared.input, rules);
  const scoredCandidates = scoreCandidates(
    prepared.eligible_candidates,
    prepared.input,
    priorities,
    rules,
  );
  const build = buildRoutineSelections(
    scoredCandidates,
    prepared.input,
    prepared.template,
    priorities,
    rules,
  );
  if (!build.ok) return generationFailure(build.code, prepared);

  const orderedSelections = [...build.selections].sort(
    (left, right) =>
      left.phase_index - right.phase_index ||
      right.candidate.score - left.candidate.score ||
      left.candidate.tie_break - right.candidate.tie_break ||
      left.candidate.exercise.id.localeCompare(right.candidate.exercise.id),
  );
  const selectedExerciseIds = new Set(
    orderedSelections.map((selection) => selection.candidate.exercise.id),
  );
  const items: GeneratedRoutineItem[] = orderedSelections.map(
    (selection, order) => {
      const phase = prepared.template.phases[selection.phase_index];
      return composeRoutineItem(
        selection.candidate,
        phase?.phase ?? 'arrival',
        order,
        selection.prescription,
        prepared,
        selectedExerciseIds,
      );
    },
  );
  const selectedExercises = orderedSelections.map(
    (selection) => selection.candidate.exercise,
  );
  const selectableCandidates = scoredCandidates.filter(
    (candidate) => requiredVariant(candidate) === null,
  );
  const coverage = computeTargetCoverage(
    prepared,
    priorities,
    selectedExercises,
    selectableCandidates,
  );
  const validation = validateRoutine(
    items,
    prepared,
    coverage,
    build.estimated_duration_seconds,
    build.duration_status,
    rules,
  );
  if (!validation.valid) return generationFailure('routine_invalid', prepared);

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
    estimated_duration_seconds: build.estimated_duration_seconds,
    explanation_key: 'generator.routine.based_on_check_in',
    validation,
    rejection_report: prepared.rejection_report,
  };
}
