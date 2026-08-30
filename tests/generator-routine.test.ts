import { generateRoutine, validateRoutine } from '@/generator';
import { bundledCatalog } from '@/content/bundled-catalog';
import type { Exercise, RoutineTemplate } from '@/content/schemas';
import type {
  GeneratedRoutine,
  GenerationInput,
  GenerationRules,
  PreparedGeneration,
  ScoredCandidate,
} from '@/generator';
import goldenFiveMinuteRoutine from './fixtures/generator/golden-five-minute-routine.json';
import { prepareGeneration } from '@/generator';
import { computeTargetPriorities, scoreCandidates } from '@/generator/scoring';
import {
  generationCatalog,
  generationInput,
  generationRules,
  reviewedExercise,
  reviewedTemplate,
} from './support/generator-fixtures';

function targetExercise(
  id: string,
  pattern: Exercise['movement_patterns'][number],
): Exercise {
  const exercise = reviewedExercise(7, id);
  exercise.slug = `fixture_${id.slice(-3)}`;
  exercise.phases = ['targeted_mobility'];
  exercise.intensity = 'very_gentle';
  exercise.movement_patterns = [pattern];
  exercise.effects = [
    {
      region_slug: 'wrist',
      side: 'bilateral',
      effect: 'mobilize',
      magnitude: 3,
      movement_pattern: pattern,
      primary: true,
    },
  ];
  exercise.prescription = {
    type: 'timed_movement',
    default: 90,
    minimum: 60,
    maximum: 120,
    sets: 1,
    rest_seconds: 0,
    tempo: 'controlled',
    side_mode: 'bilateral_simultaneous',
  };
  exercise.dosage_limits = {
    max_sets_per_routine: 1,
    max_weekly_exposure: null,
    progression_step: 5,
    extendable: true,
  };
  return exercise;
}

function routineExercises(): Exercise[] {
  return [
    reviewedExercise(0),
    reviewedExercise(1),
    targetExercise(
      '50000000-0000-4000-8000-000000000001',
      'wrist_flexion_extension_deviation',
    ),
    targetExercise('50000000-0000-4000-8000-000000000002', 'rotation'),
    targetExercise('50000000-0000-4000-8000-000000000003', 'flexion_extension'),
  ];
}

function singlePhaseTemplate(): RoutineTemplate {
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

function flexibleArrivalExercise(): Exercise {
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

function requireRoutine(
  result: ReturnType<typeof generateRoutine>,
): GeneratedRoutine {
  if (!result.ok) throw new Error(`expected_routine:${result.code}`);
  expect(result.ok).toBe(true);
  return result;
}

describe('GEN-002 deterministic routine generation', () => {
  it('matches the reviewed five-minute golden scenario', () => {
    const result = requireRoutine(
      generateRoutine(
        generationInput(),
        generationCatalog(routineExercises()),
        generationRules(),
      ),
    );

    expect(result).toMatchObject({
      ok: true,
      routine_id: '40000000-0000-4000-8000-000000000002',
      check_in_id: '40000000-0000-4000-8000-000000000001',
      template_id: '30000000-0000-4000-8000-000000000001',
      template_version: 1,
      mode: 'daily_restore',
      content_version: '0.1.0',
      engine_version: '0.2.0',
      rules_version: 'routine_rules_v1',
      configuration_version: '1.0.0',
      seed: 'fixed_seed',
      estimated_duration_seconds: 295,
      target_priorities: [
        {
          region_slug: 'wrist',
          side: 'bilateral',
          priority_basis_points: 10_000,
          high_priority: true,
        },
      ],
      validation: {
        valid: true,
        issue_codes: [],
        duration_status: 'within_tolerance',
        requested_duration_seconds: 300,
        estimated_duration_seconds: 295,
        tolerance_seconds: 30,
        target_coverage: [
          {
            region_slug: 'wrist',
            side: 'bilateral',
            addressed: true,
            omission_reason_code: null,
          },
        ],
      },
    });
    expect(result.items.map((item) => item.phase)).toEqual([
      'arrival',
      'targeted_mobility',
      'targeted_mobility',
      'cooldown',
    ]);
    expect(result.items.map((item) => item.order)).toEqual([0, 1, 2, 3]);
    expect(new Set(result.items.map((item) => item.exercise_id)).size).toBe(4);
    expect(
      result.items
        .filter((item) => item.phase === 'targeted_mobility')
        .every((item) => item.selection_reason_codes.includes('target_match')),
    ).toBe(true);
    expect({
      engine_version: result.engine_version,
      estimated_duration_seconds: result.estimated_duration_seconds,
      items: result.items.map((item) => ({
        phase: item.phase,
        exercise_id: item.exercise_id,
        exercise_version: item.exercise_version,
        dose: item.prescription.dose,
        sets: item.prescription.sets,
        estimated_duration_seconds:
          item.prescription.estimated_duration_seconds,
        selection_reason_codes: item.selection_reason_codes,
      })),
      duration_status: result.validation.duration_status,
      validation_issue_codes: result.validation.issue_codes,
    }).toEqual(goldenFiveMinuteRoutine);
  });

  it('is byte-equivalent for the same complete input snapshot', () => {
    const input = generationInput();
    const catalog = generationCatalog(routineExercises());
    const rules = generationRules();

    const first = generateRoutine(input, catalog, rules);
    const second = generateRoutine(structuredClone(input), catalog, rules);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('uses the supplied seed only as a stable tie-breaker', () => {
    const catalog = generationCatalog(routineExercises());
    const rules = generationRules();
    const first = requireRoutine(
      generateRoutine(generationInput(), catalog, rules),
    );
    const second = requireRoutine(
      generateRoutine(
        { ...generationInput(), seed: 'third_seed' },
        catalog,
        rules,
      ),
    );
    const targetedIds = (routine: GeneratedRoutine) =>
      routine.items
        .filter((item) => item.phase === 'targeted_mobility')
        .map((item) => item.exercise_id);

    expect(targetedIds(first)).not.toEqual(targetedIds(second));
    expect(first.validation.valid).toBe(true);
    expect(second.validation.valid).toBe(true);
  });

  it('bounds preference history and keeps it subordinate to hard filtering', () => {
    const exercises = routineExercises();
    const preferred = exercises[2]!;
    const avoided = exercises[3]!;
    const input: GenerationInput = {
      ...generationInput(),
      preferences: [
        {
          exercise_id: preferred.id,
          favorite: true,
          avoid_state: 'none',
          avoid_until: null,
        },
        {
          exercise_id: avoided.id,
          favorite: true,
          avoid_state: 'permanent',
          avoid_until: null,
        },
      ],
      response_aggregates: [
        {
          exercise_id: preferred.id,
          helpful_count: 100,
          neutral_count: 100,
          uncomfortable_count: 0,
          preference_skip_count: 0,
          preference_replacement_count: 0,
        },
      ],
    };
    const rules: GenerationRules = {
      ...generationRules(),
      scoring: {
        ...generationRules().scoring,
        history_combined_cap: 50,
      },
    };
    const catalog = generationCatalog(exercises);
    const prepared = prepareGeneration(input, catalog, rules);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;

    const scored = scoreCandidates(
      prepared.eligible_candidates,
      prepared.input,
      computeTargetPriorities(prepared.input, rules),
      rules,
    );
    const preferredScore = scored.find(
      (candidate) => candidate.exercise.id === preferred.id,
    );
    const historyPoints = preferredScore?.score_terms
      .filter((term) =>
        [
          'favorite',
          'helpful_response',
          'uncomfortable_response',
          'preference_skip',
          'preference_replacement',
          'history_cap_adjustment',
        ].includes(term.code),
      )
      .reduce((total, term) => total + term.points, 0);

    expect(historyPoints).toBe(50);
    expect(preferredScore?.score_terms).toContainEqual({
      code: 'history_cap_adjustment',
      points: -40,
      reference_id: preferred.id,
    });
    expect(
      prepared.rejection_report.find(
        (entry) => entry.exercise_id === avoided.id,
      )?.reasons,
    ).toContainEqual({
      code: 'user_avoided',
      reference_id: avoided.id,
    });

    const routine = requireRoutine(generateRoutine(input, catalog, rules));
    expect(routine.items.some((item) => item.exercise_id === avoided.id)).toBe(
      false,
    );
  });

  it('honors the stored profile-goal priority order through versioned mappings', () => {
    const mobility = targetExercise(
      '50000000-0000-4000-8000-000000000011',
      'rotation',
    );
    const recovery = targetExercise(
      '50000000-0000-4000-8000-000000000012',
      'flexion_extension',
    );
    recovery.effects[0]!.effect = 'down_regulate';
    const input: GenerationInput = {
      ...generationInput(),
      intent: null,
      profile_goal_slugs: ['recover_after_training', 'move_more_freely'],
    };
    const rules = generationRules();
    const prepared = prepareGeneration(
      input,
      generationCatalog([mobility, recovery]),
      rules,
    );
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;

    const scored = scoreCandidates(
      prepared.eligible_candidates,
      prepared.input,
      computeTargetPriorities(prepared.input, rules),
      rules,
    );

    expect(scored[0]?.exercise.id).toBe(recovery.id);
    expect(
      scored[0]?.score_terms.find((term) => term.code === 'profile_goal_match'),
    ).toEqual({
      code: 'profile_goal_match',
      points: 70,
      reference_id: 'recover_after_training',
    });
  });

  it('fits every supported duration from 2 through 90 minutes', () => {
    const template = singlePhaseTemplate();
    const exercise = flexibleArrivalExercise();
    const rules: GenerationRules = {
      ...generationRules(),
      maximum_items: 1,
      maximum_same_movement_pattern: 1,
    };

    for (
      let availableMinutes = 2;
      availableMinutes <= 90;
      availableMinutes += 1
    ) {
      const input: GenerationInput = {
        ...generationInput(),
        available_minutes: availableMinutes,
        target_regions: [
          {
            region_slug: 'thoracic_spine',
            side: 'central',
            maximum_rating: null,
            symptom_qualities: [],
          },
        ],
      };
      const routine = requireRoutine(
        generateRoutine(
          input,
          generationCatalog([exercise], [template]),
          rules,
        ),
      );

      expect(routine.estimated_duration_seconds).toBe(availableMinutes * 60);
      expect(routine.validation.valid).toBe(true);
    }
  });

  it('handles zero or every selectable region without inventing coverage', () => {
    const exercise = flexibleArrivalExercise();
    const catalog = generationCatalog([exercise], [singlePhaseTemplate()]);
    const rules = { ...generationRules(), maximum_items: 1 };
    const withoutTargets = requireRoutine(
      generateRoutine(
        { ...generationInput(), target_regions: [] },
        catalog,
        rules,
      ),
    );
    expect(withoutTargets.target_priorities).toEqual([]);
    expect(withoutTargets.validation.target_coverage).toEqual([]);

    const everySelectableTarget = bundledCatalog.body_regions
      .filter((region) => region.selectable)
      .map((region) => ({
        region_slug: region.slug,
        side:
          region.laterality === 'central'
            ? ('central' as const)
            : ('bilateral' as const),
        maximum_rating: null,
        symptom_qualities: [],
      }));
    const withEveryTarget = requireRoutine(
      generateRoutine(
        { ...generationInput(), target_regions: everySelectableTarget },
        catalog,
        rules,
      ),
    );
    expect(withEveryTarget.validation.target_coverage).toHaveLength(
      everySelectableTarget.length,
    );
    expect(
      withEveryTarget.validation.target_coverage.every(
        (entry) => entry.addressed || entry.omission_reason_code !== null,
      ),
    ).toBe(true);
  });

  it('returns explicit phase and duration failures instead of an empty routine', () => {
    const patternLimited = routineExercises();
    patternLimited.forEach((exercise) => {
      exercise.movement_patterns = ['rotation'];
    });
    expect(
      generateRoutine(generationInput(), generationCatalog(patternLimited), {
        ...generationRules(),
        maximum_same_movement_pattern: 1,
      }),
    ).toMatchObject({ ok: false, code: 'phase_unfillable' });

    const shortExercise = flexibleArrivalExercise();
    shortExercise.prescription = {
      ...shortExercise.prescription,
      default: 15,
      maximum: 15,
    };
    shortExercise.dosage_limits = {
      ...shortExercise.dosage_limits,
      extendable: false,
    };
    const sparseTemplate = singlePhaseTemplate();
    sparseTemplate.phases[0]!.minimum_share_basis_points = 1;
    expect(
      generateRoutine(
        generationInput(),
        generationCatalog([shortExercise], [sparseTemplate]),
        generationRules(),
      ),
    ).toMatchObject({ ok: false, code: 'duration_unfillable' });
  });

  it('applies reviewed caution dose caps, warnings, and variant requirements', () => {
    const exercises = routineExercises();
    const capped = exercises[2]!;
    const variant = exercises[3]!;
    const review = capped.review;
    capped.contraindications = [
      {
        rule_id: 'cap_sensitive_wrist',
        severity: 'caution',
        match: {
          region_slug: 'wrist',
          side: 'bilateral',
          symptom_qualities: [],
          rating_threshold: null,
          recent_trauma: false,
          demand_flags: [],
          allowed_safety_states: ['clear'],
        },
        reason_key: 'exercise.common.stop.feels_wrong',
        caution_effect: { type: 'dose_cap', maximum: 70, max_sets: 1 },
        review,
      },
      {
        rule_id: 'warn_sensitive_wrist',
        severity: 'caution',
        match: {
          region_slug: 'wrist',
          side: 'bilateral',
          symptom_qualities: [],
          rating_threshold: null,
          recent_trauma: false,
          demand_flags: [],
          allowed_safety_states: ['clear'],
        },
        reason_key: 'exercise.common.stop.feels_wrong',
        caution_effect: {
          type: 'user_warning',
          warning_key: 'exercise.common.stop.feels_wrong',
        },
        review,
      },
    ];
    const favoredInput: GenerationInput = {
      ...generationInput(),
      preferences: [
        {
          exercise_id: capped.id,
          favorite: true,
          avoid_state: 'none',
          avoid_until: null,
        },
      ],
    };
    const routine = requireRoutine(
      generateRoutine(
        favoredInput,
        generationCatalog(exercises),
        generationRules(),
      ),
    );
    const cappedItem = routine.items.find(
      (item) => item.exercise_id === capped.id,
    );
    expect(cappedItem?.prescription.dose).toBeLessThanOrEqual(70);
    expect(cappedItem?.warning_keys).toEqual([
      'exercise.common.stop.feels_wrong',
    ]);

    capped.contraindications = [
      {
        ...capped.contraindications[0]!,
        rule_id: 'use_reviewed_wrist_variant',
        caution_effect: {
          type: 'reviewed_variant',
          exercise_id: variant.id,
          version: variant.version,
        },
      },
    ];
    const variantRoutine = requireRoutine(
      generateRoutine(
        favoredInput,
        generationCatalog(exercises),
        generationRules(),
      ),
    );
    expect(
      variantRoutine.items.some((item) => item.exercise_id === capped.id),
    ).toBe(false);
    expect(
      variantRoutine.items.some((item) => item.exercise_id === variant.id),
    ).toBe(true);
  });

  it('reports why an unaddressed high-priority target was omitted', () => {
    const input: GenerationInput = {
      ...generationInput(),
      target_regions: [
        {
          region_slug: 'wrist',
          side: 'bilateral',
          maximum_rating: null,
          symptom_qualities: [],
        },
      ],
    };
    const routine = requireRoutine(
      generateRoutine(
        input,
        generationCatalog([flexibleArrivalExercise()], [singlePhaseTemplate()]),
        { ...generationRules(), maximum_items: 1 },
      ),
    );

    expect(routine.validation.target_coverage[0]).toMatchObject({
      high_priority: true,
      addressed: false,
      exercise_ids: [],
      omission_reason_code: 'no_eligible_candidate',
    });
  });

  it('scores and explains compatible completed-training context', () => {
    const exercise = flexibleArrivalExercise();
    exercise.effects = [
      {
        ...exercise.effects[0]!,
        effect: 'recover_after_load',
        primary: true,
      },
    ];
    const input: GenerationInput = {
      ...generationInput(),
      intent: null,
      target_regions: [
        {
          region_slug: 'thoracic_spine',
          side: 'central',
          maximum_rating: null,
          symptom_qualities: [],
        },
      ],
      training_context: {
        training_type: 'running',
        status: 'completed',
        stress: 3,
      },
    };
    const routine = requireRoutine(
      generateRoutine(
        input,
        generationCatalog([exercise], [singlePhaseTemplate()]),
        { ...generationRules(), maximum_items: 1 },
      ),
    );

    expect(routine.items[0]?.selection_reason_codes).toContain(
      'training_context_match',
    );
    expect(routine.items[0]?.score_terms).toContainEqual({
      code: 'training_context_match',
      points: 80,
      reference_id: 'running',
    });
  });

  it('emits only eligible, non-selected reviewed alternatives', () => {
    const exercises = routineExercises();
    const source = exercises[2]!;
    const alternative = exercises[3]!;
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
    const input: GenerationInput = {
      ...generationInput(),
      preferences: [
        {
          exercise_id: source.id,
          favorite: true,
          avoid_state: 'none',
          avoid_until: null,
        },
      ],
    };
    const catalog = generationCatalog(exercises);
    const rules = generationRules();
    const routine = requireRoutine(generateRoutine(input, catalog, rules));
    const sourceItem = routine.items.find(
      (item) => item.exercise_id === source.id,
    );

    expect(sourceItem?.alternatives).toEqual([
      {
        relation_type: 'alternative',
        exercise_id: alternative.id,
        exercise_version: alternative.version,
      },
    ]);
    expect(
      routine.items.some((item) => item.exercise_id === alternative.id),
    ).toBe(false);
  });

  it('revalidates dosage and phase order after routine mutation', () => {
    const input = generationInput();
    const exercises = routineExercises();
    exercises[0]!.dosage_limits.max_sets_per_routine = 2;
    const catalog = generationCatalog(exercises);
    const rules = generationRules();
    const routine = requireRoutine(generateRoutine(input, catalog, rules));
    const prepared = prepareGeneration(input, catalog, rules);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;

    const dosageMutation = routine.items.map((item, index) =>
      index === 0
        ? {
            ...item,
            prescription: { ...item.prescription, dose: 99_999 },
          }
        : item,
    );
    const dosageReport = validateRoutine(
      dosageMutation,
      prepared,
      routine.validation.target_coverage,
      routine.estimated_duration_seconds,
      routine.validation.duration_status,
      rules,
    );
    expect(dosageReport.valid).toBe(false);
    expect(dosageReport.issue_codes).toContain('prescription_invalid');

    const setsMutation = routine.items.map((item, index) =>
      index === 0
        ? {
            ...item,
            prescription: { ...item.prescription, sets: 2 },
          }
        : item,
    );
    const setsReport = validateRoutine(
      setsMutation,
      prepared,
      routine.validation.target_coverage,
      routine.estimated_duration_seconds,
      routine.validation.duration_status,
      rules,
    );
    expect(setsReport.valid).toBe(false);
    expect(setsReport.issue_codes).toContain('prescription_invalid');

    const phaseMutation = [...routine.items]
      .reverse()
      .map((item, order) => ({ ...item, order }));
    const phaseReport = validateRoutine(
      phaseMutation,
      prepared,
      routine.validation.target_coverage,
      routine.estimated_duration_seconds,
      routine.validation.duration_status,
      rules,
    );
    expect(phaseReport.valid).toBe(false);
    expect(phaseReport.issue_codes).toContain('phase_order_invalid');

    const explanationMutation = routine.items.map((item, index) =>
      index === 0
        ? {
            ...item,
            score: item.score + 1,
            explanation_key: 'generator.item.invalid',
          }
        : item,
    );
    const explanationReport = validateRoutine(
      explanationMutation,
      prepared,
      routine.validation.target_coverage,
      routine.estimated_duration_seconds,
      routine.validation.duration_status,
      rules,
    );
    expect(explanationReport.valid).toBe(false);
    expect(explanationReport.issue_codes).toEqual(
      expect.arrayContaining(['scoring_invalid', 'explanation_invalid']),
    );

    const reasonMutation = routine.items.map((item, index) =>
      index === 0
        ? {
            ...item,
            selection_reason_codes: [
              ...item.selection_reason_codes,
              'helpful_history' as const,
            ],
          }
        : item,
    );
    const reasonReport = validateRoutine(
      reasonMutation,
      prepared,
      routine.validation.target_coverage,
      routine.estimated_duration_seconds,
      routine.validation.duration_status,
      rules,
    );
    expect(reasonReport.valid).toBe(false);
    expect(reasonReport.issue_codes).toContain('explanation_invalid');
  });
});
