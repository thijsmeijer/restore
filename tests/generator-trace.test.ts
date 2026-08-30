import type { Exercise, RoutineTemplate } from '@/content/schemas';
import {
  createGenerationTrace,
  formatGenerationTrace,
  serializeGenerationTrace,
} from '@/generator';
import {
  generationCatalog,
  generationInput,
  generationRules,
  reviewedExercise,
  reviewedTemplate,
} from './support/generator-fixtures';

function traceExercise(): Exercise {
  const exercise = reviewedExercise(0);
  exercise.phases = ['arrival'];
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
  return exercise;
}

function traceTemplate(): RoutineTemplate {
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

describe('GEN-003 generator trace', () => {
  it('produces a deterministic human-readable trace for a valid routine', () => {
    const input = generationInput();
    const catalog = generationCatalog([traceExercise()], [traceTemplate()]);
    const rules = generationRules();

    const first = createGenerationTrace(input, catalog, rules);
    const second = createGenerationTrace(
      structuredClone(input),
      catalog,
      rules,
    );

    expect(first.outcome.type).toBe('routine');
    expect(first.stages.every((stage) => stage.status === 'passed')).toBe(true);
    expect(first.candidates).toEqual([
      expect.objectContaining({
        selected: true,
        score_terms: expect.any(Array),
      }),
    ]);
    expect(first.outcome).toMatchObject({
      type: 'routine',
      items: [
        {
          prescription: {
            type: 'timed_movement',
            dose: expect.any(Number),
            sets: 1,
            estimated_duration_seconds: 300,
          },
        },
      ],
    });
    expect(serializeGenerationTrace(first)).toBe(
      serializeGenerationTrace(second),
    );
    expect(formatGenerationTrace(first)).toContain('Decision stages');
    expect(formatGenerationTrace(first)).toContain('selected');
  });

  it('omits owner identifiers and health-adjacent input values by default', () => {
    const exercise = traceExercise();
    const input = {
      ...generationInput(),
      generated_at: '2030-06-07T08:09:10.000Z',
      seed: 'private_seed_value',
      available_equipment: ['private_equipment_value'],
      safety_reason_codes: ['private_safety_value'],
      target_regions: [
        {
          region_slug: 'private_region_value',
          side: 'central' as const,
          maximum_rating: 9,
          symptom_qualities: ['private_quality_value'],
        },
      ],
      profile_goal_slugs: ['private_goal_value'],
      training_context: {
        training_type: 'private_training_value',
        status: 'planned' as const,
        stress: 5,
      },
      preferences: [
        {
          exercise_id: exercise.id,
          favorite: true,
          avoid_state: 'none' as const,
          avoid_until: null,
        },
      ],
    };
    const serialized = serializeGenerationTrace(
      createGenerationTrace(
        input,
        generationCatalog([exercise], [traceTemplate()]),
        generationRules(),
      ),
    );

    [
      input.routine_id,
      input.check_in_id,
      input.generated_at,
      input.seed,
      'private_equipment_value',
      'private_safety_value',
      'private_region_value',
      'private_quality_value',
      'private_goal_value',
      'private_training_value',
      'maximum_rating',
      'symptom_qualities',
      'target_regions',
      'available_equipment',
      'reference_id',
    ].forEach((privateValue) => expect(serialized).not.toContain(privateValue));
  });

  it('records stable failure stages and redacted rejection reasons', () => {
    const exercise = traceExercise();
    const catalog = generationCatalog([exercise], [traceTemplate()]);
    const blocked = createGenerationTrace(
      { ...generationInput(), safety_state: 'blocked' },
      catalog,
      generationRules(),
    );

    expect(blocked.outcome).toMatchObject({
      type: 'failure',
      code: 'blocked_by_safety',
    });
    expect(blocked.stages).toContainEqual({
      name: 'safety_gate',
      status: 'failed',
      reason_codes: ['blocked_by_safety'],
    });

    const avoided = createGenerationTrace(
      {
        ...generationInput(),
        preferences: [
          {
            exercise_id: exercise.id,
            favorite: false,
            avoid_state: 'permanent',
            avoid_until: null,
          },
        ],
      },
      catalog,
      generationRules(),
    );
    expect(avoided.outcome).toMatchObject({
      type: 'failure',
      code: 'no_eligible_content',
    });
    expect(avoided.rejections).toEqual([
      {
        exercise_id: exercise.id,
        exercise_version: exercise.version,
        reason_codes: ['user_avoided'],
      },
    ]);
  });
});
