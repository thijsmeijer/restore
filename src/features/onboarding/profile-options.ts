export const goalOptions = [
  { value: 'move_better', label: 'Move with more ease' },
  { value: 'reduce_stiffness', label: 'Ease everyday stiffness' },
  {
    value: 'prepare_for_calisthenics',
    label: 'Support calisthenics training',
  },
  { value: 'improve_posture', label: 'Improve posture and control' },
  { value: 'wind_down', label: 'Wind down and relax' },
  { value: 'maintain_joints', label: 'Maintain joint mobility' },
] as const;

export type GoalSlug = (typeof goalOptions)[number]['value'];

export const trainingTypeOptions = [
  { value: 'pull', label: 'Pull' },
  { value: 'push', label: 'Push' },
  { value: 'legs', label: 'Legs' },
  { value: 'planche', label: 'Planche' },
  { value: 'front_lever', label: 'Front lever' },
  { value: 'handstand', label: 'Handstand' },
  { value: 'mixed_skills', label: 'Mixed calisthenics skills' },
  { value: 'weighted_strength', label: 'Weighted strength' },
  { value: 'running', label: 'Running' },
  { value: 'rest', label: 'Rest or recovery days' },
] as const;

export type TrainingType = (typeof trainingTypeOptions)[number]['value'];

export const trainingTypeGroups: readonly {
  label: string;
  values: readonly TrainingType[];
}[] = [
  {
    label: 'Strength days',
    values: ['push', 'pull', 'legs', 'weighted_strength'],
  },
  {
    label: 'Skill practice',
    values: ['planche', 'front_lever', 'handstand', 'mixed_skills'],
  },
  { label: 'Other days', values: ['running', 'rest'] },
];

export const equipmentOptions = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    slug: 'mat',
    label: 'Mat',
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    slug: 'resistance_band',
    label: 'Resistance band',
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    slug: 'parallettes',
    label: 'Parallettes',
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    slug: 'pull_up_bar',
    label: 'Pull-up bar',
  },
  {
    id: '10000000-0000-4000-8000-000000000005',
    slug: 'dip_bars',
    label: 'Dip bars',
  },
  {
    id: '10000000-0000-4000-8000-000000000006',
    slug: 'wall',
    label: 'Clear wall space',
  },
  {
    id: '10000000-0000-4000-8000-000000000007',
    slug: 'bench',
    label: 'Bench',
  },
  {
    id: '10000000-0000-4000-8000-000000000008',
    slug: 'foam_roller',
    label: 'Foam roller',
  },
  {
    id: '10000000-0000-4000-8000-000000000009',
    slug: 'massage_ball',
    label: 'Massage ball',
  },
  {
    id: '10000000-0000-4000-8000-000000000010',
    slug: 'cable_stack',
    label: 'Cable stack',
  },
] as const;

export const bodyRegionOptions = [
  {
    slug: 'head_eyes_jaw',
    label: 'Head, eyes, and jaw',
    laterality: 'central',
    surface: 'both',
  },
  { slug: 'neck', label: 'Neck', laterality: 'hybrid', surface: 'both' },
  {
    slug: 'upper_trapezius',
    label: 'Upper shoulders',
    laterality: 'paired',
    surface: 'back',
  },
  {
    slug: 'shoulder_front',
    label: 'Front shoulder',
    laterality: 'paired',
    surface: 'front',
  },
  {
    slug: 'shoulder_side',
    label: 'Side shoulder',
    laterality: 'paired',
    surface: 'both',
  },
  {
    slug: 'shoulder_rear',
    label: 'Rear shoulder',
    laterality: 'paired',
    surface: 'back',
  },
  {
    slug: 'scapular_region',
    label: 'Shoulder blade area',
    laterality: 'paired',
    surface: 'back',
  },
  {
    slug: 'chest_pecs',
    label: 'Chest and pectorals',
    laterality: 'paired',
    surface: 'front',
  },
  {
    slug: 'lats',
    label: 'Side and upper back',
    laterality: 'paired',
    surface: 'back',
  },
  { slug: 'elbow', label: 'Elbow', laterality: 'paired', surface: 'both' },
  { slug: 'forearm', label: 'Forearm', laterality: 'paired', surface: 'both' },
  { slug: 'wrist', label: 'Wrist', laterality: 'paired', surface: 'detail' },
  {
    slug: 'hand_fingers',
    label: 'Hand and fingers',
    laterality: 'paired',
    surface: 'detail',
  },
  {
    slug: 'thoracic_spine',
    label: 'Mid-back',
    laterality: 'central',
    surface: 'back',
  },
  {
    slug: 'lumbar_spine',
    label: 'Lower back',
    laterality: 'hybrid',
    surface: 'back',
  },
  {
    slug: 'pelvis_si_area',
    label: 'Pelvis and sacrum',
    laterality: 'hybrid',
    surface: 'back',
  },
  {
    slug: 'hip_front',
    label: 'Front hip',
    laterality: 'paired',
    surface: 'front',
  },
  {
    slug: 'hip_side',
    label: 'Side hip',
    laterality: 'paired',
    surface: 'both',
  },
  {
    slug: 'hip_deep_rotation',
    label: 'Deep hip',
    laterality: 'paired',
    surface: 'both',
  },
  { slug: 'glutes', label: 'Glutes', laterality: 'paired', surface: 'back' },
  {
    slug: 'adductors_groin',
    label: 'Inner thigh and groin',
    laterality: 'paired',
    surface: 'front',
  },
  {
    slug: 'hamstrings',
    label: 'Back thigh',
    laterality: 'paired',
    surface: 'back',
  },
  {
    slug: 'quadriceps',
    label: 'Front thigh',
    laterality: 'paired',
    surface: 'front',
  },
  { slug: 'knee', label: 'Knee', laterality: 'paired', surface: 'both' },
  { slug: 'calf', label: 'Calf', laterality: 'paired', surface: 'back' },
  { slug: 'ankle', label: 'Ankle', laterality: 'paired', surface: 'both' },
  {
    slug: 'foot_toes',
    label: 'Foot and toes',
    laterality: 'paired',
    surface: 'detail',
  },
] as const;

export type BodyRegionSlug = (typeof bodyRegionOptions)[number]['slug'];
export type BodySide = 'central' | 'left' | 'right' | 'bilateral';

export const currentSafetyRulesVersion = 'safety_baseline_2026_08_28';
