import { z } from 'zod';

import {
  bodySideSchema,
  canonicalSlugSchema,
  contentVersionSchema,
  prescriptionSideModeSchema,
  prescriptionTypeSchema,
  sessionPhaseSchema,
  stableIdSchema,
  utcTimestampSchema,
} from '@/content/schemas';
import { generationInputSchema } from '@/generator/input-schema';
import type { GeneratedRoutine, GeneratedRoutineItem } from '@/generator/types';

const scoreTermCodeSchema = z.enum([
  'favorite',
  'helpful_response',
  'history_cap_adjustment',
  'intent_match',
  'preference_replacement',
  'preference_skip',
  'primary_effect',
  'profile_goal_match',
  'recent_exposure',
  'target_match',
  'training_context_match',
  'uncomfortable_response',
]);

const scoreTermSchema = z
  .strictObject({
    code: scoreTermCodeSchema,
    points: z.number().int(),
    reference_id: z.string().nullable(),
  })
  .readonly();

const prescriptionSchema = z
  .strictObject({
    type: prescriptionTypeSchema,
    dose: z.number().int().positive(),
    sets: z.number().int().positive(),
    tempo: canonicalSlugSchema,
    side_mode: prescriptionSideModeSchema,
    side_sequence: z.array(bodySideSchema).min(1).readonly(),
    rest_seconds: z.number().int().nonnegative(),
    transition_seconds: z.number().int().nonnegative(),
    estimated_duration_seconds: z.number().int().positive(),
  })
  .readonly();

const selectionReasonCodeSchema = z.enum([
  'favorite_history',
  'helpful_history',
  'intent_match',
  'phase_requirement',
  'profile_goal_match',
  'target_match',
  'training_context_match',
]);

const routineAlternativeSchema = z
  .strictObject({
    relation_type: z.enum(['alternative', 'regression']),
    exercise_id: stableIdSchema,
    exercise_version: z.number().int().positive(),
  })
  .readonly();

export const generatedRoutineItemSchema = z
  .strictObject({
    order: z.number().int().nonnegative(),
    phase: sessionPhaseSchema,
    exercise_id: stableIdSchema,
    exercise_version: z.number().int().positive(),
    prescription: prescriptionSchema,
    selection_reason_codes: z.array(selectionReasonCodeSchema).readonly(),
    explanation_key: z.string().min(1),
    explanation_reference_ids: z.array(z.string()).readonly(),
    caution_rule_ids: z.array(canonicalSlugSchema).readonly(),
    warning_keys: z.array(z.string().min(1)).readonly(),
    alternatives: z.array(routineAlternativeSchema).readonly(),
    score: z.number().int(),
    score_terms: z.array(scoreTermSchema).readonly(),
  })
  .readonly();

const targetPrioritySchema = z
  .strictObject({
    region_slug: canonicalSlugSchema,
    side: bodySideSchema,
    priority_basis_points: z.number().int().min(0).max(10_000),
    high_priority: z.boolean(),
  })
  .readonly();

const targetCoverageSchema = z
  .strictObject({
    region_slug: canonicalSlugSchema,
    side: bodySideSchema,
    priority_basis_points: z.number().int().min(0).max(10_000),
    high_priority: z.boolean(),
    addressed: z.boolean(),
    exercise_ids: z.array(stableIdSchema).readonly(),
    omission_reason_code: z
      .enum(['no_eligible_candidate', 'routine_constraints_limited_selection'])
      .nullable(),
  })
  .readonly();

const routineValidationCodeSchema = z.enum([
  'alternative_invalid',
  'caution_requirement_invalid',
  'duration_indivisible_difference',
  'duration_out_of_bounds',
  'duplicate_exercise',
  'empty_routine',
  'explanation_invalid',
  'hard_filter_violation',
  'item_limit_exceeded',
  'movement_pattern_limit_exceeded',
  'phase_budget_invalid',
  'phase_order_invalid',
  'prescription_invalid',
  'scoring_invalid',
  'target_coverage_unexplained',
]);

const routineValidationSchema = z
  .strictObject({
    valid: z.boolean(),
    issue_codes: z.array(routineValidationCodeSchema).readonly(),
    duration_status: z.enum(['within_tolerance', 'indivisible_difference']),
    requested_duration_seconds: z.number().int().positive(),
    estimated_duration_seconds: z.number().int().positive(),
    tolerance_seconds: z.number().int().nonnegative(),
    target_coverage: z.array(targetCoverageSchema).readonly(),
  })
  .readonly();

const candidateRejectionSchema = z
  .strictObject({
    code: z.enum([
      'content_not_clinically_reviewed',
      'duration_exceeds_available',
      'environment_not_allowed',
      'equipment_missing',
      'equipment_unstable',
      'hard_contraindication',
      'intensity_exceeds_template',
      'mode_not_allowed',
      'side_incompatible',
      'space_insufficient',
      'user_avoided',
    ]),
    reference_id: z.string().nullable(),
  })
  .readonly();

const rejectedCandidateSchema = z
  .strictObject({
    exercise_id: stableIdSchema,
    exercise_version: z.number().int().positive(),
    reasons: z.array(candidateRejectionSchema).min(1).readonly(),
  })
  .readonly();

export const generatedRoutineSchema = z
  .strictObject({
    ok: z.literal(true),
    routine_id: stableIdSchema,
    check_in_id: stableIdSchema,
    generated_at: utcTimestampSchema,
    input_snapshot: generationInputSchema,
    template_id: stableIdSchema,
    template_version: z.number().int().positive(),
    mode: canonicalSlugSchema,
    content_version: contentVersionSchema,
    engine_version: contentVersionSchema,
    rules_version: canonicalSlugSchema,
    configuration_version: contentVersionSchema,
    seed: z.string().min(1).max(128),
    target_priorities: z.array(targetPrioritySchema).readonly(),
    items: z.array(generatedRoutineItemSchema).min(1).readonly(),
    estimated_duration_seconds: z.number().int().positive(),
    explanation_key: z.string().min(1),
    validation: routineValidationSchema,
    rejection_report: z.array(rejectedCandidateSchema).readonly(),
  })
  .readonly();

export type RoutineStatus =
  'ready' | 'started' | 'completed' | 'abandoned' | 'superseded';

export type RoutineEditKind = 'generated' | 'replacement' | 'regenerated';

export type RoutineItemEditSource =
  'generator' | 'user_replacement' | 'regeneration';

export interface StoredRoutineItem {
  readonly id: string;
  readonly replacesRoutineItemId: string | null;
  readonly editSource: RoutineItemEditSource;
  readonly value: GeneratedRoutineItem;
}

export interface StoredRoutine {
  readonly value: GeneratedRoutine;
  readonly status: RoutineStatus;
  readonly supersedesRoutineId: string | null;
  readonly editKind: RoutineEditKind;
  readonly createdAt: string;
  readonly readyAt: string;
  readonly items: readonly StoredRoutineItem[];
}

export interface RoutineReplacementLineage {
  readonly newItemOrder: number;
  readonly replacedRoutineItemId: string;
}

export interface StoreRoutineOptions {
  readonly editKind: RoutineEditKind;
  readonly supersedesRoutineId: string | null;
  readonly replacement: RoutineReplacementLineage | null;
}

export function parseGeneratedRoutine(value: unknown): GeneratedRoutine {
  return generatedRoutineSchema.parse(value);
}
