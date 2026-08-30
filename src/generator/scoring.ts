import type { Exercise } from '@/content/schemas';
import type { GenerationInput } from '@/generator/input-schema';
import {
  effectSideMatchesTarget,
  exerciseAddressesTarget,
  targetKey,
} from '@/generator/targeting';
import type {
  EligibleCandidate,
  GenerationRules,
  ScoredCandidate,
  ScoreTerm,
  ScoreTermCode,
  TargetPriority,
} from '@/generator/types';

function boundedPoints(
  value: number,
  lowerBound: number,
  upperBound: number,
): number {
  return Math.min(upperBound, Math.max(lowerBound, value));
}

function hashString(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function scoreTerm(
  code: ScoreTermCode,
  points: number,
  referenceId: string | null = null,
): ScoreTerm {
  return { code, points, reference_id: referenceId };
}

export function computeTargetPriorities(
  input: GenerationInput,
  rules: GenerationRules,
): TargetPriority[] {
  return input.target_regions.map((target, index) => ({
    region_slug: target.region_slug,
    side: target.side,
    priority_basis_points: Math.max(
      rules.minimum_target_priority_basis_points,
      10_000 - index * rules.target_priority_step_basis_points,
    ),
    high_priority: index < rules.high_priority_target_count,
  }));
}

function targetTerms(
  exercise: Exercise,
  input: GenerationInput,
  targetPriorities: readonly TargetPriority[],
  rules: GenerationRules,
): ScoreTerm[] {
  const terms: ScoreTerm[] = [];

  input.target_regions.forEach((target, index) => {
    if (!exerciseAddressesTarget(exercise, target)) return;

    const priority = targetPriorities[index];
    if (!priority) return;
    const matchingEffects = exercise.effects.filter(
      (effect) =>
        effect.region_slug === target.region_slug &&
        effectSideMatchesTarget(effect.side, target.side),
    );
    const strongestMagnitude = Math.max(
      ...matchingEffects.map((effect) => effect.magnitude),
    );
    const referenceId = targetKey(target);
    terms.push(
      scoreTerm(
        'target_match',
        Math.round(
          (rules.scoring.target_match *
            priority.priority_basis_points *
            strongestMagnitude) /
            30_000,
        ),
        referenceId,
      ),
    );
    if (matchingEffects.some((effect) => effect.primary)) {
      terms.push(
        scoreTerm(
          'primary_effect',
          Math.round(
            (rules.scoring.primary_effect_bonus *
              priority.priority_basis_points) /
              10_000,
          ),
          referenceId,
        ),
      );
    }
  });

  return terms;
}

function contextTerms(
  exercise: Exercise,
  input: GenerationInput,
  rules: GenerationRules,
): ScoreTerm[] {
  const terms: ScoreTerm[] = [];

  if (
    input.intent !== null &&
    exercise.effects.some((effect) => effect.effect === input.intent)
  ) {
    terms.push(
      scoreTerm('intent_match', rules.scoring.intent_match, input.intent),
    );
  }

  input.profile_goal_slugs.forEach((goalSlug, index) => {
    const mapping = rules.goal_effect_mappings.find(
      (entry) => entry.goal_slug === goalSlug,
    );
    if (
      !mapping ||
      !exercise.effects.some((effect) =>
        mapping.effects.includes(effect.effect),
      )
    ) {
      return;
    }
    const priorityBasisPoints = Math.max(
      rules.minimum_profile_goal_priority_basis_points,
      10_000 - index * rules.profile_goal_priority_step_basis_points,
    );
    terms.push(
      scoreTerm(
        'profile_goal_match',
        Math.round(
          (rules.scoring.profile_goal_match * priorityBasisPoints) / 10_000,
        ),
        goalSlug,
      ),
    );
  });

  const trainingEffect =
    input.training_context?.status === 'planned'
      ? 'prepare_for_load'
      : input.training_context?.status === 'completed'
        ? 'recover_after_load'
        : null;
  if (
    trainingEffect !== null &&
    exercise.effects.some((effect) => effect.effect === trainingEffect)
  ) {
    terms.push(
      scoreTerm(
        'training_context_match',
        rules.scoring.training_context_match,
        input.training_context?.training_type ?? null,
      ),
    );
  }

  return terms;
}

function historyTerms(
  exercise: Exercise,
  input: GenerationInput,
  rules: GenerationRules,
): ScoreTerm[] {
  const preference = input.preferences.find(
    (entry) => entry.exercise_id === exercise.id,
  );
  const aggregate = input.response_aggregates.find(
    (entry) => entry.exercise_id === exercise.id,
  );
  const terms: ScoreTerm[] = [];

  if (preference?.favorite) {
    terms.push(scoreTerm('favorite', rules.scoring.favorite, exercise.id));
  }
  if (aggregate) {
    const helpful = Math.min(
      aggregate.helpful_count * rules.scoring.helpful_response_each,
      rules.scoring.helpful_response_cap,
    );
    const uncomfortable = Math.max(
      aggregate.uncomfortable_count * rules.scoring.uncomfortable_response_each,
      -rules.scoring.uncomfortable_response_cap,
    );
    const skipped = Math.max(
      aggregate.preference_skip_count * rules.scoring.preference_skip_each,
      -rules.scoring.preference_skip_cap,
    );
    const replaced = Math.max(
      aggregate.preference_replacement_count *
        rules.scoring.preference_replacement_each,
      -rules.scoring.preference_replacement_cap,
    );
    if (helpful !== 0)
      terms.push(scoreTerm('helpful_response', helpful, exercise.id));
    if (uncomfortable !== 0) {
      terms.push(
        scoreTerm('uncomfortable_response', uncomfortable, exercise.id),
      );
    }
    if (skipped !== 0)
      terms.push(scoreTerm('preference_skip', skipped, exercise.id));
    if (replaced !== 0) {
      terms.push(scoreTerm('preference_replacement', replaced, exercise.id));
    }
  }

  const historyTotal = terms.reduce((total, term) => total + term.points, 0);
  const cappedHistoryTotal = boundedPoints(
    historyTotal,
    -rules.scoring.history_combined_cap,
    rules.scoring.history_combined_cap,
  );
  if (historyTotal !== cappedHistoryTotal) {
    terms.push(
      scoreTerm(
        'history_cap_adjustment',
        cappedHistoryTotal - historyTotal,
        exercise.id,
      ),
    );
  }

  if (input.recent_exercise_ids.includes(exercise.id)) {
    terms.push(
      scoreTerm(
        'recent_exposure',
        rules.scoring.recent_exposure_penalty,
        exercise.id,
      ),
    );
  }

  return terms;
}

export function scoreCandidates(
  candidates: readonly EligibleCandidate[],
  input: GenerationInput,
  targetPriorities: readonly TargetPriority[],
  rules: GenerationRules,
): ScoredCandidate[] {
  return candidates
    .map((candidate): ScoredCandidate => {
      const scoreTerms = [
        ...targetTerms(candidate.exercise, input, targetPriorities, rules),
        ...contextTerms(candidate.exercise, input, rules),
        ...historyTerms(candidate.exercise, input, rules),
      ];

      return {
        ...candidate,
        score: scoreTerms.reduce((total, term) => total + term.points, 0),
        score_terms: scoreTerms,
        tie_break: hashString(
          `${input.seed}:${candidate.exercise.id}:${candidate.exercise.version}`,
        ),
        matched_target_keys: input.target_regions
          .filter((target) =>
            exerciseAddressesTarget(candidate.exercise, target),
          )
          .map(targetKey),
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.tie_break - right.tie_break ||
        left.exercise.id.localeCompare(right.exercise.id) ||
        left.exercise.version - right.exercise.version,
    );
}
