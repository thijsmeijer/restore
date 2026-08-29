import { spawnSync } from 'node:child_process';

import { validateContentCatalog } from '@/content/validation';
import type { ContentCatalog, Exercise } from '@/content/schemas';

const firstExerciseId = '01J00000000000000000000000';
const secondExerciseId = '01J00000000000000000000001';
const contentVersion = '0.1.0';
const localizationKeys = [
  'region.thoracic.name',
  'region.thoracic.accessibility',
  'equipment.mat.name',
  'exercise.rotation.name',
  'exercise.rotation.summary',
  'exercise.rotation.setup',
  'exercise.rotation.execution',
  'exercise.rotation.breathing',
  'exercise.rotation.error.one',
  'exercise.rotation.stop.general',
  'exercise.rotation.stop.specific',
  'exercise.rotation.caution',
];

function validExercise(): Exercise {
  return {
    id: firstExerciseId,
    slug: 'example_thoracic_rotation',
    version: 1,
    status: 'draft',
    name_key: 'exercise.rotation.name',
    summary_key: 'exercise.rotation.summary',
    instructions: {
      setup_key: 'exercise.rotation.setup',
      execution_key: 'exercise.rotation.execution',
      breathing_key: 'exercise.rotation.breathing',
      common_error_keys: ['exercise.rotation.error.one'],
      stop_rule_keys: [
        'exercise.rotation.stop.general',
        'exercise.rotation.stop.specific',
      ],
    },
    prescription: {
      type: 'repetitions',
      default: 6,
      minimum: 3,
      maximum: 8,
      sets: 1,
      rest_seconds: 0,
      tempo: 'controlled',
      side_mode: 'central',
    },
    intensity: 'gentle',
    phases: ['warm_motion', 'targeted_mobility'],
    movement_patterns: ['rotation'],
    effects: [
      {
        region_slug: 'thoracic_spine',
        side: 'central',
        effect: 'mobilize',
        magnitude: 2,
        movement_pattern: 'rotation',
        primary: true,
      },
    ],
    requirements: {
      equipment: { all_of: [], any_of: [] },
      environments: ['home'],
      position: 'seated',
      space: 'small',
      setup_cost: 'low',
    },
    contraindications: [],
    relations: [],
    media: { text_fallback_required: true },
    allowed_modes: ['daily_restore'],
    dosage_limits: {
      max_sets_per_routine: 2,
      max_weekly_exposure: null,
      progression_step: null,
      extendable: false,
    },
    review: { engineering: null, clinical: null },
    created_at: '2026-08-30T00:00:00Z',
    retired_at: null,
  };
}

function validCatalog(): ContentCatalog {
  return {
    manifest: {
      schema_version: 1,
      content_version: contentVersion,
      created_at: '2026-08-30T00:00:00Z',
      review_status: 'draft',
      exercises: [validExercise()],
      routine_templates: [],
    },
    body_regions: [
      {
        slug: 'thoracic_spine',
        display_name: 'region.thoracic.name',
        parent_slug: null,
        selectable: true,
        surface: 'back',
        laterality: 'central',
        geometry_key: 'thoracic_spine',
        accessibility_key: 'region.thoracic.accessibility',
        active: true,
        content_version: contentVersion,
      },
    ],
    equipment: [
      {
        id: '01J00000000000000000000010',
        slug: 'mat',
        name_key: 'equipment.mat.name',
        category: 'surface',
        active: true,
        content_version: contentVersion,
      },
    ],
    modes: ['daily_restore'],
    localization_keys: localizationKeys,
    media_assets: [],
  };
}

function issueCodes(input: unknown): string[] {
  const result = validateContentCatalog(input);
  return result.ok ? [] : result.issues.map((issue) => issue.code);
}

describe('content validation', () => {
  it('accepts a complete draft catalog and preserves null separately from zero', () => {
    const result = validateContentCatalog(validCatalog());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(
        result.catalog.manifest.exercises[0]?.prescription.rest_seconds,
      ).toBe(0);
      expect(result.catalog.manifest.exercises[0]?.retired_at).toBeNull();
    }
  });

  it('reports stable paths for structural errors and rejects unknown fields', () => {
    const catalog = validCatalog();
    const exercise = catalog.manifest.exercises[0]!;
    Reflect.deleteProperty(exercise, 'name_key');
    Object.assign(exercise, { unexpected: true });

    const result = validateContentCatalog(catalog);

    expect(result).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({
          code: 'content_schema_missing_field',
          path: '$.manifest.exercises[0].name_key',
        }),
        expect.objectContaining({
          code: 'content_schema_unknown_field',
          path: '$.manifest.exercises[0].unexpected',
        }),
      ]),
    });
  });

  it('rejects non-monotonic dosage and set limits', () => {
    const catalog = validCatalog();
    catalog.manifest.exercises[0]!.prescription.minimum = 9;
    catalog.manifest.exercises[0]!.prescription.sets = 3;

    expect(issueCodes(catalog)).toContain('content_dosage_bounds_invalid');
  });

  it('rejects unknown region, equipment, mode, localization, and media references', () => {
    const catalog = validCatalog();
    const exercise = catalog.manifest.exercises[0]!;
    exercise.effects[0]!.region_slug = 'unknown_region';
    exercise.requirements.equipment.all_of = ['unknown_prop'];
    exercise.allowed_modes = ['unknown_mode'];
    exercise.name_key = 'exercise.unknown.name';
    Object.assign(exercise.media, {
      video_asset: 'assets/exercises/missing.mp4',
    });

    expect(issueCodes(catalog)).toEqual(
      expect.arrayContaining([
        'content_unknown_body_region',
        'content_unknown_equipment',
        'content_unknown_mode',
        'content_unknown_localization_key',
        'content_unknown_media_asset',
      ]),
    );
  });

  it('enforces body-region laterality and rejects hierarchy cycles', () => {
    const catalog = validCatalog();
    catalog.manifest.exercises[0]!.effects[0]!.side = 'left';
    catalog.body_regions[0]!.parent_slug = 'thoracic_group';
    catalog.body_regions.push({
      ...catalog.body_regions[0]!,
      slug: 'thoracic_group',
      parent_slug: 'thoracic_spine',
      selectable: false,
      surface: 'none',
      geometry_key: null,
    });

    expect(issueCodes(catalog)).toEqual(
      expect.arrayContaining([
        'content_side_incompatible',
        'content_body_region_cycle',
      ]),
    );
  });

  it('requires concrete caution behavior and forbids it on hard exclusions', () => {
    const catalog = validCatalog();
    const exercise = catalog.manifest.exercises[0]!;
    const contraindication: Exercise['contraindications'][number] = {
      rule_id: 'example_caution',
      severity: 'caution',
      match: {
        region_slug: 'thoracic_spine',
        side: 'central',
        symptom_qualities: ['mild_discomfort'],
        rating_threshold: 3,
        recent_trauma: false,
        demand_flags: ['end_range'],
        allowed_safety_states: ['clear'],
      },
      reason_key: 'exercise.rotation.caution',
      caution_effect: null,
      review: { engineering: null, clinical: null },
    };
    exercise.contraindications.push(contraindication);

    expect(issueCodes(catalog)).toContain('content_caution_effect_required');

    contraindication.severity = 'hard_exclusion';
    contraindication.caution_effect = {
      type: 'user_warning',
      warning_key: 'exercise.rotation.caution',
    };
    expect(issueCodes(catalog)).toContain('content_caution_effect_forbidden');
  });

  it('rejects missing relation targets, invalid version policies, and graph cycles', () => {
    const catalog = validCatalog();
    const first = catalog.manifest.exercises[0]!;
    const second = structuredClone(first);
    second.id = secondExerciseId;
    second.slug = 'example_thoracic_rotation_regression';
    const firstRelation: Exercise['relations'][number] = {
      type: 'regression',
      target_exercise_id: secondExerciseId,
      version_policy: 'pinned',
      target_version: 1,
      supported_modes: ['daily_restore'],
      preserves_effects: ['mobilize'],
    };
    const secondRelation: Exercise['relations'][number] = {
      ...firstRelation,
      type: 'progression',
      target_exercise_id: firstExerciseId,
    };
    first.relations = [firstRelation];
    second.relations = [secondRelation];
    catalog.manifest.exercises.push(second);

    expect(issueCodes(catalog)).toContain('content_relation_cycle');

    firstRelation.target_exercise_id = '01J00000000000000000000009';
    firstRelation.target_version = null;
    expect(issueCodes(catalog)).toEqual(
      expect.arrayContaining([
        'content_relation_target_missing',
        'content_relation_version_invalid',
      ]),
    );
  });

  it('rejects draft exercises in reviewed packs and mismatched reference versions', () => {
    const catalog = validCatalog();
    catalog.manifest.review_status = 'clinical_reviewed';
    catalog.body_regions[0]!.content_version = '0.2.0';

    expect(issueCodes(catalog)).toEqual(
      expect.arrayContaining([
        'content_review_incomplete',
        'content_version_mismatch',
      ]),
    );
  });

  it('rejects duplicate identities, slugs, and unsupported routine templates', () => {
    const catalog = validCatalog();
    catalog.manifest.exercises.push(
      structuredClone(catalog.manifest.exercises[0]!),
    );
    catalog.manifest.routine_templates.push({ id: 'not_yet_supported' });

    expect(issueCodes(catalog)).toEqual(
      expect.arrayContaining([
        'content_duplicate_id',
        'content_duplicate_value',
        'content_unsupported_routine_template',
      ]),
    );
  });

  it('makes the validation command fail with a stable code and path', () => {
    const result = spawnSync(
      'pnpm',
      [
        'exec',
        'tsx',
        'scripts/validate-content.ts',
        '--content-dir',
        'tests/fixtures/content/invalid',
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'content_schema_missing_field $.manifest.schema_version',
    );
  });
});
