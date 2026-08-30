import { generateRoutine } from '@/generator/generate-routine';
import { generationInputSchema } from '@/generator/input-schema';
import { prepareGeneration } from '@/generator/prepare-generation';
import { computeTargetPriorities, scoreCandidates } from '@/generator/scoring';
import type {
  CandidateRejectionCode,
  ExactPrescription,
  GeneratedRoutineItem,
  GenerationCatalog,
  GenerationFailureCode,
  GenerationRules,
  RoutineValidationCode,
  ScoreTermCode,
  SelectionReasonCode,
} from '@/generator/types';

export type GenerationTraceStageName =
  | 'input_validation'
  | 'version_validation'
  | 'safety_gate'
  | 'catalog_review'
  | 'hard_filtering'
  | 'scoring'
  | 'routine_build'
  | 'final_validation';

export interface GenerationTraceStage {
  readonly name: GenerationTraceStageName;
  readonly status: 'passed' | 'failed' | 'not_run';
  readonly reason_codes: readonly string[];
}

export interface GenerationTraceCandidate {
  readonly exercise_id: string;
  readonly exercise_version: number;
  readonly selected: boolean;
  readonly minimum_duration_seconds: number;
  readonly score: number;
  readonly score_terms: readonly {
    readonly code: ScoreTermCode;
    readonly points: number;
  }[];
}

export interface GenerationTraceRejection {
  readonly exercise_id: string;
  readonly exercise_version: number;
  readonly reason_codes: readonly CandidateRejectionCode[];
}

export interface GenerationTrace {
  readonly schema_version: 1;
  readonly redaction: 'default';
  readonly versions: {
    readonly content: string | null;
    readonly engine: string | null;
    readonly rules: string | null;
    readonly configuration: string | null;
    readonly safety_rules: string | null;
  };
  readonly stages: readonly GenerationTraceStage[];
  readonly candidates: readonly GenerationTraceCandidate[];
  readonly rejections: readonly GenerationTraceRejection[];
  readonly outcome:
    | {
        readonly type: 'routine';
        readonly template_id: string;
        readonly template_version: number;
        readonly estimated_duration_seconds: number;
        readonly duration_status: 'within_tolerance' | 'indivisible_difference';
        readonly validation_issue_codes: readonly RoutineValidationCode[];
        readonly items: readonly {
          readonly order: number;
          readonly phase: GeneratedRoutineItem['phase'];
          readonly exercise_id: string;
          readonly exercise_version: number;
          readonly prescription: {
            readonly type: ExactPrescription['type'];
            readonly dose: number;
            readonly sets: number;
            readonly tempo: string;
            readonly side_mode: ExactPrescription['side_mode'];
            readonly rest_seconds: number;
            readonly transition_seconds: number;
            readonly estimated_duration_seconds: number;
          };
          readonly selection_reason_codes: readonly SelectionReasonCode[];
        }[];
      }
    | {
        readonly type: 'failure';
        readonly code: GenerationFailureCode;
        readonly explanation_key: string;
      };
}

const traceStageOrder: readonly GenerationTraceStageName[] = [
  'input_validation',
  'version_validation',
  'safety_gate',
  'catalog_review',
  'hard_filtering',
  'scoring',
  'routine_build',
  'final_validation',
];

const failureStage: Record<GenerationFailureCode, GenerationTraceStageName> = {
  blocked_by_safety: 'safety_gate',
  catalog_duplicate_exercise: 'catalog_review',
  catalog_not_clinically_reviewed: 'catalog_review',
  content_version_mismatch: 'version_validation',
  duration_unfillable: 'routine_build',
  input_invalid: 'input_validation',
  no_eligible_content: 'hard_filtering',
  phase_unfillable: 'routine_build',
  routine_invalid: 'final_validation',
  template_ambiguous: 'catalog_review',
  template_unavailable: 'catalog_review',
  version_mismatch: 'version_validation',
};

function stagesForFailure(code: GenerationFailureCode): GenerationTraceStage[] {
  const failedIndex = traceStageOrder.indexOf(failureStage[code]);

  return traceStageOrder.map((name, index) => ({
    name,
    status:
      index < failedIndex
        ? 'passed'
        : index === failedIndex
          ? 'failed'
          : 'not_run',
    reason_codes: index === failedIndex ? [code] : [],
  }));
}

function passedStages(): GenerationTraceStage[] {
  return traceStageOrder.map((name) => ({
    name,
    status: 'passed',
    reason_codes: [],
  }));
}

function parsedVersions(rawInput: unknown): GenerationTrace['versions'] {
  const parsed = generationInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      content: null,
      engine: null,
      rules: null,
      configuration: null,
      safety_rules: null,
    };
  }

  return {
    content: parsed.data.content_version,
    engine: parsed.data.engine_version,
    rules: parsed.data.rules_version,
    configuration: parsed.data.configuration_version,
    safety_rules: parsed.data.safety_rules_version,
  };
}

export function createGenerationTrace(
  rawInput: unknown,
  catalog: GenerationCatalog,
  rules: GenerationRules,
): GenerationTrace {
  const result = generateRoutine(rawInput, catalog, rules);
  const prepared = prepareGeneration(rawInput, catalog, rules);
  const selectedIds = new Set(
    result.ok ? result.items.map((item) => item.exercise_id) : [],
  );
  const candidates = prepared.ok
    ? scoreCandidates(
        prepared.eligible_candidates,
        prepared.input,
        computeTargetPriorities(prepared.input, rules),
        rules,
      ).map((candidate): GenerationTraceCandidate => ({
        exercise_id: candidate.exercise.id,
        exercise_version: candidate.exercise.version,
        selected: selectedIds.has(candidate.exercise.id),
        minimum_duration_seconds: candidate.minimum_duration_seconds,
        score: candidate.score,
        score_terms: candidate.score_terms.map((term) => ({
          code: term.code,
          points: term.points,
        })),
      }))
    : [];

  const rejections = result.rejection_report.map(
    (entry): GenerationTraceRejection => ({
      exercise_id: entry.exercise_id,
      exercise_version: entry.exercise_version,
      reason_codes: entry.reasons.map((reason) => reason.code),
    }),
  );

  return {
    schema_version: 1,
    redaction: 'default',
    versions: parsedVersions(rawInput),
    stages: result.ok ? passedStages() : stagesForFailure(result.code),
    candidates,
    rejections,
    outcome: result.ok
      ? {
          type: 'routine',
          template_id: result.template_id,
          template_version: result.template_version,
          estimated_duration_seconds: result.estimated_duration_seconds,
          duration_status: result.validation.duration_status,
          validation_issue_codes: result.validation.issue_codes,
          items: result.items.map((item) => ({
            order: item.order,
            phase: item.phase,
            exercise_id: item.exercise_id,
            exercise_version: item.exercise_version,
            prescription: {
              type: item.prescription.type,
              dose: item.prescription.dose,
              sets: item.prescription.sets,
              tempo: item.prescription.tempo,
              side_mode: item.prescription.side_mode,
              rest_seconds: item.prescription.rest_seconds,
              transition_seconds: item.prescription.transition_seconds,
              estimated_duration_seconds:
                item.prescription.estimated_duration_seconds,
            },
            selection_reason_codes: item.selection_reason_codes,
          })),
        }
      : {
          type: 'failure',
          code: result.code,
          explanation_key: result.explanation_key,
        },
  };
}

export function serializeGenerationTrace(trace: GenerationTrace): string {
  return JSON.stringify(trace, null, 2);
}

export function formatGenerationTrace(trace: GenerationTrace): string {
  const lines = [
    `Generator trace v${trace.schema_version}`,
    `Outcome: ${
      trace.outcome.type === 'routine'
        ? `routine (${trace.outcome.items.length} items, ${trace.outcome.estimated_duration_seconds}s)`
        : `failure (${trace.outcome.code})`
    }`,
    '',
    'Decision stages',
    ...trace.stages.map(
      (stage) =>
        `- ${stage.name}: ${stage.status}${
          stage.reason_codes.length > 0
            ? ` [${stage.reason_codes.join(', ')}]`
            : ''
        }`,
    ),
    '',
    `Eligible candidates: ${trace.candidates.length}`,
    ...trace.candidates.map((candidate) => {
      const terms = candidate.score_terms
        .map(
          (term) => `${term.code}:${term.points >= 0 ? '+' : ''}${term.points}`,
        )
        .join(', ');
      return `- ${candidate.exercise_id}@${candidate.exercise_version}: score ${candidate.score}${
        candidate.selected ? ', selected' : ''
      }${terms ? ` [${terms}]` : ''}`;
    }),
    `Rejected candidates: ${trace.rejections.length}`,
    ...trace.rejections.map(
      (candidate) =>
        `- ${candidate.exercise_id}@${candidate.exercise_version}: ${candidate.reason_codes.join(', ')}`,
    ),
    ...(trace.outcome.type === 'routine'
      ? [
          '',
          'Selected routine',
          ...trace.outcome.items.map(
            (item) =>
              `- ${item.order + 1}. ${item.exercise_id}@${item.exercise_version} (${item.phase}): ${item.prescription.dose} x ${item.prescription.sets}, ${item.prescription.estimated_duration_seconds}s`,
          ),
        ]
      : []),
  ];

  return lines.join('\n');
}
