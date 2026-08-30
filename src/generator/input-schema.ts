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

export const generatorEngineVersion = '0.3.0' as const;

const generationTargetSchema = z
  .strictObject({
    region_slug: canonicalSlugSchema,
    side: bodySideSchema,
    maximum_rating: z.number().int().min(0).max(10).nullable(),
    symptom_qualities: z.array(canonicalSlugSchema).max(32).readonly(),
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
    helpful_count: z.number().int().min(0).max(1_000_000),
    neutral_count: z.number().int().min(0).max(1_000_000),
    uncomfortable_count: z.number().int().min(0).max(1_000_000),
    preference_skip_count: z.number().int().min(0).max(1_000_000),
    preference_replacement_count: z.number().int().min(0).max(1_000_000),
  })
  .readonly();

const trainingContextSchema = z
  .strictObject({
    training_type: canonicalSlugSchema,
    status: z.enum(['planned', 'completed']),
    stress: z.number().int().min(1).max(5).nullable(),
  })
  .readonly();

export const generationInputSchema = z
  .strictObject({
    schema_version: z.literal(2),
    routine_id: stableIdSchema,
    check_in_id: stableIdSchema,
    generated_at: utcTimestampSchema,
    mode: canonicalSlugSchema,
    available_minutes: z.number().int().min(2).max(90),
    environment: environmentSchema,
    available_space: spaceRequirementSchema,
    available_equipment: z.array(canonicalSlugSchema).max(64).readonly(),
    unstable_equipment: z.array(canonicalSlugSchema).max(64).readonly(),
    safety_state: generatorSafetyStateSchema,
    safety_rules_version: canonicalSlugSchema,
    safety_matched_rule_ids: z.array(canonicalSlugSchema).max(64).readonly(),
    safety_reason_codes: z.array(canonicalSlugSchema).max(64).readonly(),
    target_regions: z.array(generationTargetSchema).max(64).readonly(),
    intent: intendedEffectSchema.nullable(),
    recent_major_trauma: z.boolean(),
    restricted_demand_flags: z.array(demandFlagSchema).max(9).readonly(),
    profile_goal_slugs: z.array(canonicalSlugSchema).max(64).readonly(),
    training_context: trainingContextSchema.nullable(),
    preferences: z.array(generationPreferenceSchema).max(1_000).readonly(),
    response_aggregates: z.array(responseAggregateSchema).max(1_000).readonly(),
    recent_exercise_ids: z.array(stableIdSchema).max(1_000).readonly(),
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
