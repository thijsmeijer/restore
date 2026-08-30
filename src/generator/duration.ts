import type { Exercise } from '@/content/schemas';
import type { GenerationRules } from '@/generator/types';

function prescriptionUnitSeconds(
  exercise: Exercise,
  rules: GenerationRules,
): number {
  switch (exercise.prescription.type) {
    case 'repetitions':
      return rules.seconds_per_repetition;
    case 'breathing_cycles':
      return rules.seconds_per_breathing_cycle;
    case 'reassessment':
      return rules.seconds_per_reassessment;
    case 'timed_hold':
    case 'timed_movement':
      return 1;
  }
}

export function estimateMinimumExerciseSeconds(
  exercise: Exercise,
  rules: GenerationRules,
): number {
  const sideMultiplier =
    exercise.prescription.side_mode === 'bilateral_sequential' ? 2 : 1;
  const movementSeconds =
    exercise.prescription.type === 'reassessment'
      ? rules.seconds_per_reassessment
      : exercise.prescription.minimum *
        prescriptionUnitSeconds(exercise, rules) *
        sideMultiplier;
  const setSeconds = movementSeconds * exercise.prescription.sets;
  const restSeconds =
    exercise.prescription.rest_seconds *
    Math.max(0, exercise.prescription.sets - 1);

  return Math.ceil(setSeconds + restSeconds + rules.transition_seconds);
}
