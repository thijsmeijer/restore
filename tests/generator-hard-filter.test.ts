import { bundledCatalog } from '@/content/bundled-catalog';
import type { Exercise, RoutineTemplate } from '@/content/schemas';
import { filterEligibleCandidates } from '@/generator/hard-filter';
import { generatorEngineVersion, prepareGeneration } from '@/generator';
import type {
  GenerationCatalog,
  GenerationInput,
  GenerationRules,
} from '@/generator';

const generatedAt = '2026-08-30T12:00:00.000Z';

function reviewedExercise(): Exercise {
  const exercise = structuredClone(bundledCatalog.manifest.exercises[0]!);
  exercise.status = 'clinical_reviewed';
  exercise.review = {
    engineering: {
      reviewer_role: 'engineering',
      reviewed_at: generatedAt,
      reviewed_version: exercise.version,
      notes_reference: 'tests/generator-fixtures',
    },
    clinical: {
      reviewer_role: 'clinical',
      reviewed_at: generatedAt,
      reviewed_version: exercise.version,
      notes_reference: 'tests/generator-fixtures',
    },
  };
  return exercise;
}

function reviewedTemplate(): RoutineTemplate {
  return {
    id: '30000000-0000-4000-8000-000000000001',
    version: 1,
    status: 'clinical_reviewed',
    mode: 'daily_restore',
    minimum_minutes: 2,
    maximum_minutes: 20,
    allowed_safety_states: ['clear', 'gentle_only'],
    intensity_ceiling: 'very_gentle',
    phases: [
      {
        phase: 'arrival',
        requirement: 'required',
        minimum_share_basis_points: 10_000,
        target_share_basis_points: 10_000,
        maximum_share_basis_points: 10_000,
      },
    ],
    fallback_policy: 'explicit_failure',
    review: {
      engineering: {
        reviewer_role: 'engineering',
        reviewed_at: generatedAt,
        reviewed_version: 1,
        notes_reference: 'tests/generator-fixtures',
      },
      clinical: {
        reviewer_role: 'clinical',
        reviewed_at: generatedAt,
        reviewed_version: 1,
        notes_reference: 'tests/generator-fixtures',
      },
    },
    created_at: generatedAt,
    retired_at: null,
  };
}

function generationInput(): GenerationInput {
  return {
    schema_version: 2,
    routine_id: '40000000-0000-4000-8000-000000000002',
    check_in_id: '40000000-0000-4000-8000-000000000001',
    generated_at: generatedAt,
    mode: 'daily_restore',
    available_minutes: 10,
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
        region_slug: 'thoracic_spine',
        side: 'central',
        maximum_rating: null,
        symptom_qualities: [],
      },
    ],
    intent: 'breathe_expand',
    recent_major_trauma: false,
    restricted_demand_flags: [],
    profile_goal_slugs: ['move_more_freely'],
    training_context: null,
    preferences: [],
    response_aggregates: [],
    recent_exercise_ids: [],
    content_version: '0.1.0',
    engine_version: generatorEngineVersion,
    rules_version: 'routine_rules_v1',
    configuration_version: '1.0.0',
    seed: 'fixed-seed',
  };
}

function generationRules(): GenerationRules {
  return {
    rules_version: 'routine_rules_v1',
    configuration_version: '1.0.0',
    safety_rules_version: 'check_in_safety_engineering_2026_08_30',
    seconds_per_repetition: 4,
    seconds_per_breathing_cycle: 10,
    seconds_per_reassessment: 20,
    transition_seconds: 5,
    duration_tolerance_basis_points: 1_000,
    high_priority_target_count: 2,
    target_priority_step_basis_points: 2_000,
    minimum_target_priority_basis_points: 2_000,
    profile_goal_priority_step_basis_points: 2_000,
    minimum_profile_goal_priority_basis_points: 2_000,
    goal_effect_mappings: [
      {
        goal_slug: 'move_more_freely',
        effects: ['mobilize', 'explore_range'],
      },
    ],
    maximum_items: 12,
    maximum_same_movement_pattern: 2,
    scoring: {
      target_match: 300,
      primary_effect_bonus: 60,
      intent_match: 120,
      profile_goal_match: 70,
      training_context_match: 80,
      favorite: 40,
      helpful_response_each: 10,
      helpful_response_cap: 50,
      uncomfortable_response_each: -20,
      uncomfortable_response_cap: 80,
      preference_skip_each: -10,
      preference_skip_cap: 40,
      preference_replacement_each: -10,
      preference_replacement_cap: 40,
      history_combined_cap: 100,
      recent_exposure_penalty: -30,
    },
  };
}

function generationCatalog(
  exercise: Exercise = reviewedExercise(),
  template: RoutineTemplate = reviewedTemplate(),
): GenerationCatalog {
  return {
    content_version: '0.1.0',
    review_status: 'clinical_reviewed',
    exercises: [exercise],
    templates: [template],
  };
}

describe('GEN-001 hard-filter preparation', () => {
  it('returns the same exact eligible candidate set for the same snapshot', () => {
    const input = generationInput();
    const catalog = generationCatalog();
    const rules = generationRules();

    const first = prepareGeneration(input, catalog, rules);
    const second = prepareGeneration(structuredClone(input), catalog, rules);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      ok: true,
      template: { id: '30000000-0000-4000-8000-000000000001', version: 1 },
      eligible_candidates: [
        {
          exercise: {
            id: '20000000-0000-4000-8000-000000000001',
            version: 1,
          },
          minimum_duration_seconds: 35,
          caution_rule_ids: [],
        },
      ],
      rejection_report: [],
    });
  });

  it('stops before template or candidate selection when safety is blocked', () => {
    const input = { ...generationInput(), safety_state: 'blocked' as const };

    expect(
      prepareGeneration(input, generationCatalog(), generationRules()),
    ).toEqual({
      ok: false,
      code: 'blocked_by_safety',
      explanation_key: 'generator.failure.blocked_by_safety',
      rejection_report: [],
    });
  });

  it('applies every hard rejection before any future scoring step', () => {
    const exercise = reviewedExercise();
    exercise.status = 'draft';
    exercise.review = { engineering: null, clinical: null };
    exercise.allowed_modes = ['night_downshift'];
    exercise.requirements.environments = ['gym'];
    exercise.requirements.equipment.all_of = ['wall'];
    exercise.requirements.space = 'large';
    exercise.intensity = 'gentle';
    exercise.prescription.sets = 30;
    exercise.contraindications = [
      {
        rule_id: 'exclude_recent_trauma',
        severity: 'hard_exclusion',
        match: {
          region_slug: null,
          side: 'any',
          symptom_qualities: [],
          rating_threshold: null,
          recent_trauma: false,
          demand_flags: [],
          allowed_safety_states: ['clear'],
        },
        reason_key: 'exercise.common.stop.feels_wrong',
        caution_effect: null,
        review: { engineering: null, clinical: null },
      },
    ];
    const input: GenerationInput = {
      ...generationInput(),
      available_minutes: 2,
      available_space: 'minimal',
      target_regions: [
        {
          region_slug: 'thoracic_spine',
          side: 'left',
          maximum_rating: null,
          symptom_qualities: [],
        },
      ],
      preferences: [
        {
          exercise_id: exercise.id,
          favorite: true,
          avoid_state: 'permanent',
          avoid_until: null,
        },
      ],
    };

    const result = filterEligibleCandidates(
      [exercise],
      input,
      reviewedTemplate(),
      generationRules(),
    );

    expect(result.eligible).toEqual([]);
    expect(result.rejected[0]?.reasons.map((reason) => reason.code)).toEqual([
      'content_not_clinically_reviewed',
      'hard_contraindication',
      'user_avoided',
      'mode_not_allowed',
      'environment_not_allowed',
      'equipment_missing',
      'space_insufficient',
      'side_incompatible',
      'intensity_exceeds_template',
      'duration_exceeds_available',
    ]);
  });

  it('treats available but unstable equipment as unavailable', () => {
    const exercise = reviewedExercise();
    exercise.requirements.equipment.all_of = ['wall'];
    const input: GenerationInput = {
      ...generationInput(),
      available_equipment: ['wall'],
      unstable_equipment: ['wall'],
    };

    const result = filterEligibleCandidates(
      [exercise],
      input,
      reviewedTemplate(),
      generationRules(),
    );

    expect(result.rejected[0]?.reasons).toContainEqual({
      code: 'equipment_unstable',
      reference_id: 'wall',
    });
  });

  it('checks side compatibility only when an exercise targets the same region', () => {
    const exercise = reviewedExercise();
    const unrelatedTargetInput: GenerationInput = {
      ...generationInput(),
      target_regions: [
        {
          region_slug: 'wrist',
          side: 'left',
          maximum_rating: null,
          symptom_qualities: [],
        },
      ],
    };

    expect(
      filterEligibleCandidates(
        [exercise],
        unrelatedTargetInput,
        reviewedTemplate(),
        generationRules(),
      ).eligible,
    ).toHaveLength(1);

    const incompatibleInput: GenerationInput = {
      ...generationInput(),
      target_regions: [
        {
          region_slug: 'thoracic_spine',
          side: 'left',
          maximum_rating: null,
          symptom_qualities: [],
        },
      ],
    };
    expect(
      filterEligibleCandidates(
        [exercise],
        incompatibleInput,
        reviewedTemplate(),
        generationRules(),
      ).rejected[0]?.reasons,
    ).toContainEqual({
      code: 'side_incompatible',
      reference_id: 'thoracic_spine:left',
    });

    const bilateralExercise = reviewedExercise();
    bilateralExercise.prescription.side_mode = 'bilateral_simultaneous';
    bilateralExercise.effects[0]!.side = 'bilateral';
    expect(
      filterEligibleCandidates(
        [bilateralExercise],
        incompatibleInput,
        reviewedTemplate(),
        generationRules(),
      ).eligible,
    ).toHaveLength(1);
  });

  it('retains matching reviewed cautions on an eligible candidate', () => {
    const exercise = reviewedExercise();
    exercise.contraindications = [
      {
        rule_id: 'warn_thoracic_sensitivity',
        severity: 'caution',
        match: {
          region_slug: 'thoracic_spine',
          side: 'central',
          symptom_qualities: ['sensitive'],
          rating_threshold: 3,
          recent_trauma: false,
          demand_flags: [],
          allowed_safety_states: ['clear'],
        },
        reason_key: 'exercise.common.stop.feels_wrong',
        caution_effect: {
          type: 'user_warning',
          warning_key: 'exercise.common.stop.feels_wrong',
        },
        review: exercise.review,
      },
    ];
    const input: GenerationInput = {
      ...generationInput(),
      target_regions: [
        {
          region_slug: 'thoracic_spine',
          side: 'central',
          maximum_rating: 4,
          symptom_qualities: ['sensitive'],
        },
      ],
    };

    const result = filterEligibleCandidates(
      [exercise],
      input,
      reviewedTemplate(),
      generationRules(),
    );

    expect(result.eligible[0]?.caution_rule_ids).toEqual([
      'warn_thoracic_sensitivity',
    ]);
  });

  it('enforces gentle-only and exact review records independently of labels', () => {
    const gentleExercise = reviewedExercise();
    gentleExercise.intensity = 'gentle';
    const permissiveTemplate = reviewedTemplate();
    permissiveTemplate.intensity_ceiling = 'gentle';
    const gentleInput: GenerationInput = {
      ...generationInput(),
      safety_state: 'gentle_only',
    };

    expect(
      filterEligibleCandidates(
        [gentleExercise],
        gentleInput,
        permissiveTemplate,
        generationRules(),
      ).rejected[0]?.reasons,
    ).toContainEqual({
      code: 'intensity_exceeds_template',
      reference_id: 'gentle',
    });

    const mismatchedReview = reviewedExercise();
    mismatchedReview.review.clinical!.reviewed_version = 2;
    expect(
      filterEligibleCandidates(
        [mismatchedReview],
        generationInput(),
        reviewedTemplate(),
        generationRules(),
      ).rejected[0]?.reasons,
    ).toContainEqual({
      code: 'content_not_clinically_reviewed',
      reference_id: null,
    });

    const mismatchedTemplate = reviewedTemplate();
    mismatchedTemplate.review.clinical!.reviewed_version = 2;
    expect(
      prepareGeneration(
        generationInput(),
        generationCatalog(reviewedExercise(), mismatchedTemplate),
        generationRules(),
      ),
    ).toMatchObject({ ok: false, code: 'template_unavailable' });
  });

  it('keeps valid candidate filtering bounded across every P0 duration', () => {
    const template = reviewedTemplate();
    template.maximum_minutes = 90;

    for (
      let availableMinutes = 2;
      availableMinutes <= 90;
      availableMinutes += 1
    ) {
      const result = prepareGeneration(
        { ...generationInput(), available_minutes: availableMinutes },
        generationCatalog(reviewedExercise(), template),
        generationRules(),
      );

      expect(result.ok).toBe(true);
    }
  });

  it('returns an explained failure when hard filters remove every candidate', () => {
    const exercise = reviewedExercise();
    exercise.status = 'draft';
    exercise.review = { engineering: null, clinical: null };

    expect(
      prepareGeneration(
        generationInput(),
        generationCatalog(exercise),
        generationRules(),
      ),
    ).toMatchObject({
      ok: false,
      code: 'no_eligible_content',
      explanation_key: 'generator.failure.no_eligible_content',
      rejection_report: [
        {
          exercise_id: exercise.id,
          exercise_version: exercise.version,
          reasons: [
            {
              code: 'content_not_clinically_reviewed',
              reference_id: null,
            },
          ],
        },
      ],
    });
  });

  it('fails closed for invalid snapshots, exact-version mismatch, and templates', () => {
    const input = generationInput();
    const rules = generationRules();
    const catalog = generationCatalog();

    expect(
      prepareGeneration(
        { ...input, available_equipment: ['wall', 'wall'] },
        catalog,
        rules,
      ),
    ).toMatchObject({ ok: false, code: 'input_invalid' });
    expect(
      prepareGeneration({ ...input, schema_version: 1 }, catalog, rules),
    ).toMatchObject({ ok: false, code: 'input_invalid' });
    expect(
      prepareGeneration({ ...input, content_version: '0.2.0' }, catalog, rules),
    ).toMatchObject({ ok: false, code: 'content_version_mismatch' });
    expect(
      prepareGeneration({ ...input, engine_version: '0.0.9' }, catalog, rules),
    ).toMatchObject({ ok: false, code: 'version_mismatch' });
    expect(
      prepareGeneration(
        { ...input, safety_rules_version: 'different_safety_rules' },
        catalog,
        rules,
      ),
    ).toMatchObject({ ok: false, code: 'version_mismatch' });
    expect(
      prepareGeneration(
        { ...input, configuration_version: '2.0.0' },
        catalog,
        rules,
      ),
    ).toMatchObject({ ok: false, code: 'version_mismatch' });
    expect(
      prepareGeneration(input, { ...catalog, templates: [] }, rules),
    ).toMatchObject({ ok: false, code: 'template_unavailable' });
    expect(
      prepareGeneration(
        input,
        { ...catalog, templates: [reviewedTemplate(), reviewedTemplate()] },
        rules,
      ),
    ).toMatchObject({ ok: false, code: 'template_ambiguous' });
    expect(
      prepareGeneration(
        input,
        { ...catalog, exercises: [reviewedExercise(), reviewedExercise()] },
        rules,
      ),
    ).toMatchObject({ ok: false, code: 'catalog_duplicate_exercise' });
  });

  it('keeps the current draft-only bundled catalog ineligible for daily use', () => {
    const result = prepareGeneration(
      generationInput(),
      {
        content_version: bundledCatalog.manifest.content_version,
        review_status: bundledCatalog.manifest.review_status,
        exercises: bundledCatalog.manifest.exercises,
        templates: bundledCatalog.manifest.routine_templates,
      },
      generationRules(),
    );

    expect(result).toMatchObject({
      ok: false,
      code: 'catalog_not_clinically_reviewed',
    });
  });
});
