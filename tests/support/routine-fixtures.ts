import type { Exercise, RoutineTemplate } from '@/content/schemas';
import {
  generateRoutine,
  type GeneratedRoutine,
  type GenerationInput,
  type GenerationRules,
} from '@/generator';

import {
  generationCatalog,
  generationInput,
  generationRules,
  reviewedExercise,
  reviewedTemplate,
} from './generator-fixtures';

export const routineFixtureSourceId = '51000000-0000-4000-8000-000000000001';
export const routineFixtureAlternativeId =
  '51000000-0000-4000-8000-000000000002';

function flexibleExercise(id: string, magnitude: 2 | 3): Exercise {
  const exercise = reviewedExercise(0, id);
  exercise.slug = `routine_fixture_${id.slice(-1)}`;
  exercise.phases = ['arrival'];
  exercise.movement_patterns = ['rotation'];
  exercise.effects = [
    {
      region_slug: 'thoracic_spine',
      side: 'central',
      effect: 'mobilize',
      magnitude,
      movement_pattern: 'rotation',
      primary: true,
    },
  ];
  exercise.prescription = {
    type: 'timed_movement',
    default: 60,
    minimum: 1,
    maximum: 5_400,
    sets: 1,
    rest_seconds: 0,
    tempo: 'controlled',
    side_mode: 'central',
  };
  exercise.dosage_limits = {
    max_sets_per_routine: 1,
    max_weekly_exposure: null,
    progression_step: 1,
    extendable: true,
  };
  exercise.requirements = {
    equipment: { all_of: [], any_of: [] },
    environments: ['home'],
    position: 'seated',
    space: 'minimal',
    setup_cost: 'low',
  };
  exercise.relations = [];
  return exercise;
}

export function routineFixtureExercises(): readonly Exercise[] {
  const source = flexibleExercise(routineFixtureSourceId, 3);
  const alternative = flexibleExercise(routineFixtureAlternativeId, 2);
  source.relations = [
    {
      type: 'alternative',
      target_exercise_id: alternative.id,
      version_policy: 'pinned',
      target_version: alternative.version,
      supported_modes: ['daily_restore'],
      preserves_effects: ['mobilize'],
    },
  ];
  return [source, alternative];
}

export function routineFixtureTemplate(): RoutineTemplate {
  const template = reviewedTemplate();
  template.phases = [
    {
      phase: 'arrival',
      requirement: 'required',
      minimum_share_basis_points: 10_000,
      target_share_basis_points: 10_000,
      maximum_share_basis_points: 10_000,
    },
  ];
  return template;
}

export function routineFixtureRules(): GenerationRules {
  return {
    ...generationRules(),
    maximum_items: 1,
    maximum_same_movement_pattern: 1,
  };
}

export function routineFixtureInput(
  routineId: string = '52000000-0000-4000-8000-000000000001',
  checkInId: string = '00000000000000000000000001',
  generatedAt: string = '2026-08-30T12:00:00.000Z',
): GenerationInput {
  return {
    ...generationInput(),
    routine_id: routineId,
    check_in_id: checkInId,
    generated_at: generatedAt,
    target_regions: [
      {
        region_slug: 'thoracic_spine',
        side: 'central',
        maximum_rating: null,
        symptom_qualities: [],
      },
    ],
    profile_goal_slugs: ['move_better'],
    seed: `routine_${routineId}`,
  };
}

export function createRoutineFixture(
  input: GenerationInput = routineFixtureInput(),
): GeneratedRoutine {
  const result = generateRoutine(
    input,
    generationCatalog(routineFixtureExercises(), [routineFixtureTemplate()]),
    routineFixtureRules(),
  );
  if (!result.ok) throw new Error(`routine_fixture_failed:${result.code}`);
  return result;
}
