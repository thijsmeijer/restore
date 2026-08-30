import type {
  ContentManifest,
  Exercise,
  RoutineTemplate,
} from '@/content/schemas';
import type { GenerationInput } from '@/generator/input-schema';

export interface GenerationRules {
  readonly rules_version: string;
  readonly configuration_version: string;
  readonly safety_rules_version: string;
  readonly seconds_per_repetition: number;
  readonly seconds_per_breathing_cycle: number;
  readonly seconds_per_reassessment: number;
  readonly transition_seconds: number;
  readonly duration_tolerance_basis_points: number;
  readonly high_priority_target_count: number;
  readonly target_priority_step_basis_points: number;
  readonly minimum_target_priority_basis_points: number;
  readonly profile_goal_priority_step_basis_points: number;
  readonly minimum_profile_goal_priority_basis_points: number;
  readonly goal_effect_mappings: readonly {
    readonly goal_slug: string;
    readonly effects: readonly Exercise['effects'][number]['effect'][];
  }[];
  readonly maximum_items: number;
  readonly maximum_same_movement_pattern: number;
  readonly scoring: {
    readonly target_match: number;
    readonly primary_effect_bonus: number;
    readonly intent_match: number;
    readonly profile_goal_match: number;
    readonly training_context_match: number;
    readonly favorite: number;
    readonly helpful_response_each: number;
    readonly helpful_response_cap: number;
    readonly uncomfortable_response_each: number;
    readonly uncomfortable_response_cap: number;
    readonly preference_skip_each: number;
    readonly preference_skip_cap: number;
    readonly preference_replacement_each: number;
    readonly preference_replacement_cap: number;
    readonly history_combined_cap: number;
    readonly recent_exposure_penalty: number;
  };
}

export interface GenerationCatalog {
  readonly content_version: string;
  readonly review_status: ContentManifest['review_status'];
  readonly exercises: readonly Exercise[];
  readonly templates: readonly RoutineTemplate[];
}

export type CandidateRejectionCode =
  | 'content_not_clinically_reviewed'
  | 'duration_exceeds_available'
  | 'environment_not_allowed'
  | 'equipment_missing'
  | 'equipment_unstable'
  | 'hard_contraindication'
  | 'intensity_exceeds_template'
  | 'mode_not_allowed'
  | 'side_incompatible'
  | 'space_insufficient'
  | 'user_avoided';

export interface CandidateRejection {
  readonly code: CandidateRejectionCode;
  readonly reference_id: string | null;
}

export interface EligibleCandidate {
  readonly exercise: Exercise;
  readonly minimum_duration_seconds: number;
  readonly caution_rule_ids: readonly string[];
}

export type ScoreTermCode =
  | 'favorite'
  | 'helpful_response'
  | 'history_cap_adjustment'
  | 'intent_match'
  | 'preference_replacement'
  | 'preference_skip'
  | 'primary_effect'
  | 'profile_goal_match'
  | 'recent_exposure'
  | 'target_match'
  | 'training_context_match'
  | 'uncomfortable_response';

export interface ScoreTerm {
  readonly code: ScoreTermCode;
  readonly points: number;
  readonly reference_id: string | null;
}

export interface ScoredCandidate extends EligibleCandidate {
  readonly score: number;
  readonly score_terms: readonly ScoreTerm[];
  readonly tie_break: number;
  readonly matched_target_keys: readonly string[];
}

export interface TargetPriority {
  readonly region_slug: string;
  readonly side: GenerationInput['target_regions'][number]['side'];
  readonly priority_basis_points: number;
  readonly high_priority: boolean;
}

export interface ExactPrescription {
  readonly type: Exercise['prescription']['type'];
  readonly dose: number;
  readonly sets: number;
  readonly tempo: string;
  readonly side_mode: Exercise['prescription']['side_mode'];
  readonly side_sequence: readonly GenerationInput['target_regions'][number]['side'][];
  readonly rest_seconds: number;
  readonly transition_seconds: number;
  readonly estimated_duration_seconds: number;
}

export interface RoutineAlternative {
  readonly relation_type: 'alternative' | 'regression';
  readonly exercise_id: string;
  readonly exercise_version: number;
}

export type SelectionReasonCode =
  | 'favorite_history'
  | 'helpful_history'
  | 'intent_match'
  | 'phase_requirement'
  | 'profile_goal_match'
  | 'target_match'
  | 'training_context_match';

export interface GeneratedRoutineItem {
  readonly order: number;
  readonly phase: RoutineTemplate['phases'][number]['phase'];
  readonly exercise_id: string;
  readonly exercise_version: number;
  readonly prescription: ExactPrescription;
  readonly selection_reason_codes: readonly SelectionReasonCode[];
  readonly explanation_key: string;
  readonly explanation_reference_ids: readonly string[];
  readonly caution_rule_ids: readonly string[];
  readonly warning_keys: readonly string[];
  readonly alternatives: readonly RoutineAlternative[];
  readonly score: number;
  readonly score_terms: readonly ScoreTerm[];
}

export type TargetOmissionReasonCode =
  'no_eligible_candidate' | 'routine_constraints_limited_selection';

export interface TargetCoverage {
  readonly region_slug: string;
  readonly side: GenerationInput['target_regions'][number]['side'];
  readonly priority_basis_points: number;
  readonly high_priority: boolean;
  readonly addressed: boolean;
  readonly exercise_ids: readonly string[];
  readonly omission_reason_code: TargetOmissionReasonCode | null;
}

export type RoutineValidationCode =
  | 'alternative_invalid'
  | 'caution_requirement_invalid'
  | 'duration_indivisible_difference'
  | 'duration_out_of_bounds'
  | 'duplicate_exercise'
  | 'empty_routine'
  | 'explanation_invalid'
  | 'hard_filter_violation'
  | 'item_limit_exceeded'
  | 'movement_pattern_limit_exceeded'
  | 'phase_budget_invalid'
  | 'phase_order_invalid'
  | 'prescription_invalid'
  | 'scoring_invalid'
  | 'target_coverage_unexplained';

export interface RoutineValidationReport {
  readonly valid: boolean;
  readonly issue_codes: readonly RoutineValidationCode[];
  readonly duration_status: 'within_tolerance' | 'indivisible_difference';
  readonly requested_duration_seconds: number;
  readonly estimated_duration_seconds: number;
  readonly tolerance_seconds: number;
  readonly target_coverage: readonly TargetCoverage[];
}

export interface GeneratedRoutine {
  readonly ok: true;
  readonly routine_id: string;
  readonly check_in_id: string;
  readonly generated_at: string;
  readonly input_snapshot: GenerationInput;
  readonly template_id: string;
  readonly template_version: number;
  readonly mode: string;
  readonly content_version: string;
  readonly engine_version: string;
  readonly rules_version: string;
  readonly configuration_version: string;
  readonly seed: string;
  readonly target_priorities: readonly TargetPriority[];
  readonly items: readonly GeneratedRoutineItem[];
  readonly estimated_duration_seconds: number;
  readonly explanation_key: string;
  readonly validation: RoutineValidationReport;
  readonly rejection_report: readonly RejectedCandidate[];
}

export interface RejectedCandidate {
  readonly exercise_id: string;
  readonly exercise_version: number;
  readonly reasons: readonly CandidateRejection[];
}

export type GenerationFailureCode =
  | 'blocked_by_safety'
  | 'catalog_duplicate_exercise'
  | 'catalog_not_clinically_reviewed'
  | 'content_version_mismatch'
  | 'input_invalid'
  | 'no_eligible_content'
  | 'duration_unfillable'
  | 'phase_unfillable'
  | 'replacement_unavailable'
  | 'routine_invalid'
  | 'template_ambiguous'
  | 'template_unavailable'
  | 'version_mismatch';

export interface GenerationFailure {
  readonly ok: false;
  readonly code: GenerationFailureCode;
  readonly explanation_key: string;
  readonly rejection_report: readonly RejectedCandidate[];
}

export interface PreparedGeneration {
  readonly ok: true;
  readonly input: GenerationInput;
  readonly template: RoutineTemplate;
  readonly eligible_candidates: readonly EligibleCandidate[];
  readonly rejection_report: readonly RejectedCandidate[];
}

export type PrepareGenerationResult = PreparedGeneration | GenerationFailure;
export type GenerationResult = GeneratedRoutine | GenerationFailure;
