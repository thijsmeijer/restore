import type { Exercise } from '@/content/schemas';
import type { GenerationTarget } from '@/generator/input-schema';

export function targetKey(target: GenerationTarget): string {
  return `${target.region_slug}:${target.side}`;
}

export function effectSideMatchesTarget(
  effectSide: Exercise['effects'][number]['side'],
  targetSide: GenerationTarget['side'],
): boolean {
  if (effectSide === 'central') return targetSide === 'central';
  if (effectSide === 'bilateral') return targetSide !== 'central';

  return effectSide === targetSide;
}

export function exerciseAddressesTarget(
  exercise: Exercise,
  target: GenerationTarget,
): boolean {
  if (
    target.side === 'central' &&
    exercise.prescription.side_mode !== 'central'
  ) {
    return false;
  }
  if (
    target.side === 'bilateral' &&
    exercise.prescription.side_mode !== 'bilateral_simultaneous' &&
    exercise.prescription.side_mode !== 'bilateral_sequential'
  ) {
    return false;
  }
  if (
    (target.side === 'left' || target.side === 'right') &&
    exercise.prescription.side_mode === 'central'
  ) {
    return false;
  }

  return exercise.effects.some(
    (effect) =>
      effect.region_slug === target.region_slug &&
      effectSideMatchesTarget(effect.side, target.side),
  );
}
