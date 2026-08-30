import { z } from 'zod';

import {
  bodySideSchema,
  canonicalSlugSchema,
  contentVersionSchema,
  demandFlagSchema,
  environmentSchema,
  generatorSafetyStateSchema,
  intendedEffectSchema,
  spaceRequirementSchema,
  stableIdSchema,
  utcTimestampSchema,
} from '@/content/schemas';

export const generatorEngineVersion = '0.1.0' as const;

const generationTargetSchema = z
  .strictObject({
    region_slug: canonicalSlugSchema,
    side: bodySideSchema,
    maximum_rating: z.number().int().min(0).max(10).nullable(),
    symptom_qualities: z.array(canonicalSlugSchema).readonly(),
  })
  .readonly();

const generationPreferenceSchema = z
  .strictObject({
    exercise_id: stableIdSchema,
    favorite: z.boolean(),
    avoid_state: z.enum(['none', 'temporary', 'permanent']),
    avoid_until: utcTimestampSchema.nullable(),
  })
  .readonly();

const responseAggregateSchema = z
  .strictObject({
    exercise_id: stableIdSchema,
    helpful_count: z.number().int().nonnegative(),
    neutral_count: z.number().int().nonnegative(),
    uncomfortable_count: z.number().int().nonnegative(),
    skipped_count: z.number().int().nonnegative(),
    replaced_count: z.number().int().nonnegative(),
  })
  .readonly();

const trainingContextSchema = z
  .strictObject({
    training_type: canonicalSlugSchema,
    status: z.enum(['planned', 'completed']),
    stress: z.number().int().min(1).max(5),
  })
  .readonly();

export const generationInputSchema = z
  .strictObject({
    schema_version: z.literal(1),
    check_in_id: stableIdSchema,
    generated_at: utcTimestampSchema,
    mode: canonicalSlugSchema,
    available_minutes: z.number().int().min(2).max(90),
    environment: environmentSchema,
    available_space: spaceRequirementSchema,
    available_equipment: z.array(canonicalSlugSchema).readonly(),
    unstable_equipment: z.array(canonicalSlugSchema).readonly(),
    safety_state: generatorSafetyStateSchema,
    safety_rules_version: canonicalSlugSchema,
    safety_matched_rule_ids: z.array(canonicalSlugSchema).readonly(),
    safety_reason_codes: z.array(canonicalSlugSchema).readonly(),
    target_regions: z.array(generationTargetSchema).readonly(),
    intent: intendedEffectSchema.nullable(),
    recent_major_trauma: z.boolean(),
    restricted_demand_flags: z.array(demandFlagSchema).readonly(),
    profile_goal_slugs: z.array(canonicalSlugSchema).readonly(),
    training_context: trainingContextSchema.nullable(),
    preferences: z.array(generationPreferenceSchema).readonly(),
    response_aggregates: z.array(responseAggregateSchema).readonly(),
    recent_exercise_ids: z.array(stableIdSchema).readonly(),
    content_version: contentVersionSchema,
    engine_version: contentVersionSchema,
    rules_version: canonicalSlugSchema,
    configuration_version: contentVersionSchema,
    seed: z.string().min(1).max(128),
  })
  .readonly();

export type GenerationInput = z.infer<typeof generationInputSchema>;
export type GenerationTarget = GenerationInput['target_regions'][number];
export type GenerationPreference = GenerationInput['preferences'][number];
export type GeneratorSafetyState = GenerationInput['safety_state'];
