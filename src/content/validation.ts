import type { z } from 'zod';

import {
  contentCatalogSchema,
  type BodyRegion,
  type ContentCatalog,
  type Exercise,
} from './schemas';

export type ContentValidationIssueCode =
  | 'content_body_region_cycle'
  | 'content_caution_effect_forbidden'
  | 'content_caution_effect_required'
  | 'content_dosage_bounds_invalid'
  | 'content_duplicate_id'
  | 'content_duplicate_value'
  | 'content_relation_cycle'
  | 'content_relation_intent_invalid'
  | 'content_relation_target_missing'
  | 'content_relation_version_invalid'
  | 'content_review_incomplete'
  | 'content_schema_bound_violation'
  | 'content_schema_constraint_failed'
  | 'content_schema_invalid_format'
  | 'content_schema_invalid_type'
  | 'content_schema_invalid_value'
  | 'content_schema_missing_field'
  | 'content_schema_unknown_field'
  | 'content_side_incompatible'
  | 'content_unknown_body_region'
  | 'content_unknown_equipment'
  | 'content_unknown_localization_key'
  | 'content_unknown_media_asset'
  | 'content_unknown_mode'
  | 'content_template_duration_invalid'
  | 'content_template_phase_budget_invalid'
  | 'content_template_safety_invalid'
  | 'content_version_mismatch';

export interface ContentValidationIssue {
  readonly code: ContentValidationIssueCode;
  readonly path: string;
  readonly message: string;
}

export type ContentValidationResult =
  | { readonly ok: true; readonly catalog: ContentCatalog }
  | { readonly ok: false; readonly issues: readonly ContentValidationIssue[] };

function formatPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((result, segment) => {
    if (typeof segment === 'number') {
      return `${result}[${segment}]`;
    }

    const value = String(segment);
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value)
      ? `${result}.${value}`
      : `${result}[${JSON.stringify(value)}]`;
  }, '$');
}

function issue(
  code: ContentValidationIssueCode,
  path: readonly PropertyKey[],
  message: string,
): ContentValidationIssue {
  return { code, path: formatPath(path), message };
}

function zodIssues(error: z.ZodError): ContentValidationIssue[] {
  const issues: ContentValidationIssue[] = [];

  for (const zodIssue of error.issues) {
    if (zodIssue.code === 'unrecognized_keys') {
      for (const key of zodIssue.keys) {
        issues.push(
          issue(
            'content_schema_unknown_field',
            [...zodIssue.path, key],
            'Unknown field.',
          ),
        );
      }
      continue;
    }

    let code: ContentValidationIssueCode;
    if (zodIssue.input === undefined) {
      code = 'content_schema_missing_field';
    } else {
      switch (zodIssue.code) {
        case 'invalid_type':
          code = 'content_schema_invalid_type';
          break;
        case 'invalid_value':
          code = 'content_schema_invalid_value';
          break;
        case 'too_big':
        case 'too_small':
          code = 'content_schema_bound_violation';
          break;
        case 'invalid_format':
          code = 'content_schema_invalid_format';
          break;
        default:
          code = 'content_schema_constraint_failed';
      }
    }

    issues.push(issue(code, zodIssue.path, zodIssue.message));
  }

  return issues;
}

function pushDuplicateIssues(
  values: readonly string[],
  basePath: readonly PropertyKey[],
  issues: ContentValidationIssue[],
): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      issues.push(
        issue(
          'content_duplicate_value',
          [...basePath, index],
          `Duplicate value: ${value}.`,
        ),
      );
    }
    seen.add(value);
  });
}

function pushUniqueKeyIssues<T>(
  values: readonly T[],
  key: (value: T) => string,
  path: readonly PropertyKey[],
  field: string,
  code: 'content_duplicate_id' | 'content_duplicate_value',
  issues: ContentValidationIssue[],
): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    const identifier = key(value);
    if (seen.has(identifier)) {
      issues.push(
        issue(
          code,
          [...path, index, field],
          `Duplicate ${field}: ${identifier}.`,
        ),
      );
    }
    seen.add(identifier);
  });
}

function validateBodyRegions(
  bodyRegions: readonly BodyRegion[],
  contentVersion: string,
  issues: ContentValidationIssue[],
): Map<string, BodyRegion> {
  pushUniqueKeyIssues(
    bodyRegions,
    (region) => region.slug,
    ['body_regions'],
    'slug',
    'content_duplicate_value',
    issues,
  );

  const regionsBySlug = new Map(
    bodyRegions.map((region) => [region.slug, region]),
  );
  bodyRegions.forEach((region, index) => {
    if (region.content_version !== contentVersion) {
      issues.push(
        issue(
          'content_version_mismatch',
          ['body_regions', index, 'content_version'],
          `Expected content version ${contentVersion}.`,
        ),
      );
    }
    if (region.parent_slug !== null && !regionsBySlug.has(region.parent_slug)) {
      issues.push(
        issue(
          'content_unknown_body_region',
          ['body_regions', index, 'parent_slug'],
          `Unknown parent region: ${region.parent_slug}.`,
        ),
      );
    }
  });

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (slug: string): void => {
    if (visited.has(slug)) return;
    if (visiting.has(slug)) {
      const index = bodyRegions.findIndex((region) => region.slug === slug);
      issues.push(
        issue(
          'content_body_region_cycle',
          ['body_regions', index, 'parent_slug'],
          `Body-region hierarchy contains a cycle at ${slug}.`,
        ),
      );
      return;
    }

    visiting.add(slug);
    const parent = regionsBySlug.get(slug)?.parent_slug;
    if (parent !== null && parent !== undefined && regionsBySlug.has(parent)) {
      visit(parent);
    }
    visiting.delete(slug);
    visited.add(slug);
  };
  bodyRegions.forEach((region) => visit(region.slug));

  return regionsBySlug;
}

function reviewCompleteForStatus(
  review: Exercise['review'],
  status: Exercise['status'],
  version: number,
): boolean {
  const engineering = review.engineering;
  const clinical = review.clinical;
  const engineeringValid =
    engineering !== null &&
    engineering.reviewer_role === 'engineering' &&
    engineering.reviewed_version === version;
  const clinicalValid =
    clinical !== null &&
    clinical.reviewer_role === 'clinical' &&
    clinical.reviewed_version === version;

  if (engineering !== null && !engineeringValid) return false;
  if (clinical !== null && !clinicalValid) return false;
  if (status === 'draft') return engineering === null && clinical === null;
  if (status === 'engineering_reviewed')
    return engineeringValid && clinical === null;
  if (status === 'clinical_reviewed') return engineeringValid && clinicalValid;
  return engineeringValid;
}

function reviewComplete(exercise: Exercise): boolean {
  return reviewCompleteForStatus(
    exercise.review,
    exercise.status,
    exercise.version,
  );
}

function sideAllowed(
  region: BodyRegion,
  side: Exercise['effects'][number]['side'],
): boolean {
  if (region.laterality === 'central') return side === 'central';
  if (region.laterality === 'paired') return side !== 'central';
  return true;
}

function validateExerciseArrays(
  exercise: Exercise,
  exerciseIndex: number,
  issues: ContentValidationIssue[],
): void {
  const path = ['manifest', 'exercises', exerciseIndex] as const;
  pushDuplicateIssues(exercise.phases, [...path, 'phases'], issues);
  pushDuplicateIssues(
    exercise.movement_patterns,
    [...path, 'movement_patterns'],
    issues,
  );
  pushDuplicateIssues(
    exercise.allowed_modes,
    [...path, 'allowed_modes'],
    issues,
  );
  pushDuplicateIssues(
    exercise.requirements.environments,
    [...path, 'requirements', 'environments'],
    issues,
  );
  pushDuplicateIssues(
    exercise.requirements.equipment.all_of,
    [...path, 'requirements', 'equipment', 'all_of'],
    issues,
  );
  exercise.requirements.equipment.any_of.forEach((group, groupIndex) => {
    pushDuplicateIssues(
      group,
      [...path, 'requirements', 'equipment', 'any_of', groupIndex],
      issues,
    );
  });
  pushDuplicateIssues(
    [
      ...exercise.requirements.equipment.all_of,
      ...exercise.requirements.equipment.any_of.flat(),
    ],
    [...path, 'requirements', 'equipment'],
    issues,
  );
  pushUniqueKeyIssues(
    exercise.contraindications,
    (entry) => entry.rule_id,
    [...path, 'contraindications'],
    'rule_id',
    'content_duplicate_value',
    issues,
  );
  pushUniqueKeyIssues(
    exercise.effects,
    (entry) => `${entry.region_slug}:${entry.side}:${entry.effect}`,
    [...path, 'effects'],
    'region_slug',
    'content_duplicate_value',
    issues,
  );
  exercise.contraindications.forEach((entry, contraindicationIndex) => {
    pushDuplicateIssues(
      entry.match.symptom_qualities,
      [
        ...path,
        'contraindications',
        contraindicationIndex,
        'match',
        'symptom_qualities',
      ],
      issues,
    );
    pushDuplicateIssues(
      entry.match.demand_flags,
      [
        ...path,
        'contraindications',
        contraindicationIndex,
        'match',
        'demand_flags',
      ],
      issues,
    );
    pushDuplicateIssues(
      entry.match.allowed_safety_states,
      [
        ...path,
        'contraindications',
        contraindicationIndex,
        'match',
        'allowed_safety_states',
      ],
      issues,
    );
  });
  exercise.relations.forEach((entry, relationIndex) => {
    pushDuplicateIssues(
      entry.supported_modes,
      [...path, 'relations', relationIndex, 'supported_modes'],
      issues,
    );
    pushDuplicateIssues(
      entry.preserves_effects,
      [...path, 'relations', relationIndex, 'preserves_effects'],
      issues,
    );
  });
}

function relationCycleIssues(
  exercises: readonly Exercise[],
  issues: ContentValidationIssue[],
): void {
  const graph = new Map<string, string[]>();
  exercises.forEach((exercise) => {
    graph.set(
      exercise.id,
      exercise.relations
        .filter(
          (relation) =>
            relation.type === 'progression' || relation.type === 'regression',
        )
        .map((relation) => relation.target_exercise_id),
    );
  });

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      const exerciseIndex = exercises.findIndex(
        (exercise) => exercise.id === id,
      );
      issues.push(
        issue(
          'content_relation_cycle',
          ['manifest', 'exercises', exerciseIndex, 'relations'],
          `Progression/regression graph contains a cycle at ${id}.`,
        ),
      );
      return;
    }

    visiting.add(id);
    for (const target of graph.get(id) ?? []) {
      if (graph.has(target)) visit(target);
    }
    visiting.delete(id);
    visited.add(id);
  };
  exercises.forEach((exercise) => visit(exercise.id));
}

function validateCatalog(catalog: ContentCatalog): ContentValidationIssue[] {
  const issues: ContentValidationIssue[] = [];
  const { manifest } = catalog;

  const regionsBySlug = validateBodyRegions(
    catalog.body_regions,
    manifest.content_version,
    issues,
  );
  pushUniqueKeyIssues(
    catalog.equipment,
    (entry) => entry.id,
    ['equipment'],
    'id',
    'content_duplicate_id',
    issues,
  );
  pushUniqueKeyIssues(
    catalog.equipment,
    (entry) => entry.slug,
    ['equipment'],
    'slug',
    'content_duplicate_value',
    issues,
  );
  catalog.equipment.forEach((entry, index) => {
    if (entry.content_version !== manifest.content_version) {
      issues.push(
        issue(
          'content_version_mismatch',
          ['equipment', index, 'content_version'],
          `Expected content version ${manifest.content_version}.`,
        ),
      );
    }
  });
  pushDuplicateIssues(catalog.modes, ['modes'], issues);
  pushDuplicateIssues(catalog.localization_keys, ['localization_keys'], issues);
  pushDuplicateIssues(catalog.media_assets, ['media_assets'], issues);

  const equipmentSlugs = new Set(catalog.equipment.map((entry) => entry.slug));
  const modeSlugs = new Set(catalog.modes);
  const localizationKeys = new Set(catalog.localization_keys);
  const mediaAssets = new Set(catalog.media_assets);
  catalog.body_regions.forEach((region, index) => {
    [
      { key: region.display_name, field: 'display_name' },
      { key: region.accessibility_key, field: 'accessibility_key' },
    ].forEach(({ key, field }) => {
      if (!localizationKeys.has(key)) {
        issues.push(
          issue(
            'content_unknown_localization_key',
            ['body_regions', index, field],
            `Unknown localization key: ${key}.`,
          ),
        );
      }
    });
  });
  catalog.equipment.forEach((entry, index) => {
    if (!localizationKeys.has(entry.name_key)) {
      issues.push(
        issue(
          'content_unknown_localization_key',
          ['equipment', index, 'name_key'],
          `Unknown localization key: ${entry.name_key}.`,
        ),
      );
    }
  });
  const exercises = manifest.exercises;

  pushUniqueKeyIssues(
    manifest.routine_templates,
    (template) => `${template.id}@${template.version}`,
    ['manifest', 'routine_templates'],
    'id',
    'content_duplicate_id',
    issues,
  );
  manifest.routine_templates.forEach((template, templateIndex) => {
    const basePath = ['manifest', 'routine_templates', templateIndex] as const;
    if (!modeSlugs.has(template.mode)) {
      issues.push(
        issue(
          'content_unknown_mode',
          [...basePath, 'mode'],
          `Unknown mode: ${template.mode}.`,
        ),
      );
    }
    if (template.minimum_minutes > template.maximum_minutes) {
      issues.push(
        issue(
          'content_template_duration_invalid',
          [...basePath, 'minimum_minutes'],
          'Template minimum duration cannot exceed its maximum duration.',
        ),
      );
    }
    pushDuplicateIssues(
      template.allowed_safety_states,
      [...basePath, 'allowed_safety_states'],
      issues,
    );
    pushUniqueKeyIssues(
      template.phases,
      (phase) => phase.phase,
      [...basePath, 'phases'],
      'phase',
      'content_duplicate_value',
      issues,
    );
    const targetTotal = template.phases.reduce(
      (total, phase) => total + phase.target_share_basis_points,
      0,
    );
    const minimumTotal = template.phases.reduce(
      (total, phase) => total + phase.minimum_share_basis_points,
      0,
    );
    const maximumTotal = template.phases.reduce(
      (total, phase) => total + phase.maximum_share_basis_points,
      0,
    );
    template.phases.forEach((phase, phaseIndex) => {
      if (
        phase.minimum_share_basis_points > phase.target_share_basis_points ||
        phase.target_share_basis_points > phase.maximum_share_basis_points ||
        (phase.requirement === 'required' &&
          phase.minimum_share_basis_points === 0)
      ) {
        issues.push(
          issue(
            'content_template_phase_budget_invalid',
            [...basePath, 'phases', phaseIndex],
            'Phase shares must be monotonic and required phases need a positive minimum.',
          ),
        );
      }
    });
    if (
      targetTotal !== 10_000 ||
      minimumTotal > 10_000 ||
      maximumTotal < 10_000
    ) {
      issues.push(
        issue(
          'content_template_phase_budget_invalid',
          [...basePath, 'phases'],
          'Template target shares must total 10000 basis points and the minimum/maximum envelope must contain that total.',
        ),
      );
    }
    if (
      template.allowed_safety_states.includes('gentle_only') &&
      template.intensity_ceiling !== 'very_gentle'
    ) {
      issues.push(
        issue(
          'content_template_safety_invalid',
          [...basePath, 'intensity_ceiling'],
          'A gentle-only template must use the very-gentle intensity ceiling.',
        ),
      );
    }
    if (
      !reviewCompleteForStatus(
        template.review,
        template.status,
        template.version,
      )
    ) {
      issues.push(
        issue(
          'content_review_incomplete',
          [...basePath, 'review'],
          `Review records do not support status ${template.status} at version ${template.version}.`,
        ),
      );
    }
    if ((template.status === 'retired') !== (template.retired_at !== null)) {
      issues.push(
        issue(
          'content_review_incomplete',
          [...basePath, 'retired_at'],
          'Only retired templates have a retirement timestamp.',
        ),
      );
    }
    if (
      template.retired_at !== null &&
      Date.parse(template.retired_at) < Date.parse(template.created_at)
    ) {
      issues.push(
        issue(
          'content_review_incomplete',
          [...basePath, 'retired_at'],
          'A template cannot retire before it was created.',
        ),
      );
    }
    if (Date.parse(template.created_at) > Date.parse(manifest.created_at)) {
      issues.push(
        issue(
          'content_review_incomplete',
          [...basePath, 'created_at'],
          'A template cannot be created after its content pack.',
        ),
      );
    }
    if (
      manifest.review_status === 'clinical_reviewed' &&
      template.status !== 'clinical_reviewed'
    ) {
      issues.push(
        issue(
          'content_review_incomplete',
          [...basePath, 'status'],
          'A clinically reviewed pack may contain only clinically reviewed templates.',
        ),
      );
    }
    if (
      manifest.review_status === 'engineering_reviewed' &&
      template.status !== 'engineering_reviewed' &&
      template.status !== 'clinical_reviewed'
    ) {
      issues.push(
        issue(
          'content_review_incomplete',
          [...basePath, 'status'],
          'An engineering-reviewed pack cannot contain draft or retired templates.',
        ),
      );
    }
  });
  pushUniqueKeyIssues(
    exercises,
    (exercise) => `${exercise.id}@${exercise.version}`,
    ['manifest', 'exercises'],
    'id',
    'content_duplicate_id',
    issues,
  );
  pushUniqueKeyIssues(
    exercises,
    (exercise) => `${exercise.slug}@${exercise.version}`,
    ['manifest', 'exercises'],
    'slug',
    'content_duplicate_value',
    issues,
  );

  const exerciseVersions = new Map(
    exercises.map((exercise) => [
      `${exercise.id}@${exercise.version}`,
      exercise,
    ]),
  );
  const exercisesById = new Map<string, Exercise[]>();
  const idBySlug = new Map<string, string>();
  const slugById = new Map<string, string>();
  exercises.forEach((exercise) => {
    const versions = exercisesById.get(exercise.id) ?? [];
    versions.push(exercise);
    exercisesById.set(exercise.id, versions);
    const knownId = idBySlug.get(exercise.slug);
    if (knownId !== undefined && knownId !== exercise.id) {
      const index = exercises.indexOf(exercise);
      issues.push(
        issue(
          'content_duplicate_value',
          ['manifest', 'exercises', index, 'slug'],
          `Exercise slug ${exercise.slug} is already assigned to another identity.`,
        ),
      );
    }
    const knownSlug = slugById.get(exercise.id);
    if (knownSlug !== undefined && knownSlug !== exercise.slug) {
      const index = exercises.indexOf(exercise);
      issues.push(
        issue(
          'content_duplicate_id',
          ['manifest', 'exercises', index, 'id'],
          `Exercise identity ${exercise.id} is already assigned to another slug.`,
        ),
      );
    }
    idBySlug.set(exercise.slug, exercise.id);
    slugById.set(exercise.id, exercise.slug);
  });

  exercises.forEach((exercise, exerciseIndex) => {
    const basePath = ['manifest', 'exercises', exerciseIndex] as const;
    validateExerciseArrays(exercise, exerciseIndex, issues);

    if (
      exercise.prescription.minimum > exercise.prescription.default ||
      exercise.prescription.default > exercise.prescription.maximum ||
      exercise.prescription.sets > exercise.dosage_limits.max_sets_per_routine
    ) {
      issues.push(
        issue(
          'content_dosage_bounds_invalid',
          [...basePath, 'prescription'],
          'Prescription bounds must be monotonic and remain within dosage limits.',
        ),
      );
    }

    if (!exercise.effects.some((effect) => effect.primary)) {
      issues.push(
        issue(
          'content_relation_intent_invalid',
          [...basePath, 'effects'],
          'At least one exercise effect must be primary.',
        ),
      );
    }

    if (!reviewComplete(exercise)) {
      issues.push(
        issue(
          'content_review_incomplete',
          [...basePath, 'review'],
          `Review records do not support status ${exercise.status} at version ${exercise.version}.`,
        ),
      );
    }
    if ((exercise.status === 'retired') !== (exercise.retired_at !== null)) {
      issues.push(
        issue(
          'content_review_incomplete',
          [...basePath, 'retired_at'],
          'Only retired exercises have a retirement timestamp.',
        ),
      );
    }
    if (
      exercise.retired_at !== null &&
      Date.parse(exercise.retired_at) < Date.parse(exercise.created_at)
    ) {
      issues.push(
        issue(
          'content_review_incomplete',
          [...basePath, 'retired_at'],
          'An exercise cannot retire before it was created.',
        ),
      );
    }
    if (Date.parse(exercise.created_at) > Date.parse(manifest.created_at)) {
      issues.push(
        issue(
          'content_review_incomplete',
          [...basePath, 'created_at'],
          'An exercise cannot be created after its content pack.',
        ),
      );
    }
    if (
      manifest.review_status === 'clinical_reviewed' &&
      exercise.status !== 'clinical_reviewed'
    ) {
      issues.push(
        issue(
          'content_review_incomplete',
          [...basePath, 'status'],
          'A clinically reviewed pack may contain only clinically reviewed exercises.',
        ),
      );
    }
    if (
      manifest.review_status === 'engineering_reviewed' &&
      exercise.status !== 'engineering_reviewed' &&
      exercise.status !== 'clinical_reviewed'
    ) {
      issues.push(
        issue(
          'content_review_incomplete',
          [...basePath, 'status'],
          'An engineering-reviewed pack cannot contain draft or retired exercises.',
        ),
      );
    }

    const referencedLocalizationKeys: {
      readonly key: string;
      readonly path: readonly PropertyKey[];
    }[] = [
      { key: exercise.name_key, path: [...basePath, 'name_key'] },
      { key: exercise.summary_key, path: [...basePath, 'summary_key'] },
      {
        key: exercise.instructions.setup_key,
        path: [...basePath, 'instructions', 'setup_key'],
      },
      {
        key: exercise.instructions.execution_key,
        path: [...basePath, 'instructions', 'execution_key'],
      },
      {
        key: exercise.instructions.breathing_key,
        path: [...basePath, 'instructions', 'breathing_key'],
      },
      ...exercise.instructions.common_error_keys.map((key, index) => ({
        key,
        path: [...basePath, 'instructions', 'common_error_keys', index],
      })),
      ...exercise.instructions.stop_rule_keys.map((key, index) => ({
        key,
        path: [...basePath, 'instructions', 'stop_rule_keys', index],
      })),
    ];
    exercise.contraindications.forEach((entry, index) => {
      referencedLocalizationKeys.push({
        key: entry.reason_key,
        path: [...basePath, 'contraindications', index, 'reason_key'],
      });
      if (entry.caution_effect?.type === 'user_warning') {
        referencedLocalizationKeys.push({
          key: entry.caution_effect.warning_key,
          path: [
            ...basePath,
            'contraindications',
            index,
            'caution_effect',
            'warning_key',
          ],
        });
      }
    });
    referencedLocalizationKeys.forEach(({ key, path }) => {
      if (!localizationKeys.has(key)) {
        issues.push(
          issue(
            'content_unknown_localization_key',
            path,
            `Unknown localization key: ${key}.`,
          ),
        );
      }
    });

    const referencedMedia = [
      exercise.media.video_asset,
      exercise.media.animation_asset,
      exercise.media.audio_asset,
    ].filter((value): value is string => typeof value === 'string');
    referencedMedia.forEach((asset) => {
      if (!mediaAssets.has(asset)) {
        issues.push(
          issue(
            'content_unknown_media_asset',
            [...basePath, 'media'],
            `Unknown media asset: ${asset}.`,
          ),
        );
      }
    });

    exercise.effects.forEach((effect, effectIndex) => {
      const region = regionsBySlug.get(effect.region_slug);
      if (region === undefined) {
        issues.push(
          issue(
            'content_unknown_body_region',
            [...basePath, 'effects', effectIndex, 'region_slug'],
            `Unknown body region: ${effect.region_slug}.`,
          ),
        );
      } else if (!sideAllowed(region, effect.side)) {
        issues.push(
          issue(
            'content_side_incompatible',
            [...basePath, 'effects', effectIndex, 'side'],
            `Side ${effect.side} is incompatible with ${region.laterality} region ${region.slug}.`,
          ),
        );
      }
    });

    const requiredEquipment = [
      ...exercise.requirements.equipment.all_of.map((slug, index) => ({
        slug,
        path: [...basePath, 'requirements', 'equipment', 'all_of', index],
      })),
      ...exercise.requirements.equipment.any_of.flatMap((group, groupIndex) =>
        group.map((slug, index) => ({
          slug,
          path: [
            ...basePath,
            'requirements',
            'equipment',
            'any_of',
            groupIndex,
            index,
          ],
        })),
      ),
    ];
    requiredEquipment.forEach(({ slug, path }) => {
      if (!equipmentSlugs.has(slug)) {
        issues.push(
          issue(
            'content_unknown_equipment',
            path,
            `Unknown equipment: ${slug}.`,
          ),
        );
      }
    });
    exercise.allowed_modes.forEach((mode, modeIndex) => {
      if (!modeSlugs.has(mode)) {
        issues.push(
          issue(
            'content_unknown_mode',
            [...basePath, 'allowed_modes', modeIndex],
            `Unknown session mode: ${mode}.`,
          ),
        );
      }
    });

    exercise.contraindications.forEach((entry, contraindicationIndex) => {
      const path = [
        ...basePath,
        'contraindications',
        contraindicationIndex,
      ] as const;
      if (
        entry.match.region_slug !== null &&
        !regionsBySlug.has(entry.match.region_slug)
      ) {
        issues.push(
          issue(
            'content_unknown_body_region',
            [...path, 'match', 'region_slug'],
            `Unknown body region: ${entry.match.region_slug}.`,
          ),
        );
      } else if (
        entry.match.region_slug !== null &&
        entry.match.side !== 'any'
      ) {
        const region = regionsBySlug.get(entry.match.region_slug);
        if (region !== undefined && !sideAllowed(region, entry.match.side)) {
          issues.push(
            issue(
              'content_side_incompatible',
              [...path, 'match', 'side'],
              `Side ${entry.match.side} is incompatible with ${region.laterality} region ${region.slug}.`,
            ),
          );
        }
      }
      if (entry.severity === 'caution' && entry.caution_effect === null) {
        issues.push(
          issue(
            'content_caution_effect_required',
            [...path, 'caution_effect'],
            'A caution requires a reviewed concrete effect.',
          ),
        );
      }
      if (
        !reviewCompleteForStatus(
          entry.review,
          exercise.status,
          exercise.version,
        )
      ) {
        issues.push(
          issue(
            'content_review_incomplete',
            [...path, 'review'],
            'Contraindication review must match the exercise status and version.',
          ),
        );
      }
      if (
        entry.severity === 'hard_exclusion' &&
        entry.caution_effect !== null
      ) {
        issues.push(
          issue(
            'content_caution_effect_forbidden',
            [...path, 'caution_effect'],
            'A hard exclusion cannot be downgraded through a caution effect.',
          ),
        );
      }
      if (
        entry.caution_effect?.type === 'dose_cap' &&
        (entry.caution_effect.maximum > exercise.prescription.maximum ||
          entry.caution_effect.max_sets >
            exercise.dosage_limits.max_sets_per_routine)
      ) {
        issues.push(
          issue(
            'content_dosage_bounds_invalid',
            [...path, 'caution_effect'],
            'A caution dose cap cannot exceed the exercise dosage limits.',
          ),
        );
      }
      if (entry.caution_effect?.type === 'reviewed_variant') {
        const target = `${entry.caution_effect.exercise_id}@${entry.caution_effect.version}`;
        if (!exerciseVersions.has(target)) {
          issues.push(
            issue(
              'content_relation_target_missing',
              [...path, 'caution_effect'],
              `Reviewed variant does not resolve: ${target}.`,
            ),
          );
        }
      }
    });

    const sourcePrimaryEffects = new Set(
      exercise.effects
        .filter((effect) => effect.primary)
        .map((effect) => effect.effect),
    );
    exercise.relations.forEach((relation, relationIndex) => {
      const path = [...basePath, 'relations', relationIndex] as const;
      relation.supported_modes.forEach((mode, modeIndex) => {
        if (!modeSlugs.has(mode)) {
          issues.push(
            issue(
              'content_unknown_mode',
              [...path, 'supported_modes', modeIndex],
              `Unknown session mode: ${mode}.`,
            ),
          );
        }
      });

      const targetVersions = exercisesById.get(relation.target_exercise_id);
      const pinnedKey = `${relation.target_exercise_id}@${relation.target_version ?? 'null'}`;
      if (
        targetVersions === undefined ||
        (relation.version_policy === 'pinned' &&
          !exerciseVersions.has(pinnedKey))
      ) {
        issues.push(
          issue(
            'content_relation_target_missing',
            [...path, 'target_exercise_id'],
            `Relation target does not resolve: ${pinnedKey}.`,
          ),
        );
      }
      if (
        (relation.version_policy === 'pinned') !==
        (relation.target_version !== null)
      ) {
        issues.push(
          issue(
            'content_relation_version_invalid',
            [...path, 'target_version'],
            'Pinned relations require a version; compatible relations must float.',
          ),
        );
      }
      if (relation.target_exercise_id === exercise.id) {
        issues.push(
          issue(
            'content_relation_cycle',
            [...path, 'target_exercise_id'],
            'An exercise cannot relate to itself.',
          ),
        );
      }
      if (
        (relation.type === 'alternative' || relation.type === 'regression') &&
        [...sourcePrimaryEffects].some(
          (effect) => !relation.preserves_effects.includes(effect),
        )
      ) {
        issues.push(
          issue(
            'content_relation_intent_invalid',
            [...path, 'preserves_effects'],
            'Alternative and regression relations must preserve every primary effect.',
          ),
        );
      }
      if (targetVersions !== undefined) {
        const targetPreservesIntent = targetVersions.every((target) => {
          const targetEffects = new Set(
            target.effects.map((effect) => effect.effect),
          );
          return relation.preserves_effects.every((effect) =>
            targetEffects.has(effect),
          );
        });
        if (!targetPreservesIntent) {
          issues.push(
            issue(
              'content_relation_intent_invalid',
              [...path, 'preserves_effects'],
              'The relation target does not contain every declared preserved effect.',
            ),
          );
        }
      }
    });
  });

  relationCycleIssues(exercises, issues);
  return issues;
}

function sortIssues(
  issues: readonly ContentValidationIssue[],
): ContentValidationIssue[] {
  return [...issues].sort((left, right) => {
    if (left.path < right.path) return -1;
    if (left.path > right.path) return 1;
    if (left.code < right.code) return -1;
    if (left.code > right.code) return 1;
    return 0;
  });
}

export function validateContentCatalog(
  input: unknown,
): ContentValidationResult {
  const parsed = contentCatalogSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, issues: sortIssues(zodIssues(parsed.error)) };
  }

  const issues = sortIssues(validateCatalog(parsed.data));
  return issues.length === 0
    ? { ok: true, catalog: parsed.data }
    : { ok: false, issues };
}
