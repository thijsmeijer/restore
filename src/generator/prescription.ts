import type { Exercise } from '@/content/schemas';
import { estimateExerciseSeconds } from '@/generator/duration';
import { exerciseAddressesTarget } from '@/generator/targeting';
import type { GenerationInput } from '@/generator/input-schema';
import type {
  ExactPrescription,
  GenerationRules,
  ScoredCandidate,
} from '@/generator/types';

function matchingCautionRules(candidate: ScoredCandidate) {
  const cautionIds = new Set(candidate.caution_rule_ids);
  return candidate.exercise.contraindications.filter(
    (rule) => rule.severity === 'caution' && cautionIds.has(rule.rule_id),
  );
}

export function requiredVariant(
  candidate: ScoredCandidate,
): { readonly exercise_id: string; readonly version: number } | null {
  const variant = matchingCautionRules(candidate)
    .map((rule) => rule.caution_effect)
    .find((effect) => effect?.type === 'reviewed_variant');

  return variant?.type === 'reviewed_variant'
    ? { exercise_id: variant.exercise_id, version: variant.version }
    : null;
}

export function prescriptionLimits(candidate: ScoredCandidate): {
  readonly maximumDose: number;
  readonly maximumSets: number;
} {
  let maximumDose = candidate.exercise.prescription.maximum;
  let maximumSets = candidate.exercise.dosage_limits.max_sets_per_routine;

  for (const rule of matchingCautionRules(candidate)) {
    if (rule.caution_effect?.type !== 'dose_cap') continue;
    maximumDose = Math.min(maximumDose, rule.caution_effect.maximum);
    maximumSets = Math.min(maximumSets, rule.caution_effect.max_sets);
  }

  return { maximumDose, maximumSets };
}

function sideSequence(
  exercise: Exercise,
  input: GenerationInput,
): ExactPrescription['side_sequence'] {
  switch (exercise.prescription.side_mode) {
    case 'central':
      return ['central'];
    case 'bilateral_simultaneous':
      return ['bilateral'];
    case 'bilateral_sequential':
      return ['left', 'right'];
    case 'unilateral': {
      const target = input.target_regions.find(
        (entry) =>
          (entry.side === 'left' || entry.side === 'right') &&
          exerciseAddressesTarget(exercise, entry),
      );
      return [target?.side === 'right' ? 'right' : 'left'];
    }
  }
}

export function createPrescription(
  candidate: ScoredCandidate,
  input: GenerationInput,
  rules: GenerationRules,
  requestedDose: number = candidate.exercise.prescription.minimum,
): ExactPrescription {
  const { exercise } = candidate;
  const caps = prescriptionLimits(candidate);
  const sets = Math.min(exercise.prescription.sets, caps.maximumSets);
  const dose = Math.min(
    Math.max(requestedDose, exercise.prescription.minimum),
    caps.maximumDose,
  );

  return {
    type: exercise.prescription.type,
    dose,
    sets,
    tempo: exercise.prescription.tempo,
    side_mode: exercise.prescription.side_mode,
    side_sequence: sideSequence(exercise, input),
    rest_seconds: exercise.prescription.rest_seconds,
    transition_seconds: rules.transition_seconds,
    estimated_duration_seconds: estimateExerciseSeconds(
      exercise,
      rules,
      dose,
      sets,
    ),
  };
}

export function maximumSelectableDose(candidate: ScoredCandidate): number {
  const caps = prescriptionLimits(candidate);
  const contentMaximum = candidate.exercise.dosage_limits.extendable
    ? candidate.exercise.prescription.maximum
    : candidate.exercise.prescription.default;

  return Math.min(contentMaximum, caps.maximumDose);
}

export function warningKeys(candidate: ScoredCandidate): string[] {
  return matchingCautionRules(candidate).flatMap((rule) =>
    rule.caution_effect?.type === 'user_warning'
      ? [rule.caution_effect.warning_key]
      : [],
  );
}
