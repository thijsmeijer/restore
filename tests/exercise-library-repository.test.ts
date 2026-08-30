import { createHash } from 'node:crypto';

import {
  bundledContentChecksum,
  bundledContentInstallation,
} from '@/content/bundled-catalog';
import {
  ContentInstallationError,
  installBundledContent,
} from '@/content/install-bundled-content';
import { initializeDatabaseConnection } from '@/db/initialize-database';
import { SQLiteExerciseLibraryRepository } from '@/db/repositories/exercise-library-repository';

import { schemaVersionZeroFixture } from './fixtures/database/schema-v0';
import { NodeSQLiteDatabase } from './support/node-sqlite-database';

const timestamp = '2026-08-30T12:00:00.000Z';
const profileId = '00000000000000000000000000';

describe('exercise library persistence', () => {
  let database: NodeSQLiteDatabase;

  beforeEach(async () => {
    database = new NodeSQLiteDatabase();
    await database.execAsync(schemaVersionZeroFixture);
    await initializeDatabaseConnection(database, () => timestamp);
  });

  afterEach(() => database.close());

  it('pins the checksum to the exact validated bundled installation', () => {
    const checksum = `sha256:${createHash('sha256')
      .update(JSON.stringify(bundledContentInstallation))
      .digest('hex')}`;

    expect(bundledContentChecksum).toBe(checksum);
    expect(bundledContentInstallation.exercises).toHaveLength(10);
    expect(
      bundledContentInstallation.exercises.every(
        (record) => record.exercise.status === 'draft',
      ),
    ).toBe(true);
  });

  it('installs the validated content pack atomically and is idempotent', async () => {
    const repository = new SQLiteExerciseLibraryRepository(database);

    await expect(repository.list()).resolves.toHaveLength(10);
    await expect(
      installBundledContent(database, () => timestamp),
    ).resolves.toBe(undefined);
    await expect(
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM content_packs',
      ),
    ).resolves.toEqual({ count: 1 });
    await expect(
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM exercises',
      ),
    ).resolves.toEqual({ count: 10 });
  });

  it('fails closed rather than rewriting a released content version', async () => {
    await database.runAsync(
      `UPDATE content_packs SET checksum = 'sha256:different'
      WHERE content_version = ?`,
      bundledContentInstallation.contentVersion,
    );

    await expect(
      installBundledContent(database, () => timestamp),
    ).rejects.toMatchObject<Partial<ContentInstallationError>>({
      code: 'content_install_checksum_mismatch',
    });
  });

  it('fails closed when an immutable installed exercise is missing', async () => {
    const exerciseId = bundledContentInstallation.exercises[0]!.exercise.id;
    await database.runAsync(
      'DELETE FROM exercises WHERE exercise_id = ?',
      exerciseId,
    );

    await expect(
      installBundledContent(database, () => timestamp),
    ).rejects.toMatchObject<Partial<ContentInstallationError>>({
      code: 'content_install_exercise_conflict',
    });
  });

  it('persists favorite and avoid independently and restores both', async () => {
    await database.runAsync(
      `INSERT INTO user_profiles (
        id, onboarding_completed_at, safety_rules_version,
        safety_acknowledged_at, created_at, updated_at
      ) VALUES (?, ?, 'test_rules', ?, ?, ?)`,
      profileId,
      timestamp,
      timestamp,
      timestamp,
      timestamp,
    );
    const repository = new SQLiteExerciseLibraryRepository(
      database,
      () => timestamp,
      () => '00000000000000000000000001',
    );
    const exerciseId = bundledContentInstallation.exercises[0]!.exercise.id;

    await expect(repository.setFavorite(exerciseId, true)).resolves.toEqual({
      ok: true,
    });
    await expect(repository.list()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          exercise: expect.objectContaining({ id: exerciseId }),
          preference: expect.objectContaining({ favorite: true }),
        }),
      ]),
    );

    await expect(repository.setAvoided(exerciseId, true)).resolves.toEqual({
      ok: true,
    });
    await expect(
      database.getFirstAsync<{ favorite: number; avoid_state: string }>(
        `SELECT favorite, avoid_state FROM exercise_preferences
        WHERE exercise_id = ?`,
        exerciseId,
      ),
    ).resolves.toEqual({ favorite: 1, avoid_state: 'permanent' });

    await expect(repository.setAvoided(exerciseId, false)).resolves.toEqual({
      ok: true,
    });
    await expect(repository.setFavorite(exerciseId, false)).resolves.toEqual({
      ok: true,
    });
    await expect(
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM exercise_preferences',
      ),
    ).resolves.toEqual({ count: 0 });
  });

  it('rejects preferences without a profile or for an unknown exercise', async () => {
    const repository = new SQLiteExerciseLibraryRepository(database);
    const exerciseId = bundledContentInstallation.exercises[0]!.exercise.id;

    await expect(repository.setFavorite(exerciseId, true)).resolves.toEqual({
      ok: false,
      code: 'profile_missing',
    });

    await database.runAsync(
      `INSERT INTO user_profiles (
        id, onboarding_completed_at, safety_rules_version,
        safety_acknowledged_at, created_at, updated_at
      ) VALUES (?, ?, 'test_rules', ?, ?, ?)`,
      profileId,
      timestamp,
      timestamp,
      timestamp,
      timestamp,
    );
    await expect(
      repository.setAvoided('missing-exercise', true),
    ).resolves.toEqual({ ok: false, code: 'exercise_missing' });
  });
});
