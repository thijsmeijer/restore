import type { ExerciseCopy } from '@/content/exercise-copy';
import type { Exercise } from '@/content/schemas';

export type ExerciseAvoidState = 'none' | 'temporary' | 'permanent';
export interface ExercisePreference {
  readonly favorite: boolean;
  readonly avoidState: ExerciseAvoidState;
  readonly avoidUntil: string | null;
}
export type LibraryView = 'all' | 'favorites' | 'avoided';
export type LibraryDifficulty = Exercise['intensity'];
export type LibraryIntent = Exercise['effects'][number]['effect'];

export interface LibraryExercise {
  readonly contentVersion: string;
  readonly exercise: Exercise;
  readonly copy: ExerciseCopy;
  readonly preference: ExercisePreference;
}

export interface LibraryFilters {
  readonly region: string | null;
  readonly intent: LibraryIntent | null;
  readonly equipment: string | null;
  readonly difficulty: LibraryDifficulty | null;
}

export const emptyLibraryFilters: LibraryFilters = {
  region: null,
  intent: null,
  equipment: null,
  difficulty: null,
};

export const libraryViewOptions = [
  { label: 'All', value: 'all' },
  { label: 'Favorites', value: 'favorites' },
  { label: 'Avoided', value: 'avoided' },
] as const;

export const difficultyLabels: Readonly<Record<LibraryDifficulty, string>> = {
  very_gentle: 'Very gentle',
  gentle: 'Gentle',
  moderate: 'Moderate',
};

export const intentLabels: Readonly<Record<LibraryIntent, string>> = {
  down_regulate: 'Settle',
  breathe_expand: 'Breathing',
  decompress: 'Decompress',
  mobilize: 'Mobilize',
  explore_range: 'Explore range',
  improve_tolerance: 'Build tolerance',
  activate_lightly: 'Light activation',
  stabilize_control: 'Control',
  integrate: 'Integrate',
  prepare_for_load: 'Prepare',
  recover_after_load: 'Recover',
  reassess: 'Reassess',
};

export const regionLabels: Readonly<Record<string, string>> = {
  thoracic_spine: 'Upper back',
  chest_pecs: 'Chest',
  scapular_region: 'Shoulder blades',
  wrist_hand_fingers: 'Wrist, hand & fingers',
  hip_deep_rotation: 'Deep hip rotation',
};

export const equipmentLabels: Readonly<Record<string, string>> = {
  none: 'No equipment',
  wall: 'Wall',
  mat: 'Mat',
  resistance_band: 'Resistance band',
  parallettes: 'Parallettes',
  pull_up_bar: 'Pull-up bar',
  dip_bars: 'Dip bars',
  bench: 'Bench',
  foam_roller: 'Foam roller',
  massage_ball: 'Massage ball',
  cable_stack: 'Cable stack',
};

export function displayRegionSlug(regionSlug: string): string {
  if (regionSlug === 'wrist' || regionSlug === 'hand_fingers') {
    return 'wrist_hand_fingers';
  }
  return regionSlug;
}

function requiredEquipment(exercise: Exercise): readonly string[] {
  return [
    ...exercise.requirements.equipment.all_of,
    ...exercise.requirements.equipment.any_of.flat(),
  ];
}

export function exerciseEquipment(exercise: Exercise): readonly string[] {
  const required = requiredEquipment(exercise);
  return required.length === 0 ? ['none'] : [...new Set(required)];
}

export function primaryIntent(exercise: Exercise): LibraryIntent {
  return (
    exercise.effects.find((effect) => effect.primary)?.effect ??
    exercise.effects[0]!.effect
  );
}

export function primaryRegion(exercise: Exercise): string {
  const region =
    exercise.effects.find((effect) => effect.primary)?.region_slug ??
    exercise.effects[0]!.region_slug;
  return displayRegionSlug(region);
}

export function libraryFilterOptions(exercises: readonly LibraryExercise[]) {
  const regions = new Set<string>();
  const intents = new Set<LibraryIntent>();
  const equipment = new Set<string>();
  const difficulties = new Set<LibraryDifficulty>();

  for (const item of exercises) {
    item.exercise.effects.forEach((effect) => {
      regions.add(displayRegionSlug(effect.region_slug));
      intents.add(effect.effect);
    });
    exerciseEquipment(item.exercise).forEach((slug) => equipment.add(slug));
    difficulties.add(item.exercise.intensity);
  }

  return {
    regions: [...regions].sort((a, b) =>
      (regionLabels[a] ?? a).localeCompare(regionLabels[b] ?? b),
    ),
    intents: [...intents].sort((a, b) =>
      intentLabels[a].localeCompare(intentLabels[b]),
    ),
    equipment: [...equipment].sort((a, b) =>
      (equipmentLabels[a] ?? a).localeCompare(equipmentLabels[b] ?? b),
    ),
    difficulties: [...difficulties].sort(
      (a, b) =>
        ['very_gentle', 'gentle', 'moderate'].indexOf(a) -
        ['very_gentle', 'gentle', 'moderate'].indexOf(b),
    ),
  } as const;
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function filterLibraryExercises(
  exercises: readonly LibraryExercise[],
  search: string,
  view: LibraryView,
  filters: LibraryFilters,
): readonly LibraryExercise[] {
  const term = normalizeSearch(search);

  return exercises.filter((item) => {
    if (view === 'favorites' && !item.preference.favorite) return false;
    if (view === 'avoided' && item.preference.avoidState === 'none')
      return false;

    if (term.length > 0) {
      const searchable = normalizeSearch(
        `${item.copy.name} ${item.copy.summary}`,
      );
      if (!searchable.includes(term)) return false;
    }

    if (
      filters.region !== null &&
      !item.exercise.effects.some(
        (effect) => displayRegionSlug(effect.region_slug) === filters.region,
      )
    ) {
      return false;
    }
    if (
      filters.intent !== null &&
      !item.exercise.effects.some((effect) => effect.effect === filters.intent)
    ) {
      return false;
    }
    if (
      filters.equipment !== null &&
      !exerciseEquipment(item.exercise).includes(filters.equipment)
    ) {
      return false;
    }
    if (
      filters.difficulty !== null &&
      item.exercise.intensity !== filters.difficulty
    ) {
      return false;
    }

    return true;
  });
}

export function activeFilterCount(filters: LibraryFilters): number {
  return Object.values(filters).filter((value) => value !== null).length;
}

export function prescriptionLabel(exercise: Exercise): string {
  const { prescription } = exercise;
  const dose = prescription.default;
  const unit =
    prescription.type === 'breathing_cycles'
      ? dose === 1
        ? 'breath'
        : 'breaths'
      : prescription.type === 'repetitions'
        ? dose === 1
          ? 'rep'
          : 'reps'
        : prescription.type === 'timed_hold' ||
            prescription.type === 'timed_movement'
          ? dose === 1
            ? 'second'
            : 'seconds'
          : 'check';
  const sides =
    prescription.side_mode === 'bilateral_sequential' ? ' per side' : '';
  const sets = prescription.sets > 1 ? ` · ${prescription.sets} sets` : '';
  return `${dose} ${unit}${sides}${sets}`;
}
