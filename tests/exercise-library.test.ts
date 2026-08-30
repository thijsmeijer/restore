import { bundledContentInstallation } from '@/content/bundled-catalog';
import {
  emptyLibraryFilters,
  filterLibraryExercises,
  libraryFilterOptions,
  type LibraryExercise,
} from '@/features/library/library';

const exercises: readonly LibraryExercise[] =
  bundledContentInstallation.exercises.map((record, index) => ({
    ...record,
    preference: {
      favorite: index === 0,
      avoidState: index === 1 ? 'permanent' : 'none',
      avoidUntil: null,
    },
  }));

describe('offline exercise-library discovery', () => {
  it('searches names and summaries without changing the catalog', () => {
    expect(
      filterLibraryExercises(
        exercises,
        'upper-back rotation',
        'all',
        emptyLibraryFilters,
      ).map((item) => item.exercise.slug),
    ).toEqual(['seated_thoracic_rotation', 'side_lying_thoracic_rotation']);
    expect(exercises).toHaveLength(10);
  });

  it('filters by region, intent, equipment, and difficulty with AND semantics', () => {
    const results = filterLibraryExercises(exercises, '', 'all', {
      region: 'scapular_region',
      intent: 'stabilize_control',
      equipment: 'wall',
      difficulty: 'gentle',
    });

    expect(results.map((item) => item.exercise.slug)).toEqual([
      'wall_scapular_glide',
    ]);
  });

  it('treats wrist, hand, and fingers as one visible region filter', () => {
    const results = filterLibraryExercises(exercises, '', 'all', {
      ...emptyLibraryFilters,
      region: 'wrist_hand_fingers',
    });
    const options = libraryFilterOptions(exercises);

    expect(results.map((item) => item.exercise.slug)).toEqual([
      'wrist_controlled_circles',
      'quadruped_wrist_rock',
    ]);
    expect(options.regions).toContain('wrist_hand_fingers');
    expect(options.regions).not.toContain('wrist');
    expect(options.regions).not.toContain('hand_fingers');
  });

  it('separates favorite and avoided views from neutral movements', () => {
    expect(
      filterLibraryExercises(
        exercises,
        '',
        'favorites',
        emptyLibraryFilters,
      ).map((item) => item.exercise.slug),
    ).toEqual(['supported_breathing_reset']);
    expect(
      filterLibraryExercises(exercises, '', 'avoided', emptyLibraryFilters).map(
        (item) => item.exercise.slug,
      ),
    ).toEqual(['seated_breathing_reset']);
  });
});
