import { readFileSync } from 'node:fs';
import path from 'node:path';

import { validateContentCatalog } from '@/content/validation';

const expectedBodyRegionSlugs = [
  'head_eyes_jaw',
  'neck',
  'upper_trapezius',
  'shoulder',
  'shoulder_front',
  'shoulder_side',
  'shoulder_rear',
  'scapular_region',
  'chest_pecs',
  'lats',
  'elbow',
  'forearm',
  'wrist',
  'hand_fingers',
  'thoracic_spine',
  'lumbar_spine',
  'pelvis_si_area',
  'hip',
  'hip_front',
  'hip_side',
  'hip_deep_rotation',
  'glutes',
  'adductors_groin',
  'hamstrings',
  'quadriceps',
  'knee',
  'calf',
  'ankle',
  'foot_toes',
] as const;

const expectedEquipmentSlugs = [
  'mat',
  'resistance_band',
  'parallettes',
  'pull_up_bar',
  'dip_bars',
  'wall',
  'bench',
  'foam_roller',
  'massage_ball',
  'cable_stack',
] as const;

const expectedModeSlugs = [
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

function readContentFile(fileName: string): unknown {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), 'content', fileName), 'utf8'),
  ) as unknown;
}

function loadCatalog(): unknown {
  return {
    manifest: readContentFile('manifest.json'),
    body_regions: readContentFile('body-regions.json'),
    equipment: readContentFile('equipment.json'),
    modes: readContentFile('modes.json'),
    localization_keys: readContentFile('localization-keys.json'),
    media_assets: readContentFile('media-assets.json'),
  };
}

describe('CONTENT-002 seed catalog', () => {
  it('matches the canonical body-region taxonomy and hierarchy', () => {
    const result = validateContentCatalog(loadCatalog());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.catalog.body_regions.map((region) => region.slug)).toEqual(
      expectedBodyRegionSlugs,
    );
    expect(
      result.catalog.body_regions.filter((region) => region.selectable),
    ).toHaveLength(27);
    expect(
      result.catalog.body_regions
        .filter((region) => region.parent_slug !== null)
        .map((region) => [region.slug, region.parent_slug]),
    ).toEqual([
      ['shoulder_front', 'shoulder'],
      ['shoulder_side', 'shoulder'],
      ['shoulder_rear', 'shoulder'],
      ['hip_front', 'hip'],
      ['hip_side', 'hip'],
      ['hip_deep_rotation', 'hip'],
    ]);
  });

  it('seeds the bounded equipment and P0 mode catalogs', () => {
    const result = validateContentCatalog(loadCatalog());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.catalog.equipment.map((entry) => entry.slug)).toEqual(
      expectedEquipmentSlugs,
    );
    expect(result.catalog.modes).toEqual(expectedModeSlugs);
    expect(
      result.catalog.equipment.every(
        (entry) => entry.active && entry.content_version === '0.1.0',
      ),
    ).toBe(true);
  });

  it('keeps all ten sample exercises draft-only with complete text references', () => {
    const result = validateContentCatalog(loadCatalog());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { manifest } = result.catalog;
    expect(manifest.content_version).toBe('0.1.0');
    expect(manifest.review_status).toBe('draft');
    expect(manifest.exercises).toHaveLength(10);
    expect(
      manifest.exercises.every(
        (exercise) =>
          exercise.status === 'draft' &&
          exercise.review.engineering === null &&
          exercise.review.clinical === null &&
          exercise.media.text_fallback_required &&
          exercise.instructions.common_error_keys.length > 0 &&
          exercise.instructions.stop_rule_keys.includes(
            'exercise.common.stop.feels_wrong',
          ),
      ),
    ).toBe(true);
    expect(
      manifest.exercises.every(
        (exercise) => !exercise.allowed_modes.includes('pain_aware_gentle'),
      ),
    ).toBe(true);
  });

  it('provides an exact pinned alternative for every sample exercise', () => {
    const result = validateContentCatalog(loadCatalog());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const exerciseKeys = new Set(
      result.catalog.manifest.exercises.map(
        (exercise) => `${exercise.id}@${exercise.version}`,
      ),
    );

    for (const exercise of result.catalog.manifest.exercises) {
      expect(exercise.relations).toHaveLength(1);
      const relation = exercise.relations[0];
      expect(relation).toMatchObject({
        type: 'alternative',
        version_policy: 'pinned',
        target_version: 1,
      });
      expect(
        exerciseKeys.has(
          `${relation?.target_exercise_id}@${relation?.target_version}`,
        ),
      ).toBe(true);
    }
  });
});
