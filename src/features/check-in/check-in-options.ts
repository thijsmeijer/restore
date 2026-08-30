import {
  equipmentOptions,
  trainingTypeOptions,
} from '@/features/onboarding/profile-options';

export const checkInModes = [
  'daily_restore',
  'morning_primer',
  'pre_workout_prep',
  'post_workout_reset',
  'desk_rescue',
  'night_downshift',
  'targeted_area',
  'pain_aware_gentle',
  'deep_restoration',
  'gym',
  'skill_prep',
  'recovery_day',
  'emergency_reset',
] as const;

export type CheckInMode = (typeof checkInModes)[number];

export const checkInModeOptions: readonly {
  value: CheckInMode;
  label: string;
}[] = [
  { value: 'daily_restore', label: 'Daily restore' },
  { value: 'pre_workout_prep', label: 'Before training' },
  { value: 'post_workout_reset', label: 'After training' },
  { value: 'night_downshift', label: 'Wind down' },
] as const;

export const environmentOptions = [
  { value: 'home', label: 'Home' },
  { value: 'desk', label: 'Desk' },
  { value: 'gym', label: 'Gym' },
  { value: 'travel', label: 'Travel' },
  { value: 'custom', label: 'Somewhere else' },
] as const;

export type CheckInEnvironment = (typeof environmentOptions)[number]['value'];

export const trainingStatusOptions = [
  { value: 'planned', label: 'Planned' },
  { value: 'completed', label: 'Completed' },
] as const;

export type CheckInTrainingStatus =
  (typeof trainingStatusOptions)[number]['value'];

export const checkInEquipmentIds = new Set<string>(
  equipmentOptions.map((option) => option.id),
);

export const checkInTrainingTypes = new Set<string>(
  trainingTypeOptions.map((option) => option.value),
);
