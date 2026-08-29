import { z } from 'zod';

const slugPattern = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const localizationKeyPattern = /^[a-z][a-z0-9]*(?:[._][a-z0-9]+)*$/;
const semanticVersionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const ulidPattern = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const canonicalSlugSchema = z.string().min(1).max(96).regex(slugPattern);
export const localizationKeySchema = z
  .string()
  .min(1)
  .max(160)
  .regex(localizationKeyPattern);
export const contentVersionSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(semanticVersionPattern);
export const utcTimestampSchema = z.string().datetime();
export const mediaAssetSchema = z
  .string()
  .min(1)
  .max(256)
  .regex(/^assets\/[A-Za-z0-9_./-]+$/);
export const stableIdSchema = z
  .string()
  .refine((value) => ulidPattern.test(value) || uuidPattern.test(value));

export const reviewStatusSchema = z.enum([
  'draft',
  'engineering_reviewed',
  'clinical_reviewed',
  'retired',
]);
export const environmentSchema = z.enum([
  'home',
  'desk',
  'gym',
  'travel',
  'custom',
]);
export const safetyStateSchema = z.enum(['clear', 'gentle_only']);
export const bodySideSchema = z.enum(['central', 'left', 'right', 'bilateral']);
export const bodySurfaceSchema = z.enum([
  'front',
  'back',
  'both',
  'detail',
  'none',
]);
export const lateralitySchema = z.enum(['central', 'paired', 'hybrid']);

export const intendedEffectSchema = z.enum([
  'down_regulate',
  'breathe_expand',
  'decompress',
  'mobilize',
  'explore_range',
  'improve_tolerance',
  'activate_lightly',
  'stabilize_control',
  'integrate',
  'prepare_for_load',
  'recover_after_load',
  'reassess',
]);

export const movementPatternSchema = z.enum([
  'flexion_extension',
  'rotation',
  'lateral_flexion',
  'abduction_adduction',
  'internal_external_rotation',
  'protraction_retraction',
  'elevation_depression',
  'pronation_supination',
  'wrist_flexion_extension_deviation',
  'ankle_dorsiflexion_plantarflexion',
  'segmental_spinal_movement',
  'overhead_position',
  'shoulder_extension',
  'straight_arm_scapular_position',
  'compression',
  'squat_pattern',
  'hinge_pattern',
]);

export const sessionPhaseSchema = z.enum([
  'arrival',
  'warm_motion',
  'targeted_mobility',
  'controlled_range',
  'integration',
  'cooldown',
  'reassessment',
]);

export const bodyRegionSchema = z.strictObject({
  slug: canonicalSlugSchema,
  display_name: localizationKeySchema,
  parent_slug: canonicalSlugSchema.nullable(),
  selectable: z.boolean(),
  surface: bodySurfaceSchema,
  laterality: lateralitySchema,
  geometry_key: canonicalSlugSchema.nullable(),
  accessibility_key: localizationKeySchema,
  active: z.boolean(),
  content_version: contentVersionSchema,
});

export const equipmentSchema = z.strictObject({
  id: stableIdSchema,
  slug: canonicalSlugSchema,
  name_key: localizationKeySchema,
  category: canonicalSlugSchema,
  active: z.boolean(),
  content_version: contentVersionSchema,
});

const reviewEntrySchema = z.strictObject({
  reviewer_role: z.enum(['engineering', 'clinical']),
  reviewed_at: utcTimestampSchema,
  reviewed_version: z.number().int().positive(),
  notes_reference: z.string().min(1).max(256).nullable(),
});

const reviewSchema = z.strictObject({
  engineering: reviewEntrySchema.nullable(),
  clinical: reviewEntrySchema.nullable(),
});

const instructionsSchema = z.strictObject({
  setup_key: localizationKeySchema,
  execution_key: localizationKeySchema,
  breathing_key: localizationKeySchema,
  common_error_keys: z.array(localizationKeySchema).min(1),
  stop_rule_keys: z.array(localizationKeySchema).min(1),
});

export const prescriptionTypeSchema = z.enum([
  'timed_hold',
  'timed_movement',
  'repetitions',
  'breathing_cycles',
  'reassessment',
]);

export const prescriptionSideModeSchema = z.enum([
  'unilateral',
  'bilateral_simultaneous',
  'bilateral_sequential',
  'central',
]);

const prescriptionSchema = z.strictObject({
  type: prescriptionTypeSchema,
  default: z.number().int().positive(),
  minimum: z.number().int().positive(),
  maximum: z.number().int().positive(),
  sets: z.number().int().positive(),
  rest_seconds: z.number().int().nonnegative(),
  tempo: canonicalSlugSchema,
  side_mode: prescriptionSideModeSchema,
});

const effectSchema = z.strictObject({
  region_slug: canonicalSlugSchema,
  side: bodySideSchema,
  effect: intendedEffectSchema,
  magnitude: z.number().int().min(1).max(3),
  movement_pattern: movementPatternSchema.nullable(),
  primary: z.boolean(),
});

const requirementsSchema = z.strictObject({
  equipment: z.strictObject({
    all_of: z.array(canonicalSlugSchema),
    any_of: z.array(z.array(canonicalSlugSchema).min(1)),
  }),
  environments: z.array(environmentSchema).min(1),
  position: z.enum([
    'standing',
    'seated',
    'kneeling',
    'half_kneeling',
    'quadruped',
    'supine',
    'prone',
    'side_lying',
    'hanging',
    'supported',
  ]),
  space: z.enum(['minimal', 'small', 'medium', 'large']),
  setup_cost: z.enum(['low', 'medium', 'high']),
});

const contraindicationMatchSchema = z.strictObject({
  region_slug: canonicalSlugSchema.nullable(),
  side: z.enum(['any', 'central', 'left', 'right', 'bilateral']),
  symptom_qualities: z.array(canonicalSlugSchema),
  rating_threshold: z.number().int().min(0).max(10).nullable(),
  recent_trauma: z.boolean().nullable(),
  demand_flags: z.array(
    z.enum([
      'weight_bearing',
      'balance',
      'end_range',
      'neck_position',
      'wrist_extension',
      'shoulder_extension',
      'spinal_flexion',
      'spinal_extension',
      'equipment_stability',
    ]),
  ),
  allowed_safety_states: z.array(safetyStateSchema).min(1),
});

const cautionEffectSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('dose_cap'),
    maximum: z.number().int().positive(),
    max_sets: z.number().int().positive(),
  }),
  z.strictObject({
    type: z.literal('reviewed_variant'),
    exercise_id: stableIdSchema,
    version: z.number().int().positive(),
  }),
  z.strictObject({
    type: z.literal('user_warning'),
    warning_key: localizationKeySchema,
  }),
]);

const contraindicationSchema = z.strictObject({
  rule_id: canonicalSlugSchema,
  severity: z.enum(['hard_exclusion', 'caution']),
  match: contraindicationMatchSchema,
  reason_key: localizationKeySchema,
  caution_effect: cautionEffectSchema.nullable(),
  review: reviewSchema,
});

const relationSchema = z.strictObject({
  type: z.enum([
    'alternative',
    'regression',
    'progression',
    'prerequisite',
    'pairing',
  ]),
  target_exercise_id: stableIdSchema,
  version_policy: z.enum(['pinned', 'compatible']),
  target_version: z.number().int().positive().nullable(),
  supported_modes: z.array(canonicalSlugSchema).min(1),
  preserves_effects: z.array(intendedEffectSchema).min(1),
});

const mediaSchema = z.strictObject({
  video_asset: mediaAssetSchema.nullable().optional(),
  animation_asset: mediaAssetSchema.nullable().optional(),
  audio_asset: mediaAssetSchema.nullable().optional(),
  text_fallback_required: z.literal(true),
});

const dosageLimitsSchema = z.strictObject({
  max_sets_per_routine: z.number().int().positive(),
  max_weekly_exposure: z.number().int().positive().nullable(),
  progression_step: z.number().int().positive().nullable(),
  extendable: z.boolean(),
});

export const exerciseSchema = z.strictObject({
  id: stableIdSchema,
  slug: canonicalSlugSchema,
  version: z.number().int().positive(),
  status: reviewStatusSchema,
  name_key: localizationKeySchema,
  summary_key: localizationKeySchema,
  instructions: instructionsSchema,
  prescription: prescriptionSchema,
  intensity: z.enum(['very_gentle', 'gentle', 'moderate']),
  phases: z.array(sessionPhaseSchema).min(1),
  movement_patterns: z.array(movementPatternSchema).min(1),
  effects: z.array(effectSchema).min(1),
  requirements: requirementsSchema,
  contraindications: z.array(contraindicationSchema),
  relations: z.array(relationSchema),
  media: mediaSchema,
  allowed_modes: z.array(canonicalSlugSchema).min(1),
  dosage_limits: dosageLimitsSchema,
  review: reviewSchema,
  created_at: utcTimestampSchema,
  retired_at: utcTimestampSchema.nullable(),
});

export const contentManifestSchema = z.strictObject({
  schema_version: z.literal(1),
  content_version: contentVersionSchema,
  created_at: utcTimestampSchema,
  review_status: reviewStatusSchema,
  exercises: z.array(exerciseSchema),
  routine_templates: z.array(z.unknown()),
});

export const contentCatalogSchema = z.strictObject({
  manifest: contentManifestSchema,
  body_regions: z.array(bodyRegionSchema),
  equipment: z.array(equipmentSchema),
  modes: z.array(canonicalSlugSchema),
  localization_keys: z.array(localizationKeySchema),
  media_assets: z.array(mediaAssetSchema),
});

export type BodyRegion = z.infer<typeof bodyRegionSchema>;
export type Equipment = z.infer<typeof equipmentSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type ContentManifest = z.infer<typeof contentManifestSchema>;
export type ContentCatalog = z.infer<typeof contentCatalogSchema>;
