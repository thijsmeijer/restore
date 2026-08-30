import type {
  CheckInSafetyReasonCode,
  CheckInSafetyRuleId,
  CheckInSafetySignal,
} from '@/features/safety/check-in-safety';

export interface BlockingSafetyFixture {
  readonly signal: CheckInSafetySignal;
  readonly ruleId: CheckInSafetyRuleId;
  readonly reasonCode: CheckInSafetyReasonCode;
}

export const blockingSafetyFixtures: readonly BlockingSafetyFixture[] = [
  {
    signal: 'sudden_severe_pain',
    ruleId: 'block_sudden_severe_pain_v1',
    reasonCode: 'reported_sudden_severe_pain',
  },
  {
    signal: 'recent_major_trauma',
    ruleId: 'block_recent_major_trauma_v1',
    reasonCode: 'reported_recent_major_trauma',
  },
  {
    signal: 'new_numbness_or_tingling',
    ruleId: 'block_new_numbness_or_tingling_v1',
    reasonCode: 'reported_new_numbness_or_tingling',
  },
  {
    signal: 'unexplained_weakness_or_loss_of_control',
    ruleId: 'block_unexplained_weakness_or_loss_of_control_v1',
    reasonCode: 'reported_unexplained_weakness_or_loss_of_control',
  },
  {
    signal: 'radiating_symptoms',
    ruleId: 'block_radiating_symptoms_v1',
    reasonCode: 'reported_radiating_symptoms',
  },
  {
    signal: 'significant_swelling_or_visible_deformity',
    ruleId: 'block_significant_swelling_or_visible_deformity_v1',
    reasonCode: 'reported_significant_swelling_or_visible_deformity',
  },
  {
    signal: 'dizziness_fainting_chest_or_breathing_difficulty',
    ruleId: 'block_dizziness_fainting_chest_or_breathing_difficulty_v1',
    reasonCode: 'reported_dizziness_fainting_chest_or_breathing_difficulty',
  },
  {
    signal: 'rapidly_worsening_problem',
    ruleId: 'block_rapidly_worsening_problem_v1',
    reasonCode: 'reported_rapidly_worsening_problem',
  },
];
