import type { GenerationRules } from '@/generator/types';

// Engineering configuration only. Daily-use activation still requires the
// exact rules and content versions to receive the review required by policy.
export const engineeringGenerationRules: GenerationRules = {
  rules_version: 'routine_rules_v1',
  configuration_version: '1.0.0',
  safety_rules_version: 'check_in_safety_engineering_2026_08_30',
  seconds_per_repetition: 4,
  seconds_per_breathing_cycle: 10,
  seconds_per_reassessment: 20,
  transition_seconds: 5,
  duration_tolerance_basis_points: 1_000,
  high_priority_target_count: 2,
  target_priority_step_basis_points: 2_000,
  minimum_target_priority_basis_points: 2_000,
  profile_goal_priority_step_basis_points: 2_000,
  minimum_profile_goal_priority_basis_points: 2_000,
  goal_effect_mappings: [
    {
      goal_slug: 'move_more_freely',
      effects: ['mobilize', 'explore_range'],
    },
    {
      goal_slug: 'recover_after_training',
      effects: ['recover_after_load', 'down_regulate'],
    },
  ],
  maximum_items: 12,
  maximum_same_movement_pattern: 2,
  scoring: {
    target_match: 300,
    primary_effect_bonus: 60,
    intent_match: 120,
    profile_goal_match: 70,
    training_context_match: 80,
    favorite: 40,
    helpful_response_each: 10,
    helpful_response_cap: 50,
    uncomfortable_response_each: -20,
    uncomfortable_response_cap: 80,
    preference_skip_each: -10,
    preference_skip_cap: 40,
    preference_replacement_each: -10,
    preference_replacement_cap: 40,
    history_combined_cap: 100,
    recent_exposure_penalty: -30,
  },
};
