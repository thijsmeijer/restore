import { bundledCatalog } from '@/content/bundled-catalog';
import type { Exercise, RoutineTemplate } from '@/content/schemas';
import {
  engineeringGenerationRules,
  generatorEngineVersion,
} from '@/generator';
import type {
  GenerationCatalog,
  GenerationInput,
  GenerationRules,
} from '@/generator';

export const generatorFixtureTimestamp = '2026-08-30T12:00:00.000Z';

function reviewedMetadata(version: number) {
  return {
    engineering: {
      reviewer_role: 'engineering' as const,
      reviewed_at: generatorFixtureTimestamp,
      reviewed_version: version,
      notes_reference: 'tests/generator-fixtures',
    },
    clinical: {
      reviewer_role: 'clinical' as const,
      reviewed_at: generatorFixtureTimestamp,
      reviewed_version: version,
      notes_reference: 'tests/generator-fixtures',
    },
  };
}

export function reviewedExercise(
  sourceIndex: number = 0,
  id?: string,
): Exercise {
  const source = bundledCatalog.manifest.exercises[sourceIndex];
  if (!source)
    throw new Error(`missing_generator_fixture_source:${sourceIndex}`);

  const exercise = structuredClone(source);
  if (id) exercise.id = id;
  exercise.status = 'clinical_reviewed';
  exercise.review = reviewedMetadata(exercise.version);
  exercise.contraindications = exercise.contraindications.map((rule) => ({
    ...rule,
    review: reviewedMetadata(exercise.version),
  }));
  return exercise;
}

export function reviewedTemplate(): RoutineTemplate {
  return {
    id: '30000000-0000-4000-8000-000000000001',
    version: 1,
    status: 'clinical_reviewed',
    mode: 'daily_restore',
    minimum_minutes: 2,
    maximum_minutes: 90,
    allowed_safety_states: ['clear', 'gentle_only'],
    intensity_ceiling: 'very_gentle',
    phases: [
      {
        phase: 'arrival',
        requirement: 'required',
        minimum_share_basis_points: 1_000,
        target_share_basis_points: 1_500,
        maximum_share_basis_points: 3_000,
      },
      {
        phase: 'targeted_mobility',
        requirement: 'required',
        minimum_share_basis_points: 4_000,
        target_share_basis_points: 5_500,
        maximum_share_basis_points: 6_500,
      },
      {
        phase: 'cooldown',
        requirement: 'optional',
        minimum_share_basis_points: 0,
        target_share_basis_points: 3_000,
        maximum_share_basis_points: 3_000,
      },
    ],
    fallback_policy: 'explicit_failure',
    review: reviewedMetadata(1),
    created_at: generatorFixtureTimestamp,
    retired_at: null,
  };
}

export function generationInput(): GenerationInput {
  return {
    schema_version: 2,
    routine_id: '40000000-0000-4000-8000-000000000002',
    check_in_id: '40000000-0000-4000-8000-000000000001',
    generated_at: generatorFixtureTimestamp,
    mode: 'daily_restore',
    available_minutes: 5,
    environment: 'home',
    available_space: 'small',
    available_equipment: [],
    unstable_equipment: [],
    safety_state: 'clear',
    safety_rules_version: 'check_in_safety_engineering_2026_08_30',
    safety_matched_rule_ids: [],
    safety_reason_codes: [],
    target_regions: [
      {
        region_slug: 'wrist',
        side: 'bilateral',
        maximum_rating: null,
        symptom_qualities: [],
      },
    ],
    intent: 'mobilize',
    recent_major_trauma: false,
    restricted_demand_flags: [],
    profile_goal_slugs: ['move_better'],
    training_context: null,
    preferences: [],
    response_aggregates: [],
    recent_exercise_ids: [],
    content_version: '0.1.0',
    engine_version: generatorEngineVersion,
    rules_version: 'routine_rules_v1',
    configuration_version: '1.1.0',
    seed: 'fixed_seed',
  };
}

export function generationRules(): GenerationRules {
  return structuredClone(engineeringGenerationRules);
}

export function generationCatalog(
  exercises: readonly Exercise[],
  templates: readonly RoutineTemplate[] = [reviewedTemplate()],
): GenerationCatalog {
  return {
    content_version: '0.1.0',
    review_status: 'clinical_reviewed',
    exercises,
    templates,
  };
}
