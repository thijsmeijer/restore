import bodyRegionsJson from '../../content/body-regions.json';
import equipmentJson from '../../content/equipment.json';
import localizationKeysJson from '../../content/localization-keys.json';
import manifestJson from '../../content/manifest.json';
import mediaAssetsJson from '../../content/media-assets.json';
import modesJson from '../../content/modes.json';

import { exerciseCopyFor, validateExerciseCopyCatalog } from './exercise-copy';
import type { ContentCatalog } from './schemas';
import { validateContentCatalog } from './validation';

export interface BundledExerciseRecord {
  readonly contentVersion: string;
  readonly exercise: ContentCatalog['manifest']['exercises'][number];
  readonly copy: ReturnType<typeof exerciseCopyFor>;
}

export interface BundledContentInstallation {
  readonly schemaVersion: number;
  readonly contentVersion: string;
  readonly createdAt: string;
  readonly reviewStatus: ContentCatalog['manifest']['review_status'];
  readonly manifestJson: string;
  readonly exercises: readonly BundledExerciseRecord[];
}

function loadBundledCatalog(): ContentCatalog {
  const result = validateContentCatalog({
    manifest: manifestJson,
    body_regions: bodyRegionsJson,
    equipment: equipmentJson,
    modes: modesJson,
    localization_keys: localizationKeysJson,
    media_assets: mediaAssetsJson,
  });

  if (!result.ok) {
    const firstIssue = result.issues[0];
    throw new Error(
      `bundled_content_invalid:${firstIssue?.code ?? 'unknown'}:${firstIssue?.path ?? '$'}`,
    );
  }

  validateExerciseCopyCatalog(result.catalog.manifest.exercises);
  return result.catalog;
}

export const bundledCatalog = loadBundledCatalog();

export const bundledContentInstallation: BundledContentInstallation = {
  schemaVersion: bundledCatalog.manifest.schema_version,
  contentVersion: bundledCatalog.manifest.content_version,
  createdAt: bundledCatalog.manifest.created_at,
  reviewStatus: bundledCatalog.manifest.review_status,
  manifestJson: JSON.stringify(bundledCatalog.manifest),
  exercises: bundledCatalog.manifest.exercises.map((exercise) => ({
    contentVersion: bundledCatalog.manifest.content_version,
    exercise,
    copy: exerciseCopyFor(exercise),
  })),
};

// Changing any installed content requires a new content version and checksum.
export const bundledContentChecksum =
  'sha256:5a37343840192af9d038baad562e2662ee807bd8ca290649f4a9f7adb2ae1e9b';
