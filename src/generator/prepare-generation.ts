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
  input_invalid: 'generator.failure.input_invalid',
  no_eligible_content: 'generator.failure.no_eligible_content',
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
  const isBoundedPositiveSecondValue = (value: number): boolean =>
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= 3_600;

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
    rules.transition_seconds <= 3_600
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
  if (catalogHasDuplicateExercises(catalog)) {
    return failure('catalog_duplicate_exercise');
  }
  if (input.safety_state === 'blocked') {
    return failure('blocked_by_safety');
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
