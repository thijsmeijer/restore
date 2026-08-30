export const checkInSafetyRulesVersion =
  'check_in_safety_engineering_2026_08_30';

export const checkInSafetySignalDefinitions = [
  {
    signal: 'sudden_severe_pain',
    label: 'Sudden severe pain',
    ruleId: 'block_sudden_severe_pain_v1',
    reasonCode: 'reported_sudden_severe_pain',
  },
  {
    signal: 'recent_major_trauma',
    label: 'Recent major trauma',
    ruleId: 'block_recent_major_trauma_v1',
    reasonCode: 'reported_recent_major_trauma',
  },
  {
    signal: 'new_numbness_or_tingling',
    label: 'New numbness or tingling',
    ruleId: 'block_new_numbness_or_tingling_v1',
    reasonCode: 'reported_new_numbness_or_tingling',
  },
  {
    signal: 'unexplained_weakness_or_loss_of_control',
    label: 'Unexplained weakness or loss of control',
    ruleId: 'block_unexplained_weakness_or_loss_of_control_v1',
    reasonCode: 'reported_unexplained_weakness_or_loss_of_control',
  },
  {
    signal: 'radiating_symptoms',
    label: 'Symptoms that spread or radiate',
    ruleId: 'block_radiating_symptoms_v1',
    reasonCode: 'reported_radiating_symptoms',
  },
  {
    signal: 'significant_swelling_or_visible_deformity',
    label: 'Significant swelling or visible change in shape',
    ruleId: 'block_significant_swelling_or_visible_deformity_v1',
    reasonCode: 'reported_significant_swelling_or_visible_deformity',
  },
  {
    signal: 'dizziness_fainting_chest_or_breathing_difficulty',
    label: 'Dizziness, fainting, chest symptoms, or breathing difficulty',
    ruleId: 'block_dizziness_fainting_chest_or_breathing_difficulty_v1',
    reasonCode: 'reported_dizziness_fainting_chest_or_breathing_difficulty',
  },
  {
    signal: 'rapidly_worsening_problem',
    label: 'A problem that is getting worse quickly',
    ruleId: 'block_rapidly_worsening_problem_v1',
    reasonCode: 'reported_rapidly_worsening_problem',
  },
] as const;

export type CheckInSafetySignal =
  (typeof checkInSafetySignalDefinitions)[number]['signal'];
export type CheckInSafetyRuleId = string;
export type CheckInSafetyReasonCode = string;
export type CheckInSafetyState = 'clear' | 'gentle_only' | 'blocked';

export interface CheckInSafetyInput {
  readonly reportedSignals: readonly CheckInSafetySignal[];
}

export interface CheckInSafetyResult {
  readonly state: CheckInSafetyState;
  readonly rulesVersion: string;
  readonly matchedRuleIds: readonly CheckInSafetyRuleId[];
  readonly reasonCodes: readonly CheckInSafetyReasonCode[];
}

export type CheckInSafetyValidationIssueCode =
  | 'check_in_safety_unknown_signal'
  | 'check_in_safety_duplicate_signal'
  | 'check_in_safety_unknown_rules_version';

export interface CheckInSafetyValidationIssue {
  readonly code: CheckInSafetyValidationIssueCode;
  readonly path: string;
}

export type CheckInSafetyEvaluation =
  | { readonly ok: true; readonly result: CheckInSafetyResult }
  | {
      readonly ok: false;
      readonly issues: readonly CheckInSafetyValidationIssue[];
    };

const knownSignals = new Set<string>(
  checkInSafetySignalDefinitions.map((definition) => definition.signal),
);

export function evaluateCheckInSafety(
  input: CheckInSafetyInput,
  rulesVersion: string = checkInSafetyRulesVersion,
): CheckInSafetyEvaluation {
  const issues: CheckInSafetyValidationIssue[] = [];
  const seenSignals = new Set<string>();

  if (rulesVersion !== checkInSafetyRulesVersion) {
    issues.push({
      code: 'check_in_safety_unknown_rules_version',
      path: '$.safetyRulesVersion',
    });
  }

  input.reportedSignals.forEach((signal, index) => {
    if (!knownSignals.has(signal)) {
      issues.push({
        code: 'check_in_safety_unknown_signal',
        path: `$.safety.reportedSignals[${index}]`,
      });
    }
    if (seenSignals.has(signal)) {
      issues.push({
        code: 'check_in_safety_duplicate_signal',
        path: '$.safety.reportedSignals',
      });
    }
    seenSignals.add(signal);
  });

  if (issues.length > 0) return { ok: false, issues };

  const matchedDefinitions = checkInSafetySignalDefinitions.filter(
    (definition) => seenSignals.has(definition.signal),
  );

  return {
    ok: true,
    result: {
      state: matchedDefinitions.length === 0 ? 'clear' : 'blocked',
      rulesVersion,
      matchedRuleIds: matchedDefinitions.map((definition) => definition.ruleId),
      reasonCodes: matchedDefinitions.map(
        (definition) => definition.reasonCode,
      ),
    },
  };
}

export function labelForSafetySignal(signal: CheckInSafetySignal): string {
  return (
    checkInSafetySignalDefinitions.find(
      (definition) => definition.signal === signal,
    )?.label ?? signal
  );
}
