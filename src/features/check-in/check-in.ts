import {
  bodyRegionOptions,
  type BodyRegionSlug,
  type BodySide,
  type TrainingType,
} from '@/features/onboarding/profile-options';
import {
  checkInEquipmentIds,
  checkInModes,
  checkInTrainingTypes,
  environmentOptions,
  type CheckInEnvironment,
  type CheckInMode,
  type CheckInTrainingStatus,
} from '@/features/check-in/check-in-options';
import {
  evaluateCheckInSafety,
  type CheckInSafetyInput,
  type CheckInSafetyReasonCode,
  type CheckInSafetyResult,
  type CheckInSafetyRuleId,
  type CheckInSafetyState,
  type CheckInSafetyValidationIssueCode,
} from '@/features/safety/check-in-safety';

export interface CheckInRegionInput {
  readonly regionSlug: BodyRegionSlug;
  readonly side: BodySide;
  readonly stiffness: number | null;
  readonly soreness: number | null;
  readonly discomfort: number | null;
}

export interface CheckInTrainingInput {
  readonly type: TrainingType;
  readonly status: CheckInTrainingStatus;
  readonly stress: number | null;
}

export interface CheckInInput {
  readonly mode: CheckInMode;
  readonly availableMinutes: number;
  readonly readiness: number | null;
  readonly environment: CheckInEnvironment;
  readonly equipmentIds: readonly string[];
  readonly regions: readonly CheckInRegionInput[];
  readonly training: CheckInTrainingInput | null;
  readonly note: string | null;
}

export interface SubmitCheckInInput extends CheckInInput {
  readonly safety: CheckInSafetyInput;
}

export interface CheckIn extends CheckInInput {
  readonly id: string;
  readonly safety: CheckInSafetyInput | null;
  readonly safetyResult: CheckInSafetyState | null;
  readonly safetyRulesVersion: string | null;
  readonly safetyRuleIds: readonly CheckInSafetyRuleId[];
  readonly safetyReasonCodes: readonly CheckInSafetyReasonCode[];
  readonly observedAt: string;
  readonly localDate: string;
  readonly timeZone: string;
  readonly captureStatus: 'captured' | 'submitted';
  readonly createdAt: string;
}

export type CheckInValidationIssueCode =
  | 'check_in_profile_missing'
  | 'check_in_unknown_value'
  | 'check_in_duplicate_value'
  | 'check_in_body_side_incompatible'
  | 'check_in_rating_invalid'
  | 'check_in_duration_invalid'
  | 'check_in_readiness_invalid'
  | 'check_in_training_stress_invalid'
  | 'check_in_note_too_long'
  | CheckInSafetyValidationIssueCode;

export interface CheckInValidationIssue {
  readonly code: CheckInValidationIssueCode;
  readonly path: string;
}

export type CheckInValidationResult =
  | { readonly ok: true; readonly value: CheckInInput }
  | {
      readonly ok: false;
      readonly issues: readonly CheckInValidationIssue[];
    };

export type SubmitCheckInResult =
  | { readonly ok: true; readonly checkIn: CheckIn }
  | {
      readonly ok: false;
      readonly issues: readonly CheckInValidationIssue[];
    };

export type SubmitCheckInValidationResult =
  | {
      readonly ok: true;
      readonly value: SubmitCheckInInput;
      readonly safetyResult: CheckInSafetyResult;
    }
  | {
      readonly ok: false;
      readonly issues: readonly CheckInValidationIssue[];
    };

function isIntegerInRange(
  value: number | null,
  minimum: number,
  maximum: number,
): boolean {
  return (
    value === null ||
    (Number.isInteger(value) && value >= minimum && value <= maximum)
  );
}

export function validateCheckInInput(
  input: CheckInInput,
): CheckInValidationResult {
  const issues: CheckInValidationIssue[] = [];
  const modes = new Set<string>(checkInModes);
  const environments = new Set<string>(
    environmentOptions.map((option) => option.value),
  );
  const regions = new Map(
    bodyRegionOptions.map((option) => [option.slug, option]),
  );

  if (!modes.has(input.mode)) {
    issues.push({ code: 'check_in_unknown_value', path: '$.mode' });
  }
  if (!environments.has(input.environment)) {
    issues.push({ code: 'check_in_unknown_value', path: '$.environment' });
  }
  if (
    !Number.isInteger(input.availableMinutes) ||
    input.availableMinutes < 2 ||
    input.availableMinutes > 90
  ) {
    issues.push({
      code: 'check_in_duration_invalid',
      path: '$.availableMinutes',
    });
  }
  if (!isIntegerInRange(input.readiness, 1, 5)) {
    issues.push({
      code: 'check_in_readiness_invalid',
      path: '$.readiness',
    });
  }
  if ((input.note?.length ?? 0) > 1000) {
    issues.push({ code: 'check_in_note_too_long', path: '$.note' });
  }

  if (new Set(input.equipmentIds).size !== input.equipmentIds.length) {
    issues.push({
      code: 'check_in_duplicate_value',
      path: '$.equipmentIds',
    });
  }
  input.equipmentIds.forEach((equipmentId, index) => {
    if (!checkInEquipmentIds.has(equipmentId)) {
      issues.push({
        code: 'check_in_unknown_value',
        path: `$.equipmentIds[${index}]`,
      });
    }
  });

  const regionKeys = input.regions.map(
    (region) => `${region.regionSlug}:${region.side}`,
  );
  if (new Set(regionKeys).size !== regionKeys.length) {
    issues.push({
      code: 'check_in_duplicate_value',
      path: '$.regions',
    });
  }
  input.regions.forEach((selection, index) => {
    const region = regions.get(selection.regionSlug);
    if (region === undefined) {
      issues.push({
        code: 'check_in_unknown_value',
        path: `$.regions[${index}].regionSlug`,
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
        code: 'check_in_body_side_incompatible',
        path: `$.regions[${index}].side`,
      });
    }

    const ratings = [
      ['stiffness', selection.stiffness],
      ['soreness', selection.soreness],
      ['discomfort', selection.discomfort],
    ] as const;
    for (const [name, value] of ratings) {
      if (!isIntegerInRange(value, 0, 10)) {
        issues.push({
          code: 'check_in_rating_invalid',
          path: `$.regions[${index}].${name}`,
        });
      }
    }
  });

  if (input.training !== null) {
    if (!checkInTrainingTypes.has(input.training.type)) {
      issues.push({
        code: 'check_in_unknown_value',
        path: '$.training.type',
      });
    }
    if (!['planned', 'completed'].includes(input.training.status)) {
      issues.push({
        code: 'check_in_unknown_value',
        path: '$.training.status',
      });
    }
    if (!isIntegerInRange(input.training.stress, 1, 5)) {
      issues.push({
        code: 'check_in_training_stress_invalid',
        path: '$.training.stress',
      });
    }
  }

  return issues.length === 0
    ? { ok: true, value: input }
    : { ok: false, issues };
}

export function validateSubmitCheckInInput(
  input: SubmitCheckInInput,
): SubmitCheckInValidationResult {
  const checkInValidation = validateCheckInInput(input);
  const safetyEvaluation = evaluateCheckInSafety(input.safety);
  const issues: CheckInValidationIssue[] = [
    ...(checkInValidation.ok ? [] : checkInValidation.issues),
    ...(safetyEvaluation.ok ? [] : safetyEvaluation.issues),
  ];

  if (issues.length > 0 || !checkInValidation.ok || !safetyEvaluation.ok) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: { ...checkInValidation.value, safety: input.safety },
    safetyResult: safetyEvaluation.result,
  };
}

export function normalizeOptionalNote(value: string): string | null {
  return value.trim().length === 0 ? null : value;
}
