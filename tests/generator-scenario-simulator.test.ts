import type { Exercise, RoutineTemplate } from '@/content/schemas';
import { runBundledGenerationScenarios } from '@/developer/generator-scenarios';
import {
  buildGenerationScenarioMatrix,
  runGenerationScenarioSuite,
  type GenerationScenario,
} from '@/generator';
import {
  generationCatalog,
  generationInput,
  generationRules,
  reviewedExercise,
  reviewedTemplate,
} from './support/generator-fixtures';

function flexibleExercise(): Exercise {
  const exercise = reviewedExercise(0);
  exercise.phases = ['arrival'];
  exercise.prescription = {
    type: 'timed_movement',
    default: 60,
    minimum: 1,
    maximum: 5_400,
    sets: 1,
    rest_seconds: 0,
    tempo: 'controlled',
    side_mode: 'central',
  };
  exercise.dosage_limits = {
    max_sets_per_routine: 1,
    max_weekly_exposure: null,
    progression_step: 1,
    extendable: true,
  };
  return exercise;
}

function arrivalTemplate(): RoutineTemplate {
  const template = reviewedTemplate();
  template.phases = [
    {
      phase: 'arrival',
      requirement: 'required',
      minimum_share_basis_points: 10_000,
      target_share_basis_points: 10_000,
      maximum_share_basis_points: 10_000,
    },
  ];
  return template;
}

describe('GEN-003 scenario simulator', () => {
  it('checks successful and explicit-failure expectations through the public generator', () => {
    const scenarios: GenerationScenario[] = [
      {
        id: 'valid_routine',
        input: generationInput(),
        expectation: { type: 'routine' },
      },
      {
        id: 'blocked_input',
        input: { ...generationInput(), safety_state: 'blocked' },
        expectation: { type: 'failure', code: 'blocked_by_safety' },
      },
    ];
    const report = runGenerationScenarioSuite(
      scenarios,
      generationCatalog([flexibleExercise()], [arrivalTemplate()]),
      generationRules(),
    );

    expect(report).toMatchObject({
      total: 2,
      passed: 2,
      failed: 0,
      issue_codes: [],
    });
    expect(report.results.map((result) => result.result_code)).toEqual([
      'routine',
      'blocked_by_safety',
    ]);
  });

  it('fails closed for expectation mismatches and duplicate scenario IDs', () => {
    const duplicateScenarios: GenerationScenario[] = [
      {
        id: 'same_case',
        input: generationInput(),
        expectation: { type: 'failure', code: 'blocked_by_safety' },
      },
      {
        id: 'same_case',
        input: generationInput(),
        expectation: { type: 'routine' },
      },
    ];
    const report = runGenerationScenarioSuite(
      duplicateScenarios,
      generationCatalog([flexibleExercise()], [arrivalTemplate()]),
      generationRules(),
    );

    expect(report.failed).toBe(2);
    expect(report.issue_codes).toEqual(
      expect.arrayContaining([
        'duplicate_scenario_id',
        'scenario_expectation_failed',
      ]),
    );
  });

  it('rejects empty suites and does not echo invalid scenario identifiers', () => {
    const catalog = generationCatalog(
      [flexibleExercise()],
      [arrivalTemplate()],
    );
    const empty = runGenerationScenarioSuite([], catalog, generationRules());
    expect(empty).toMatchObject({
      valid: false,
      issue_codes: ['empty_scenario_suite'],
    });

    const invalid = runGenerationScenarioSuite(
      [
        {
          id: 'Private scenario name',
          input: generationInput(),
          expectation: { type: 'routine' },
        },
      ],
      catalog,
      generationRules(),
    );
    expect(invalid.valid).toBe(false);
    expect(invalid.issue_codes).toContain('invalid_scenario_id');
    expect(invalid.results[0]?.scenario_id).toBe('scenario_1');
    expect(JSON.stringify(invalid)).not.toContain('Private scenario name');
  });

  it('rejects an unbounded suite before running any scenario', () => {
    const scenarios: GenerationScenario[] = Array.from(
      { length: 1_001 },
      (_, index) => ({
        id: `bounded_case_${index + 1}`,
        input: generationInput(),
        expectation: { type: 'safe_result' },
      }),
    );
    const report = runGenerationScenarioSuite(
      scenarios,
      generationCatalog([flexibleExercise()], [arrivalTemplate()]),
      generationRules(),
    );

    expect(report).toMatchObject({
      valid: false,
      total: 1_001,
      passed: 0,
      failed: 1_001,
      issue_codes: ['scenario_limit_exceeded'],
      results: [],
    });
  });

  it('builds a bounded matrix and reports every requested axis', () => {
    const baseInput = generationInput();
    const scenarios = buildGenerationScenarioMatrix({
      base_input: baseInput,
      durations: [2, 90],
      modes: ['daily_restore', 'morning_primer'],
      target_cases: [[], baseInput.target_regions],
      equipment_contexts: [
        {
          available_equipment: [],
          unstable_equipment: [],
          environment: 'home',
          available_space: 'small',
        },
        {
          available_equipment: ['mat'],
          unstable_equipment: ['mat'],
          environment: 'gym',
          available_space: 'large',
        },
      ],
      safety_states: ['clear', 'blocked'],
      expectation: { type: 'safe_result' },
    });
    const report = runGenerationScenarioSuite(
      scenarios,
      generationCatalog([flexibleExercise()], [arrivalTemplate()]),
      generationRules(),
    );

    expect(scenarios).toHaveLength(11);
    expect(report.coverage).toEqual({
      duration_case_count: 3,
      mode_case_count: 2,
      target_case_count: 2,
      equipment_context_count: 2,
      safety_state_count: 2,
    });
    expect(report.failed).toBe(0);
  });

  it('runs the complete bundled draft-readiness matrix without a violation', () => {
    const report = runBundledGenerationScenarios();

    expect(report).toMatchObject({
      total: 153,
      passed: 153,
      failed: 0,
      issue_codes: [],
      coverage: {
        duration_case_count: 89,
        mode_case_count: 13,
        target_case_count: 27,
        equipment_context_count: 21,
        safety_state_count: 3,
      },
    });
  });
});
