import type { GenerationInput } from '@/generator/input-schema';
import { createGenerationTrace, type GenerationTrace } from '@/generator/trace';
import type {
  GenerationCatalog,
  GenerationFailureCode,
  GenerationRules,
} from '@/generator/types';

export type GenerationScenarioExpectation =
  | { readonly type: 'safe_result' }
  | { readonly type: 'routine' }
  | {
      readonly type: 'failure';
      readonly code: GenerationFailureCode;
    };

export interface GenerationScenario {
  readonly id: string;
  readonly input: GenerationInput;
  readonly expectation: GenerationScenarioExpectation;
}

export interface GenerationScenarioResult {
  readonly scenario_id: string;
  readonly passed: boolean;
  readonly actual: 'routine' | 'failure' | 'simulator_error';
  readonly result_code: GenerationFailureCode | 'routine' | 'simulator_error';
  readonly trace: GenerationTrace | null;
}

export type GenerationScenarioSuiteIssueCode =
  | 'duplicate_scenario_id'
  | 'empty_scenario_suite'
  | 'invalid_scenario_id'
  | 'scenario_limit_exceeded'
  | 'scenario_expectation_failed'
  | 'simulator_error';

export interface GenerationScenarioSuiteReport {
  readonly schema_version: 1;
  readonly valid: boolean;
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly issue_codes: readonly GenerationScenarioSuiteIssueCode[];
  readonly coverage: {
    readonly duration_case_count: number;
    readonly mode_case_count: number;
    readonly target_case_count: number;
    readonly equipment_context_count: number;
    readonly safety_state_count: number;
  };
  readonly results: readonly GenerationScenarioResult[];
}

export interface GenerationScenarioMatrixOptions {
  readonly base_input: GenerationInput;
  readonly durations: readonly number[];
  readonly modes: readonly string[];
  readonly target_cases: readonly GenerationInput['target_regions'][];
  readonly equipment_contexts: readonly {
    readonly available_equipment: readonly string[];
    readonly unstable_equipment: readonly string[];
    readonly environment: GenerationInput['environment'];
    readonly available_space: GenerationInput['available_space'];
  }[];
  readonly safety_states: readonly GenerationInput['safety_state'][];
  readonly expectation: GenerationScenarioExpectation;
}

const validScenarioId = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const maximumScenarioCount = 1_000;

function uniqueCount(values: readonly string[]): number {
  return new Set(values).size;
}

function expectationPasses(
  expectation: GenerationScenarioExpectation,
  trace: GenerationTrace,
): boolean {
  if (expectation.type === 'safe_result') return true;
  if (expectation.type === 'routine') return trace.outcome.type === 'routine';

  return (
    trace.outcome.type === 'failure' && trace.outcome.code === expectation.code
  );
}

function coverageFor(
  scenarios: readonly GenerationScenario[],
): GenerationScenarioSuiteReport['coverage'] {
  return {
    duration_case_count: uniqueCount(
      scenarios.map((scenario) => String(scenario.input.available_minutes)),
    ),
    mode_case_count: uniqueCount(
      scenarios.map((scenario) => scenario.input.mode),
    ),
    target_case_count: uniqueCount(
      scenarios.map((scenario) =>
        scenario.input.target_regions
          .map((target) => `${target.region_slug}:${target.side}`)
          .join('|'),
      ),
    ),
    equipment_context_count: uniqueCount(
      scenarios.map((scenario) =>
        [
          scenario.input.environment,
          scenario.input.available_space,
          scenario.input.available_equipment.join(','),
          scenario.input.unstable_equipment.join(','),
        ].join('|'),
      ),
    ),
    safety_state_count: uniqueCount(
      scenarios.map((scenario) => scenario.input.safety_state),
    ),
  };
}

export function runGenerationScenarioSuite(
  scenarios: readonly GenerationScenario[],
  catalog: GenerationCatalog,
  rules: GenerationRules,
): GenerationScenarioSuiteReport {
  const issueCodes = new Set<GenerationScenarioSuiteIssueCode>();
  if (scenarios.length === 0) issueCodes.add('empty_scenario_suite');
  if (scenarios.length > maximumScenarioCount) {
    return {
      schema_version: 1,
      valid: false,
      total: scenarios.length,
      passed: 0,
      failed: scenarios.length,
      issue_codes: ['scenario_limit_exceeded'],
      coverage: coverageFor([]),
      results: [],
    };
  }
  const normalizedIds = scenarios.map((scenario, index) =>
    scenario.id.length <= 64 && validScenarioId.test(scenario.id)
      ? scenario.id
      : `scenario_${index + 1}`,
  );
  const idCounts = new Map<string, number>();
  normalizedIds.forEach((id) => idCounts.set(id, (idCounts.get(id) ?? 0) + 1));
  if (normalizedIds.some((id) => (idCounts.get(id) ?? 0) > 1)) {
    issueCodes.add('duplicate_scenario_id');
  }
  const results = scenarios.map((scenario, index): GenerationScenarioResult => {
    const scenarioIdIsValid =
      scenario.id.length <= 64 && validScenarioId.test(scenario.id);
    const safeScenarioId = normalizedIds[index] ?? `scenario_${index + 1}`;
    if (!scenarioIdIsValid) issueCodes.add('invalid_scenario_id');

    try {
      const trace = createGenerationTrace(scenario.input, catalog, rules);
      const passed =
        scenarioIdIsValid &&
        idCounts.get(safeScenarioId) === 1 &&
        expectationPasses(scenario.expectation, trace);
      if (!passed) issueCodes.add('scenario_expectation_failed');

      return {
        scenario_id: safeScenarioId,
        passed,
        actual: trace.outcome.type,
        result_code:
          trace.outcome.type === 'routine' ? 'routine' : trace.outcome.code,
        trace,
      };
    } catch {
      issueCodes.add('simulator_error');
      return {
        scenario_id: safeScenarioId,
        passed: false,
        actual: 'simulator_error',
        result_code: 'simulator_error',
        trace: null,
      };
    }
  });
  const passed = results.filter((result) => result.passed).length;

  return {
    schema_version: 1,
    valid: issueCodes.size === 0 && passed === results.length,
    total: results.length,
    passed,
    failed: results.length - passed,
    issue_codes: [...issueCodes].sort(),
    coverage: coverageFor(scenarios),
    results,
  };
}

export function buildGenerationScenarioMatrix(
  options: GenerationScenarioMatrixOptions,
): GenerationScenario[] {
  const scenarios: GenerationScenario[] = [
    {
      id: 'baseline',
      input: options.base_input,
      expectation: options.expectation,
    },
  ];
  const add = (id: string, input: GenerationInput): void => {
    scenarios.push({ id, input, expectation: options.expectation });
  };

  options.durations.forEach((availableMinutes, index) =>
    add(`duration_${index + 1}`, {
      ...options.base_input,
      available_minutes: availableMinutes,
    }),
  );
  options.modes.forEach((mode, index) =>
    add(`mode_${index + 1}`, { ...options.base_input, mode }),
  );
  options.target_cases.forEach((targetRegions, index) =>
    add(`target_${index + 1}`, {
      ...options.base_input,
      target_regions: targetRegions,
    }),
  );
  options.equipment_contexts.forEach((context, index) =>
    add(`equipment_${index + 1}`, {
      ...options.base_input,
      available_equipment: context.available_equipment,
      unstable_equipment: context.unstable_equipment,
      environment: context.environment,
      available_space: context.available_space,
    }),
  );
  options.safety_states.forEach((safetyState, index) =>
    add(`safety_${index + 1}`, {
      ...options.base_input,
      safety_state: safetyState,
    }),
  );

  return scenarios;
}
