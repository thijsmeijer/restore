import {
  bundledContentChecksum,
  bundledContentInstallation,
} from '@/content/bundled-catalog';
import type { DatabaseConnection } from '@/db/database';

interface InstalledPackRow {
  readonly checksum: string;
  readonly manifest_json: string;
}

interface CountRow {
  readonly count: number;
}

export type ContentInstallationErrorCode =
  'content_install_checksum_mismatch' | 'content_install_exercise_conflict';

export class ContentInstallationError extends Error {
  public constructor(
    public readonly code: ContentInstallationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ContentInstallationError';
  }
}

interface InstalledExerciseRow {
  readonly content_version: string;
  readonly payload_json: string;
  readonly name: string;
  readonly summary: string;
}

function exercisePayloadJson(
  record: (typeof bundledContentInstallation.exercises)[number],
): string {
  return JSON.stringify({ exercise: record.exercise, copy: record.copy });
}

async function verifyInstalledExercises(
  database: DatabaseConnection,
): Promise<void> {
  const count = await database.getFirstAsync<CountRow>(
    'SELECT COUNT(*) AS count FROM exercises WHERE content_version = ?',
    bundledContentInstallation.contentVersion,
  );
  if (count?.count !== bundledContentInstallation.exercises.length) {
    throw new ContentInstallationError(
      'content_install_exercise_conflict',
      `Installed content ${bundledContentInstallation.contentVersion} has an unexpected exercise count.`,
    );
  }

  for (const record of bundledContentInstallation.exercises) {
    const row = await database.getFirstAsync<InstalledExerciseRow>(
      `SELECT content_version, payload_json, name, summary
      FROM exercises WHERE exercise_id = ? AND version = ?`,
      record.exercise.id,
      record.exercise.version,
    );
    const matches =
      row !== null &&
      row.content_version === record.contentVersion &&
      row.payload_json === exercisePayloadJson(record) &&
      row.name === record.copy.name &&
      row.summary === record.copy.summary;

    if (!matches) {
      throw new ContentInstallationError(
        'content_install_exercise_conflict',
        `Installed exercise ${record.exercise.id}@${record.exercise.version} differs from the bundled immutable version.`,
      );
    }
  }
}

export async function installBundledContent(
  database: DatabaseConnection,
  now: () => string = () => new Date().toISOString(),
): Promise<void> {
  const existing = await database.getFirstAsync<InstalledPackRow>(
    `SELECT checksum, manifest_json FROM content_packs
    WHERE content_version = ?`,
    bundledContentInstallation.contentVersion,
  );

  if (existing !== null) {
    if (
      existing.checksum !== bundledContentChecksum ||
      existing.manifest_json !== bundledContentInstallation.manifestJson
    ) {
      throw new ContentInstallationError(
        'content_install_checksum_mismatch',
        `Installed content ${bundledContentInstallation.contentVersion} has a different checksum.`,
      );
    }
    await verifyInstalledExercises(database);
    return;
  }

  await database.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      `INSERT INTO content_packs (
        content_version, schema_version, created_at, review_status,
        checksum, manifest_json, import_source, installed_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'bundled', ?)`,
      bundledContentInstallation.contentVersion,
      bundledContentInstallation.schemaVersion,
      bundledContentInstallation.createdAt,
      bundledContentInstallation.reviewStatus,
      bundledContentChecksum,
      bundledContentInstallation.manifestJson,
      now(),
    );

    for (const record of bundledContentInstallation.exercises) {
      await transaction.runAsync(
        `INSERT INTO exercises (
          exercise_id, version, content_version, slug, review_status,
          name, summary, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        record.exercise.id,
        record.exercise.version,
        record.contentVersion,
        record.exercise.slug,
        record.exercise.status,
        record.copy.name,
        record.copy.summary,
        exercisePayloadJson(record),
      );
    }

    await transaction.runAsync(
      `UPDATE schema_metadata SET content_version = ?, updated_at = ? WHERE id = 1`,
      bundledContentInstallation.contentVersion,
      now(),
    );
  });
}
