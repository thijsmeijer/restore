import type { RoutineTemplate } from '@/content/schemas';
import type { GenerationInput } from '@/generator/input-schema';
import {
  createPrescription,
  maximumSelectableDose,
  requiredVariant,
} from '@/generator/prescription';
import { exerciseAddressesTarget } from '@/generator/targeting';
import type {
  ExactPrescription,
  GenerationFailureCode,
  GenerationRules,
  ScoredCandidate,
  TargetPriority,
} from '@/generator/types';

export interface BuiltSelection {
  readonly candidate: ScoredCandidate;
  readonly phase_index: number;
  readonly prescription: ExactPrescription;
}

export type RoutineBuildResult =
  | {
      readonly ok: true;
      readonly selections: readonly BuiltSelection[];
      readonly estimated_duration_seconds: number;
      readonly duration_status: 'within_tolerance' | 'indivisible_difference';
    }
  | {
      readonly ok: false;
      readonly code: Extract<
        GenerationFailureCode,
        'duration_unfillable' | 'phase_unfillable'
      >;
    };

interface PhaseBudget {
  readonly minimum: number;
  readonly target: number;
  readonly maximum: number;
}

function phaseBudgets(
  template: RoutineTemplate,
  requestedSeconds: number,
): PhaseBudget[] {
  return template.phases.map((phase) => ({
    minimum: Math.ceil(
      (requestedSeconds * phase.minimum_share_basis_points) / 10_000,
    ),
    target: Math.round(
      (requestedSeconds * phase.target_share_basis_points) / 10_000,
    ),
    maximum: Math.floor(
      (requestedSeconds * phase.maximum_share_basis_points) / 10_000,
    ),
  }));
}

function selectionDuration(selections: readonly BuiltSelection[]): number {
  return selections.reduce(
    (total, selection) =>
      total + selection.prescription.estimated_duration_seconds,
    0,
  );
}

function movementPatternsFit(
  candidate: ScoredCandidate,
  selections: readonly BuiltSelection[],
  maximum: number,
): boolean {
  return candidate.exercise.movement_patterns.every((pattern) => {
    const count = selections.filter((selection) =>
      selection.candidate.exercise.movement_patterns.includes(pattern),
    ).length;
    return count < maximum;
  });
}

function phaseDuration(
  selections: readonly BuiltSelection[],
  phaseIndex: number,
): number {
  return selections
    .filter((selection) => selection.phase_index === phaseIndex)
    .reduce(
      (total, selection) =>
        total + selection.prescription.estimated_duration_seconds,
      0,
    );
}

function candidateSupportsPhase(
  candidate: ScoredCandidate,
  template: RoutineTemplate,
  phaseIndex: number,
): boolean {
  const phase = template.phases[phaseIndex];
  return phase !== undefined && candidate.exercise.phases.includes(phase.phase);
}

function canAdd(
  candidate: ScoredCandidate,
  phaseIndex: number,
  prescription: ExactPrescription,
  selections: readonly BuiltSelection[],
  template: RoutineTemplate,
  budgets: readonly PhaseBudget[],
  upperDuration: number,
  rules: GenerationRules,
): boolean {
  const budget = budgets[phaseIndex];
  return (
    budget !== undefined &&
    selections.length < rules.maximum_items &&
    !selections.some(
      (selection) => selection.candidate.exercise.id === candidate.exercise.id,
    ) &&
    candidateSupportsPhase(candidate, template, phaseIndex) &&
    movementPatternsFit(
      candidate,
      selections,
      rules.maximum_same_movement_pattern,
    ) &&
    phaseDuration(selections, phaseIndex) +
      prescription.estimated_duration_seconds <=
      budget.maximum &&
    selectionDuration(selections) + prescription.estimated_duration_seconds <=
      upperDuration
  );
}

function orderedSupportedPhases(
  candidate: ScoredCandidate,
  selections: readonly BuiltSelection[],
  template: RoutineTemplate,
  budgets: readonly PhaseBudget[],
): number[] {
  return template.phases
    .map((_, phaseIndex) => phaseIndex)
    .filter((phaseIndex) =>
      candidateSupportsPhase(candidate, template, phaseIndex),
    )
    .sort((left, right) => {
      const leftRemaining =
        (budgets[left]?.target ?? 0) - phaseDuration(selections, left);
      const rightRemaining =
        (budgets[right]?.target ?? 0) - phaseDuration(selections, right);
      return rightRemaining - leftRemaining || left - right;
    });
}

function addBestForPhase(
  phaseIndex: number,
  candidates: readonly ScoredCandidate[],
  selections: BuiltSelection[],
  input: GenerationInput,
  template: RoutineTemplate,
  budgets: readonly PhaseBudget[],
  upperDuration: number,
  rules: GenerationRules,
  requireTargetImprovement: boolean = false,
): boolean {
  const currentPhaseDuration = phaseDuration(selections, phaseIndex);
  for (const candidate of candidates) {
    const prescription = createPrescription(candidate, input, rules);
    if (
      requireTargetImprovement &&
      Math.abs(
        (budgets[phaseIndex]?.target ?? 0) -
          currentPhaseDuration -
          prescription.estimated_duration_seconds,
      ) >= Math.abs((budgets[phaseIndex]?.target ?? 0) - currentPhaseDuration)
    ) {
      continue;
    }
    if (
      canAdd(
        candidate,
        phaseIndex,
        prescription,
        selections,
        template,
        budgets,
        upperDuration,
        rules,
      )
    ) {
      selections.push({ candidate, phase_index: phaseIndex, prescription });
      return true;
    }
  }

  return false;
}

function addCandidateToBestPhase(
  candidate: ScoredCandidate,
  selections: BuiltSelection[],
  input: GenerationInput,
  template: RoutineTemplate,
  budgets: readonly PhaseBudget[],
  upperDuration: number,
  rules: GenerationRules,
): boolean {
  const prescription = createPrescription(candidate, input, rules);
  for (const phaseIndex of orderedSupportedPhases(
    candidate,
    selections,
    template,
    budgets,
  )) {
    if (
      canAdd(
        candidate,
        phaseIndex,
        prescription,
        selections,
        template,
        budgets,
        upperDuration,
        rules,
      )
    ) {
      selections.push({ candidate, phase_index: phaseIndex, prescription });
      return true;
    }
  }

  return false;
}

function extendTowardRequestedDuration(
  selections: BuiltSelection[],
  input: GenerationInput,
  budgets: readonly PhaseBudget[],
  requestedSeconds: number,
  upperDuration: number,
  rules: GenerationRules,
): void {
  const rankedIndices = selections
    .map((selection, index) => ({ selection, index }))
    .sort(
      (left, right) =>
        right.selection.candidate.score - left.selection.candidate.score ||
        left.selection.candidate.tie_break -
          right.selection.candidate.tie_break,
    )
    .map((entry) => entry.index);

  for (const index of rankedIndices) {
    const selection = selections[index];
    if (
      !selection ||
      selection.candidate.exercise.prescription.type === 'reassessment'
    ) {
      continue;
    }
    const maximumDose = maximumSelectableDose(selection.candidate);
    const currentDose = selection.prescription.dose;
    if (maximumDose <= currentDose) continue;

    const nextPrescription = createPrescription(
      selection.candidate,
      input,
      rules,
      currentDose + 1,
    );
    const secondsPerIncrement =
      nextPrescription.estimated_duration_seconds -
      selection.prescription.estimated_duration_seconds;
    if (secondsPerIncrement <= 0) continue;

    const totalAvailable = Math.min(
      upperDuration - selectionDuration(selections),
      Math.max(0, requestedSeconds - selectionDuration(selections)),
    );
    const phaseAvailable =
      (budgets[selection.phase_index]?.maximum ?? 0) -
      phaseDuration(selections, selection.phase_index);
    const increments = Math.min(
      maximumDose - currentDose,
      Math.floor(
        Math.min(totalAvailable, phaseAvailable) / secondsPerIncrement,
      ),
    );
    if (increments <= 0) continue;

    selections[index] = {
      ...selection,
      prescription: createPrescription(
        selection.candidate,
        input,
        rules,
        currentDose + increments,
      ),
    };
  }
}

function extendPhaseTowardMinimum(
  selections: BuiltSelection[],
  phaseIndex: number,
  input: GenerationInput,
  budget: PhaseBudget,
  upperDuration: number,
  rules: GenerationRules,
): void {
  const rankedIndices = selections
    .map((selection, index) => ({ selection, index }))
    .filter((entry) => entry.selection.phase_index === phaseIndex)
    .sort(
      (left, right) =>
        right.selection.candidate.score - left.selection.candidate.score ||
        left.selection.candidate.tie_break -
          right.selection.candidate.tie_break,
    )
    .map((entry) => entry.index);

  for (const index of rankedIndices) {
    const selection = selections[index];
    if (
      !selection ||
      selection.candidate.exercise.prescription.type === 'reassessment'
    ) {
      continue;
    }
    const maximumDose = maximumSelectableDose(selection.candidate);
    const currentDose = selection.prescription.dose;
    if (maximumDose <= currentDose) continue;

    const nextPrescription = createPrescription(
      selection.candidate,
      input,
      rules,
      currentDose + 1,
    );
    const secondsPerIncrement =
      nextPrescription.estimated_duration_seconds -
      selection.prescription.estimated_duration_seconds;
    if (secondsPerIncrement <= 0) continue;

    const availableSeconds = Math.min(
      Math.max(0, budget.minimum - phaseDuration(selections, phaseIndex)),
      Math.max(0, budget.maximum - phaseDuration(selections, phaseIndex)),
      Math.max(0, upperDuration - selectionDuration(selections)),
    );
    const increments = Math.min(
      maximumDose - currentDose,
      Math.floor(availableSeconds / secondsPerIncrement),
    );
    if (increments <= 0) continue;

    selections[index] = {
      ...selection,
      prescription: createPrescription(
        selection.candidate,
        input,
        rules,
        currentDose + increments,
      ),
    };
  }
}

function durationStatus(
  estimatedSeconds: number,
  requestedSeconds: number,
  lowerDuration: number,
  upperDuration: number,
  candidates: readonly ScoredCandidate[],
  input: GenerationInput,
  rules: GenerationRules,
): 'within_tolerance' | 'indivisible_difference' | null {
  if (estimatedSeconds >= lowerDuration && estimatedSeconds <= upperDuration) {
    return 'within_tolerance';
  }
  const shortestIndivisible = Math.min(
    ...candidates.map(
      (candidate) =>
        createPrescription(candidate, input, rules).estimated_duration_seconds,
    ),
  );
  if (
    Number.isFinite(shortestIndivisible) &&
    Math.abs(requestedSeconds - estimatedSeconds) <= shortestIndivisible
  ) {
    return 'indivisible_difference';
  }

  return null;
}

export function buildRoutineSelections(
  scoredCandidates: readonly ScoredCandidate[],
  input: GenerationInput,
  template: RoutineTemplate,
  targetPriorities: readonly TargetPriority[],
  rules: GenerationRules,
): RoutineBuildResult {
  const requestedSeconds = input.available_minutes * 60;
  const toleranceSeconds = Math.floor(
    (requestedSeconds * rules.duration_tolerance_basis_points) / 10_000,
  );
  const lowerDuration = requestedSeconds - toleranceSeconds;
  const upperDuration = requestedSeconds + toleranceSeconds;
  const budgets = phaseBudgets(template, requestedSeconds);
  const candidates = scoredCandidates.filter(
    (candidate) => requiredVariant(candidate) === null,
  );
  const selections: BuiltSelection[] = [];

  for (
    let phaseIndex = 0;
    phaseIndex < template.phases.length;
    phaseIndex += 1
  ) {
    const phase = template.phases[phaseIndex];
    const budget = budgets[phaseIndex];
    if (!phase || !budget || phase.requirement !== 'required') continue;

    while (phaseDuration(selections, phaseIndex) < budget.minimum) {
      const added = addBestForPhase(
        phaseIndex,
        candidates,
        selections,
        input,
        template,
        budgets,
        upperDuration,
        rules,
      );
      if (!added) {
        return { ok: false, code: 'phase_unfillable' };
      }
      extendPhaseTowardMinimum(
        selections,
        phaseIndex,
        input,
        budget,
        upperDuration,
        rules,
      );
    }
  }

  for (
    let targetIndex = 0;
    targetIndex < input.target_regions.length;
    targetIndex += 1
  ) {
    const priority = targetPriorities[targetIndex];
    const target = input.target_regions[targetIndex];
    if (!priority?.high_priority || !target) continue;
    if (
      selections.some((selection) =>
        exerciseAddressesTarget(selection.candidate.exercise, target),
      )
    ) {
      continue;
    }

    for (const candidate of candidates) {
      if (
        !exerciseAddressesTarget(candidate.exercise, target) ||
        selections.some(
          (selection) =>
            selection.candidate.exercise.id === candidate.exercise.id,
        )
      ) {
        continue;
      }
      if (
        addCandidateToBestPhase(
          candidate,
          selections,
          input,
          template,
          budgets,
          upperDuration,
          rules,
        )
      ) {
        break;
      }
    }
  }

  for (
    let phaseIndex = 0;
    phaseIndex < template.phases.length;
    phaseIndex += 1
  ) {
    const budget = budgets[phaseIndex];
    if (!budget) continue;
    while (phaseDuration(selections, phaseIndex) < budget.target) {
      if (
        !addBestForPhase(
          phaseIndex,
          candidates,
          selections,
          input,
          template,
          budgets,
          upperDuration,
          rules,
          true,
        )
      ) {
        break;
      }
    }
  }

  extendTowardRequestedDuration(
    selections,
    input,
    budgets,
    requestedSeconds,
    upperDuration,
    rules,
  );

  while (selectionDuration(selections) < lowerDuration) {
    const candidate = candidates.find((entry) =>
      orderedSupportedPhases(entry, selections, template, budgets).some(
        (phaseIndex) =>
          canAdd(
            entry,
            phaseIndex,
            createPrescription(entry, input, rules),
            selections,
            template,
            budgets,
            upperDuration,
            rules,
          ),
      ),
    );
    if (!candidate) break;
    addCandidateToBestPhase(
      candidate,
      selections,
      input,
      template,
      budgets,
      upperDuration,
      rules,
    );
    extendTowardRequestedDuration(
      selections,
      input,
      budgets,
      requestedSeconds,
      upperDuration,
      rules,
    );
  }

  const estimatedDurationSeconds = selectionDuration(selections);
  const status = durationStatus(
    estimatedDurationSeconds,
    requestedSeconds,
    lowerDuration,
    upperDuration,
    candidates,
    input,
    rules,
  );
  if (selections.length === 0 || status === null) {
    return { ok: false, code: 'duration_unfillable' };
  }

  return {
    ok: true,
    selections,
    estimated_duration_seconds: estimatedDurationSeconds,
    duration_status: status,
  };
}
