import type { Exercise } from '@/content/schemas';
import {
  explanationKey,
  explanationReferences,
  selectionReasons,
} from '@/generator/explanations';
import { prepareGeneration } from '@/generator/prepare-generation';
import { requiredVariant, warningKeys } from '@/generator/prescription';
import { buildRoutineSelections } from '@/generator/routine-builder';
import { validateRoutine } from '@/generator/routine-validation';
import { computeTargetPriorities, scoreCandidates } from '@/generator/scoring';
import { exerciseAddressesTarget } from '@/generator/targeting';
import type {
  GeneratedRoutineItem,
  GenerationCatalog,
  GenerationFailure,
  GenerationFailureCode,
  GenerationResult,
  GenerationRules,
  PreparedGeneration,
  RoutineAlternative,
  ScoredCandidate,
  TargetCoverage,
  TargetPriority,
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

function candidateAlternatives(
  candidate: ScoredCandidate,
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
        (relation.version_policy === 'compatible' ||
          entry.exercise.version === relation.target_version),
    );
    if (!target) continue;
    if (selectedExerciseIds.has(target.exercise.id)) continue;

    alternatives.push({
      relation_type: relation.type,
      exercise_id: target.exercise.id,
      exercise_version: target.exercise.version,
    });
  }

  return alternatives;
}

function targetCoverage(
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
      const reasons = selectionReasons(selection.candidate);
      return {
        order,
        phase: phase?.phase ?? 'arrival',
        exercise_id: selection.candidate.exercise.id,
        exercise_version: selection.candidate.exercise.version,
        prescription: selection.prescription,
        selection_reason_codes: reasons,
        explanation_key: explanationKey(reasons),
        explanation_reference_ids: explanationReferences(selection.candidate),
        caution_rule_ids: selection.candidate.caution_rule_ids,
        warning_keys: warningKeys(selection.candidate),
        alternatives: candidateAlternatives(
          selection.candidate,
          prepared,
          selectedExerciseIds,
        ),
        score: selection.candidate.score,
        score_terms: selection.candidate.score_terms,
      };
    },
  );
  const selectedExercises = orderedSelections.map(
    (selection) => selection.candidate.exercise,
  );
  const selectableCandidates = scoredCandidates.filter(
    (candidate) => requiredVariant(candidate) === null,
  );
  const coverage = targetCoverage(
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
