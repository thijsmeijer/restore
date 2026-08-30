import {
  bodyRegionOptions,
  equipmentOptions,
  goalOptions,
  trainingTypeOptions,
  type BodyRegionSlug,
  type BodySide,
  type GoalSlug,
  type TrainingType,
} from '@/features/onboarding/profile-options';

export interface PreferredDurations {
  readonly quick: number | null;
  readonly normal: number | null;
  readonly deep: number | null;
}

export interface BodyBaselineSelection {
  readonly regionSlug: BodyRegionSlug;
  readonly side: BodySide;
}

export interface OnboardingProfileInput {
  readonly goalSlugs: readonly GoalSlug[];
  readonly bodyBaseline: readonly BodyBaselineSelection[];
  readonly equipmentIds: readonly string[];
  readonly trainingTypes: readonly TrainingType[];
  readonly preferredDurations: PreferredDurations;
  readonly safetyAcknowledged: boolean;
}

export interface UserProfile extends Omit<
  OnboardingProfileInput,
  'safetyAcknowledged'
> {
  readonly id: string;
  readonly units: 'metric' | 'imperial' | null;
  readonly coachingPreference:
    'silent' | 'minimal' | 'normal' | 'detailed' | null;
  readonly onboardingCompletedAt: string;
  readonly safetyRulesVersion: string;
  readonly safetyAcknowledgedAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type ProfileValidationIssueCode =
  | 'profile_safety_acknowledgement_required'
  | 'profile_unknown_value'
  | 'profile_duplicate_value'
  | 'profile_body_side_incompatible'
  | 'profile_duration_invalid';

export interface ProfileValidationIssue {
  readonly code: ProfileValidationIssueCode;
  readonly path: string;
}

export type ProfileValidationResult =
  | { readonly ok: true; readonly value: OnboardingProfileInput }
  | { readonly ok: false; readonly issues: readonly ProfileValidationIssue[] };

export type SaveProfileResult =
  | { readonly ok: true; readonly profile: UserProfile }
  | { readonly ok: false; readonly issues: readonly ProfileValidationIssue[] };

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function validDuration(value: number | null): boolean {
  return (
    value === null || (Number.isInteger(value) && value >= 2 && value <= 90)
  );
}

export function validateProfileInput(
  input: OnboardingProfileInput,
): ProfileValidationResult {
  const issues: ProfileValidationIssue[] = [];
  const goalSlugs = new Set<string>(goalOptions.map((option) => option.value));
  const equipmentIds = new Set<string>(
    equipmentOptions.map((option) => option.id),
  );
  const trainingTypes = new Set<string>(
    trainingTypeOptions.map((option) => option.value),
  );
  const regions = new Map(
    bodyRegionOptions.map((option) => [option.slug, option]),
  );

  if (!input.safetyAcknowledged) {
    issues.push({
      code: 'profile_safety_acknowledgement_required',
      path: '$.safetyAcknowledged',
    });
  }

  const orderedCollections = [
    { values: input.goalSlugs, path: '$.goalSlugs' },
    { values: input.equipmentIds, path: '$.equipmentIds' },
    { values: input.trainingTypes, path: '$.trainingTypes' },
    {
      values: input.bodyBaseline.map((selection) => selection.regionSlug),
      path: '$.bodyBaseline',
    },
  ] as const;
  for (const collection of orderedCollections) {
    if (hasDuplicates(collection.values)) {
      issues.push({ code: 'profile_duplicate_value', path: collection.path });
    }
  }

  input.goalSlugs.forEach((value, index) => {
    if (!goalSlugs.has(value)) {
      issues.push({
        code: 'profile_unknown_value',
        path: `$.goalSlugs[${index}]`,
      });
    }
  });
  input.equipmentIds.forEach((value, index) => {
    if (!equipmentIds.has(value)) {
      issues.push({
        code: 'profile_unknown_value',
        path: `$.equipmentIds[${index}]`,
      });
    }
  });
  input.trainingTypes.forEach((value, index) => {
    if (!trainingTypes.has(value)) {
      issues.push({
        code: 'profile_unknown_value',
        path: `$.trainingTypes[${index}]`,
      });
    }
  });
  input.bodyBaseline.forEach((selection, index) => {
    const region = regions.get(selection.regionSlug);
    if (region === undefined) {
      issues.push({
        code: 'profile_unknown_value',
        path: `$.bodyBaseline[${index}].regionSlug`,
      });
      return;
    }

    const validSide =
      region.laterality === 'central'
        ? selection.side === 'central'
        : region.laterality === 'paired'
          ? selection.side !== 'central'
          : true;
    if (!validSide) {
      issues.push({
        code: 'profile_body_side_incompatible',
        path: `$.bodyBaseline[${index}].side`,
      });
    }
  });

  const { quick, normal, deep } = input.preferredDurations;
  if (
    !validDuration(quick) ||
    !validDuration(normal) ||
    !validDuration(deep) ||
    (quick !== null && normal !== null && quick > normal) ||
    (normal !== null && deep !== null && normal > deep)
  ) {
    issues.push({
      code: 'profile_duration_invalid',
      path: '$.preferredDurations',
    });
  }

  return issues.length === 0
    ? { ok: true, value: input }
    : { ok: false, issues };
}
