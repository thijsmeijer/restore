import {
  generationInputSchema,
  generatorEngineVersion,
} from '@/generator/input-schema';
import { filterEligibleCandidates } from '@/generator/hard-filter';
import type {
  GenerationCatalog,
  GenerationFailure,
  GenerationFailureCode,
  GenerationRules,
  PrepareGenerationResult,
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

function failure(code: GenerationFailureCode): GenerationFailure {
  return {
    ok: false,
    code,
    explanation_key: failureExplanationKeys[code],
    rejection_report: [],
  };
}

function valuesAreUnique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function hasValidSnapshotCollections(
  input: ReturnType<typeof generationInputSchema.parse>,
): boolean {
  return (
    valuesAreUnique(input.available_equipment) &&
    valuesAreUnique(input.unstable_equipment) &&
    input.unstable_equipment.every((item) =>
      input.available_equipment.includes(item),
    ) &&
    valuesAreUnique(input.safety_matched_rule_ids) &&
    valuesAreUnique(input.safety_reason_codes) &&
    valuesAreUnique(input.restricted_demand_flags) &&
    valuesAreUnique(input.profile_goal_slugs) &&
    valuesAreUnique(input.recent_exercise_ids) &&
    valuesAreUnique(input.preferences.map((entry) => entry.exercise_id)) &&
    valuesAreUnique(
      input.response_aggregates.map((entry) => entry.exercise_id),
    ) &&
    valuesAreUnique(
      input.target_regions.map(
        (target) => `${target.region_slug}:${target.side}`,
      ),
    ) &&
    input.target_regions.every((target) =>
      valuesAreUnique(target.symptom_qualities),
    ) &&
    input.preferences.every((entry) => {
      if (entry.avoid_state === 'temporary') return entry.avoid_until !== null;
      return entry.avoid_until === null;
    })
  );
}

function templateHasExactClinicalReview(
  template: GenerationCatalog['templates'][number],
): boolean {
  return (
    template.status === 'clinical_reviewed' &&
    template.review.engineering?.reviewed_version === template.version &&
    template.review.clinical?.reviewed_version === template.version
  );
}

function hasValidRules(rules: GenerationRules): boolean {
  const isIntegerBetween = (
    value: number,
    minimum: number,
    maximum: number,
  ): boolean =>
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum;
  const isBoundedPositiveSecondValue = (value: number): boolean =>
    isIntegerBetween(value, 1, 3_600);
  const scoring = rules.scoring;
  if (!scoring || !Array.isArray(rules.goal_effect_mappings)) return false;

  return (
    rules.rules_version.length > 0 &&
    rules.configuration_version.length > 0 &&
    rules.safety_rules_version.length > 0 &&
    isBoundedPositiveSecondValue(rules.seconds_per_repetition) &&
    isBoundedPositiveSecondValue(rules.seconds_per_breathing_cycle) &&
    isBoundedPositiveSecondValue(rules.seconds_per_reassessment) &&
    Number.isFinite(rules.transition_seconds) &&
    Number.isInteger(rules.transition_seconds) &&
    rules.transition_seconds >= 0 &&
    rules.transition_seconds <= 3_600 &&
    isIntegerBetween(rules.duration_tolerance_basis_points, 0, 5_000) &&
    isIntegerBetween(rules.high_priority_target_count, 0, 100) &&
    isIntegerBetween(rules.target_priority_step_basis_points, 0, 10_000) &&
    isIntegerBetween(rules.minimum_target_priority_basis_points, 0, 10_000) &&
    isIntegerBetween(
      rules.profile_goal_priority_step_basis_points,
      0,
      10_000,
    ) &&
    isIntegerBetween(
      rules.minimum_profile_goal_priority_basis_points,
      0,
      10_000,
    ) &&
    rules.goal_effect_mappings.length <= 64 &&
    valuesAreUnique(
      rules.goal_effect_mappings.map((mapping) => mapping.goal_slug),
    ) &&
    rules.goal_effect_mappings.every(
      (mapping) =>
        mapping.goal_slug.length > 0 &&
        mapping.effects.length > 0 &&
        valuesAreUnique(mapping.effects),
    ) &&
    isIntegerBetween(rules.maximum_items, 1, 50) &&
    isIntegerBetween(rules.maximum_same_movement_pattern, 1, 20) &&
    isIntegerBetween(scoring.target_match, 0, 1_000_000) &&
    isIntegerBetween(scoring.primary_effect_bonus, 0, 1_000_000) &&
    isIntegerBetween(scoring.intent_match, 0, 1_000_000) &&
    isIntegerBetween(scoring.profile_goal_match, 0, 1_000_000) &&
    isIntegerBetween(scoring.training_context_match, 0, 1_000_000) &&
    isIntegerBetween(scoring.favorite, 0, 1_000_000) &&
    isIntegerBetween(scoring.helpful_response_each, 0, 1_000_000) &&
    isIntegerBetween(scoring.helpful_response_cap, 0, 1_000_000) &&
    isIntegerBetween(scoring.uncomfortable_response_each, -1_000_000, 0) &&
    isIntegerBetween(scoring.uncomfortable_response_cap, 0, 1_000_000) &&
    isIntegerBetween(scoring.preference_skip_each, -1_000_000, 0) &&
    isIntegerBetween(scoring.preference_skip_cap, 0, 1_000_000) &&
    isIntegerBetween(scoring.preference_replacement_each, -1_000_000, 0) &&
    isIntegerBetween(scoring.preference_replacement_cap, 0, 1_000_000) &&
    isIntegerBetween(scoring.history_combined_cap, 0, 1_000_000) &&
    isIntegerBetween(scoring.recent_exposure_penalty, -1_000_000, 0)
  );
}

function catalogHasDuplicateExercises(catalog: GenerationCatalog): boolean {
  const exerciseIds = catalog.exercises.map((exercise) => exercise.id);
  return !valuesAreUnique(exerciseIds);
}

export function prepareGeneration(
  rawInput: unknown,
  catalog: GenerationCatalog,
  rules: GenerationRules,
): PrepareGenerationResult {
  const parsed = generationInputSchema.safeParse(rawInput);
  if (!parsed.success || !hasValidSnapshotCollections(parsed.data)) {
    return failure('input_invalid');
  }

  const input = parsed.data;
  if (input.content_version !== catalog.content_version) {
    return failure('content_version_mismatch');
  }
  if (
    !hasValidRules(rules) ||
    input.engine_version !== generatorEngineVersion ||
    input.rules_version !== rules.rules_version ||
    input.configuration_version !== rules.configuration_version ||
    input.safety_rules_version !== rules.safety_rules_version
  ) {
    return failure('version_mismatch');
  }
  if (input.safety_state === 'blocked') {
    return failure('blocked_by_safety');
  }
  if (catalogHasDuplicateExercises(catalog)) {
    return failure('catalog_duplicate_exercise');
  }
  if (catalog.review_status !== 'clinical_reviewed') {
    return failure('catalog_not_clinically_reviewed');
  }

  const eligibleSafetyState = input.safety_state;

  const matchingTemplates = catalog.templates.filter(
    (template) =>
      templateHasExactClinicalReview(template) &&
      template.mode === input.mode &&
      template.minimum_minutes <= input.available_minutes &&
      template.maximum_minutes >= input.available_minutes &&
      template.allowed_safety_states.includes(eligibleSafetyState),
  );

  if (matchingTemplates.length === 0) return failure('template_unavailable');
  if (matchingTemplates.length > 1) return failure('template_ambiguous');

  const template = matchingTemplates[0];
  if (!template) return failure('template_unavailable');

  const filtered = filterEligibleCandidates(
    catalog.exercises,
    input,
    template,
    rules,
  );
  if (filtered.eligible.length === 0) {
    return {
      ...failure('no_eligible_content'),
      rejection_report: filtered.rejected,
    };
  }

  return {
    ok: true,
    input,
    template,
    eligible_candidates: filtered.eligible,
    rejection_report: filtered.rejected,
  };
}
