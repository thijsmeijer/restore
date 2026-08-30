import type { Exercise, RoutineTemplate } from '@/content/schemas';
import type {
  GenerationInput,
  GenerationPreference,
  GenerationTarget,
} from '@/generator/input-schema';
import { estimateMinimumExerciseSeconds } from '@/generator/duration';
import type {
  CandidateRejection,
  CandidateRejectionCode,
  EligibleCandidate,
  GenerationRules,
  RejectedCandidate,
} from '@/generator/types';

const intensityRank = {
  very_gentle: 0,
  gentle: 1,
  moderate: 2,
} as const;

const spaceRank = {
  minimal: 0,
  small: 1,
  medium: 2,
  large: 3,
} as const;

const rejectionOrder: readonly CandidateRejectionCode[] = [
  'content_not_clinically_reviewed',
  'hard_contraindication',
  'user_avoided',
  'mode_not_allowed',
  'environment_not_allowed',
  'equipment_missing',
  'equipment_unstable',
  'space_insufficient',
  'side_incompatible',
  'intensity_exceeds_template',
  'duration_exceeds_available',
];

export interface CandidateFilterResult {
  readonly eligible: readonly EligibleCandidate[];
  readonly rejected: readonly RejectedCandidate[];
}

function rejection(
  code: CandidateRejectionCode,
  referenceId: string | null = null,
): CandidateRejection {
  return { code, reference_id: referenceId };
}

function activeAvoidPreference(
  preference: GenerationPreference | undefined,
  generatedAt: string,
): boolean {
  if (!preference || preference.avoid_state === 'none') return false;
  if (preference.avoid_state === 'permanent') return true;

  return (
    preference.avoid_until !== null &&
    Date.parse(generatedAt) < Date.parse(preference.avoid_until)
  );
}

function equipmentRejections(
  exercise: Exercise,
  input: GenerationInput,
): CandidateRejection[] {
  const available = new Set(input.available_equipment);
  const unstable = new Set(input.unstable_equipment);
  const reasons: CandidateRejection[] = [];

  for (const equipment of exercise.requirements.equipment.all_of) {
    if (!available.has(equipment)) {
      reasons.push(rejection('equipment_missing', equipment));
    } else if (unstable.has(equipment)) {
      reasons.push(rejection('equipment_unstable', equipment));
    }
  }

  exercise.requirements.equipment.any_of.forEach((alternatives, index) => {
    if (
      alternatives.some((item) => available.has(item) && !unstable.has(item))
    ) {
      return;
    }

    const availableButUnstable = alternatives.find(
      (item) => available.has(item) && unstable.has(item),
    );
    reasons.push(
      availableButUnstable
        ? rejection('equipment_unstable', availableButUnstable)
        : rejection('equipment_missing', `any_of_${index + 1}`),
    );
  });

  return reasons;
}

function effectSideMatchesTarget(
  effectSide: Exercise['effects'][number]['side'],
  targetSide: GenerationTarget['side'],
): boolean {
  if (effectSide === 'central') return targetSide === 'central';
  if (effectSide === 'bilateral') return targetSide !== 'central';

  return effectSide === targetSide;
}

function sideIncompatibilityReference(
  exercise: Exercise,
  targets: GenerationInput['target_regions'],
): string | null {
  const matchingRegionTargets = targets.filter((target) =>
    exercise.effects.some(
      (effect) => effect.region_slug === target.region_slug,
    ),
  );
  if (matchingRegionTargets.length === 0) return null;

  const hasCompatibleTarget = matchingRegionTargets.some((target) =>
    exercise.effects.some(
      (effect) =>
        effect.region_slug === target.region_slug &&
        effectSideMatchesTarget(effect.side, target.side),
    ),
  );
  if (hasCompatibleTarget) return null;

  const firstTarget = matchingRegionTargets[0];
  return firstTarget ? `${firstTarget.region_slug}:${firstTarget.side}` : null;
}

function targetSideMatches(
  target: GenerationTarget,
  ruleSide: 'any' | 'central' | 'left' | 'right' | 'bilateral',
): boolean {
  if (ruleSide === 'any') return true;
  if (ruleSide === 'central') return target.side === 'central';
  if (ruleSide === 'bilateral') return target.side === 'bilateral';

  return target.side === ruleSide || target.side === 'bilateral';
}

function targetMatchesContraindication(
  target: GenerationTarget,
  rule: Exercise['contraindications'][number],
): boolean {
  const { match } = rule;

  if (match.region_slug !== null && target.region_slug !== match.region_slug) {
    return false;
  }
  if (!targetSideMatches(target, match.side)) return false;
  if (
    match.rating_threshold !== null &&
    (target.maximum_rating === null ||
      target.maximum_rating < match.rating_threshold)
  ) {
    return false;
  }
  if (
    match.symptom_qualities.length > 0 &&
    !match.symptom_qualities.some((quality) =>
      target.symptom_qualities.includes(quality),
    )
  ) {
    return false;
  }

  return true;
}

function contraindicationMatches(
  rule: Exercise['contraindications'][number],
  input: GenerationInput,
): boolean {
  const { match } = rule;
  if (input.safety_state === 'blocked') return false;

  if (!match.allowed_safety_states.includes(input.safety_state)) {
    return false;
  }
  if (
    match.recent_trauma !== null &&
    match.recent_trauma !== input.recent_major_trauma
  ) {
    return false;
  }
  if (
    match.demand_flags.length > 0 &&
    !match.demand_flags.some((flag) =>
      input.restricted_demand_flags.includes(flag),
    )
  ) {
    return false;
  }

  const needsTarget =
    match.region_slug !== null ||
    match.side !== 'any' ||
    match.rating_threshold !== null ||
    match.symptom_qualities.length > 0;

  return (
    !needsTarget ||
    input.target_regions.some((target) =>
      targetMatchesContraindication(target, rule),
    )
  );
}

function hasExactClinicalReview(exercise: Exercise): boolean {
  return (
    exercise.status === 'clinical_reviewed' &&
    exercise.review.engineering?.reviewed_version === exercise.version &&
    exercise.review.clinical?.reviewed_version === exercise.version
  );
}

function uniqueRejections(
  reasons: readonly CandidateRejection[],
): CandidateRejection[] {
  const seen = new Set<string>();

  return [...reasons]
    .sort(
      (left, right) =>
        rejectionOrder.indexOf(left.code) - rejectionOrder.indexOf(right.code),
    )
    .filter((reason) => {
      const identity = `${reason.code}:${reason.reference_id ?? ''}`;
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    });
}

export function filterEligibleCandidates(
  exercises: readonly Exercise[],
  input: GenerationInput,
  template: RoutineTemplate,
  rules: GenerationRules,
): CandidateFilterResult {
  const preferences = new Map(
    input.preferences.map((preference) => [preference.exercise_id, preference]),
  );
  const availableSeconds = input.available_minutes * 60;
  const eligible: EligibleCandidate[] = [];
  const rejected: RejectedCandidate[] = [];

  for (const exercise of exercises) {
    const reasons: CandidateRejection[] = [];
    const matchingContraindications = exercise.contraindications.filter(
      (rule) => contraindicationMatches(rule, input),
    );

    if (!hasExactClinicalReview(exercise)) {
      reasons.push(rejection('content_not_clinically_reviewed'));
    }
    for (const rule of matchingContraindications) {
      if (rule.severity === 'hard_exclusion') {
        reasons.push(rejection('hard_contraindication', rule.rule_id));
      }
    }
    if (
      activeAvoidPreference(preferences.get(exercise.id), input.generated_at)
    ) {
      reasons.push(rejection('user_avoided', exercise.id));
    }
    if (!exercise.allowed_modes.includes(input.mode)) {
      reasons.push(rejection('mode_not_allowed', input.mode));
    }
    if (!exercise.requirements.environments.includes(input.environment)) {
      reasons.push(rejection('environment_not_allowed', input.environment));
    }
    reasons.push(...equipmentRejections(exercise, input));
    if (
      spaceRank[exercise.requirements.space] > spaceRank[input.available_space]
    ) {
      reasons.push(
        rejection('space_insufficient', exercise.requirements.space),
      );
    }
    const incompatibleTarget = sideIncompatibilityReference(
      exercise,
      input.target_regions,
    );
    if (incompatibleTarget !== null) {
      reasons.push(rejection('side_incompatible', incompatibleTarget));
    }
    if (
      intensityRank[exercise.intensity] >
        intensityRank[template.intensity_ceiling] ||
      (input.safety_state === 'gentle_only' &&
        exercise.intensity !== 'very_gentle')
    ) {
      reasons.push(rejection('intensity_exceeds_template', exercise.intensity));
    }

    const minimumDurationSeconds = estimateMinimumExerciseSeconds(
      exercise,
      rules,
    );
    if (minimumDurationSeconds > availableSeconds) {
      reasons.push(
        rejection('duration_exceeds_available', String(minimumDurationSeconds)),
      );
    }

    const orderedReasons = uniqueRejections(reasons);
    if (orderedReasons.length > 0) {
      rejected.push({
        exercise_id: exercise.id,
        exercise_version: exercise.version,
        reasons: orderedReasons,
      });
      continue;
    }

    eligible.push({
      exercise,
      minimum_duration_seconds: minimumDurationSeconds,
      caution_rule_ids: matchingContraindications
        .filter((rule) => rule.severity === 'caution')
        .map((rule) => rule.rule_id),
    });
  }

  return { eligible, rejected };
}
