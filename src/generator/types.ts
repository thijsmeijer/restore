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
