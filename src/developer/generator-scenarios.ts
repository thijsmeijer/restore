import { bundledCatalog } from '@/content/bundled-catalog';
import type { BodyRegion } from '@/content/schemas';
import { engineeringGenerationRules } from '@/generator/engineering-rules';
import { generatorEngineVersion } from '@/generator/input-schema';
import {
  buildGenerationScenarioMatrix,
  runGenerationScenarioSuite,
  type GenerationScenario,
  type GenerationScenarioSuiteReport,
} from '@/generator/scenario-simulator';
import type { GenerationCatalog } from '@/generator/types';
import type { GenerationInput } from '@/generator/input-schema';

const fixedSyntheticTimestamp = '2000-01-01T00:00:00.000Z';

const bundledGenerationCatalog: GenerationCatalog = {
  content_version: bundledCatalog.manifest.content_version,
  review_status: bundledCatalog.manifest.review_status,
  exercises: bundledCatalog.manifest.exercises,
  templates: bundledCatalog.manifest.routine_templates,
};

function syntheticBaseInput(): GenerationInput {
  return {
    schema_version: 2,
    routine_id: '90000000-0000-4000-8000-000000000001',
    check_in_id: '90000000-0000-4000-8000-000000000002',
    generated_at: fixedSyntheticTimestamp,
    mode: 'daily_restore',
    available_minutes: 5,
    environment: 'home',
    available_space: 'large',
    available_equipment: [],
    unstable_equipment: [],
    safety_state: 'clear',
    safety_rules_version: engineeringGenerationRules.safety_rules_version,
    safety_matched_rule_ids: [],
    safety_reason_codes: [],
    target_regions: [],
    intent: null,
    recent_major_trauma: false,
    restricted_demand_flags: [],
    profile_goal_slugs: [],
    training_context: null,
    preferences: [],
    response_aggregates: [],
    recent_exercise_ids: [],
    content_version: bundledCatalog.manifest.content_version,
    engine_version: generatorEngineVersion,
    rules_version: engineeringGenerationRules.rules_version,
    configuration_version: engineeringGenerationRules.configuration_version,
    seed: 'synthetic_scenario_seed',
  };
}

function targetSide(region: BodyRegion): 'bilateral' | 'central' {
  return region.laterality === 'paired' ? 'bilateral' : 'central';
}

export function bundledGenerationScenarios(): GenerationScenario[] {
  const expectedDraftFailure = {
    type: 'failure' as const,
    code: 'catalog_not_clinically_reviewed' as const,
  };
  const scenarios = buildGenerationScenarioMatrix({
    base_input: syntheticBaseInput(),
    durations: Array.from({ length: 89 }, (_, index) => index + 2),
    modes: bundledCatalog.modes,
    target_cases: bundledCatalog.body_regions
      .filter((region) => region.active && region.selectable)
      .map((region) => [
        {
          region_slug: region.slug,
          side: targetSide(region),
          maximum_rating: null,
          symptom_qualities: [],
        },
      ]),
    equipment_contexts: [
      {
        available_equipment: [],
        unstable_equipment: [],
        environment: 'home',
        available_space: 'large',
      },
      ...bundledCatalog.equipment.flatMap((equipment) => [
        {
          available_equipment: [equipment.slug],
          unstable_equipment: [],
          environment: 'home' as const,
          available_space: 'large' as const,
        },
        {
          available_equipment: [equipment.slug],
          unstable_equipment: [equipment.slug],
          environment: 'home' as const,
          available_space: 'large' as const,
        },
      ]),
    ],
    safety_states: ['clear', 'gentle_only', 'blocked'],
    expectation: expectedDraftFailure,
  });

  return scenarios.map((scenario) =>
    scenario.input.safety_state === 'blocked'
      ? {
          ...scenario,
          expectation: { type: 'failure', code: 'blocked_by_safety' },
        }
      : scenario,
  );
}

export function runBundledGenerationScenarios(): GenerationScenarioSuiteReport {
  return runGenerationScenarioSuite(
    bundledGenerationScenarios(),
    bundledGenerationCatalog,
    engineeringGenerationRules,
  );
}
