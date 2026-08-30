import { createHash } from 'node:crypto';

import { initializeDatabaseConnection } from '@/db/initialize-database';
import { migrations } from '@/db/migrations';
import { runMigrations } from '@/db/migrations/runner';
import { MigrationError, type Migration } from '@/db/migrations/types';
import { SQLiteMigrationHistoryRepository } from '@/db/repositories/migration-history-repository';
import { SQLiteSchemaMetadataRepository } from '@/db/repositories/schema-metadata-repository';

import { schemaVersionZeroFixture } from './fixtures/database/schema-v0';
import { NodeSQLiteDatabase } from './support/node-sqlite-database';

const timestamp = '2026-08-30T00:00:00.000Z';

function checksum(statements: readonly string[]): string {
  return `sha256:${createHash('sha256').update(statements.join('\n')).digest('hex')}`;
}

describe('database migrations', () => {
  let database: NodeSQLiteDatabase;

  beforeEach(async () => {
    database = new NodeSQLiteDatabase();
    await database.execAsync(schemaVersionZeroFixture);
  });

  afterEach(() => {
    database.close();
  });

  it('keeps committed migration checksums synchronized with their SQL', () => {
    for (const migration of migrations) {
      expect(migration.checksum).toBe(checksum(migration.statements));
    }
  });

  it('initializes foreign keys, migrates, and verifies the database at startup', async () => {
    await initializeDatabaseConnection(database, () => timestamp);

    await expect(
      database.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys'),
    ).resolves.toEqual({ foreign_keys: 1 });
    await expect(
      database.getFirstAsync<{ quick_check: string }>('PRAGMA quick_check'),
    ).resolves.toEqual({ quick_check: 'ok' });
    await expect(
      new SQLiteSchemaMetadataRepository(database).get(),
    ).resolves.toMatchObject({
      schemaVersion: 5,
      migrationState: 'idle',
      lastIntegrityResult: 'ok',
      updatedAt: timestamp,
    });
  });

  it('migrates the schema-version-zero fixture and exposes typed lifecycle repositories', async () => {
    const result = await runMigrations(database, migrations, () => timestamp);

    expect(result).toEqual({
      fromVersion: 0,
      toVersion: 5,
      appliedMigrationIds: [
        '0001_schema_lifecycle',
        '0002_user_profile',
        '0003_check_ins',
        '0004_check_in_focus_regions',
        '0005_check_in_safety',
      ],
    });
    await expect(
      new SQLiteSchemaMetadataRepository(database).get(),
    ).resolves.toEqual({
      schemaVersion: 5,
      contentVersion: null,
      migrationState: 'idle',
      lastSuccessfulMigrationId: '0005_check_in_safety',
      lastMigratedAt: timestamp,
      lastSuccessfulBackupId: null,
      lastSuccessfulBackupChecksum: null,
      lastSuccessfulBackupAt: null,
      lastImportSchemaVersion: null,
      lastExportSchemaVersion: null,
      lastIntegrityResult: null,
      updatedAt: timestamp,
    });
    await expect(
      new SQLiteMigrationHistoryRepository(database).list(),
    ).resolves.toEqual([
      {
        migrationId: '0001_schema_lifecycle',
        fromSchemaVersion: 0,
        toSchemaVersion: 1,
        startedAt: timestamp,
        completedAt: timestamp,
        backupId: null,
        status: 'completed',
        checksum: migrations[0]?.checksum,
        failureReasonCode: null,
      },
      {
        migrationId: '0002_user_profile',
        fromSchemaVersion: 1,
        toSchemaVersion: 2,
        startedAt: timestamp,
        completedAt: timestamp,
        backupId: null,
        status: 'completed',
        checksum: migrations[1]?.checksum,
        failureReasonCode: null,
      },
      {
        migrationId: '0003_check_ins',
        fromSchemaVersion: 2,
        toSchemaVersion: 3,
        startedAt: timestamp,
        completedAt: timestamp,
        backupId: null,
        status: 'completed',
        checksum: migrations[2]?.checksum,
        failureReasonCode: null,
      },
      {
        migrationId: '0004_check_in_focus_regions',
        fromSchemaVersion: 3,
        toSchemaVersion: 4,
        startedAt: timestamp,
        completedAt: timestamp,
        backupId: null,
        status: 'completed',
        checksum: migrations[3]?.checksum,
        failureReasonCode: null,
      },
      {
        migrationId: '0005_check_in_safety',
        fromSchemaVersion: 4,
        toSchemaVersion: 5,
        startedAt: timestamp,
        completedAt: timestamp,
        backupId: null,
        status: 'completed',
        checksum: migrations[4]?.checksum,
        failureReasonCode: null,
      },
    ]);
  });

  it('is idempotent after the latest schema has been applied', async () => {
    await runMigrations(database, migrations, () => timestamp);

    await expect(
      runMigrations(database, migrations, () => timestamp),
    ).resolves.toEqual({
      fromVersion: 5,
      toVersion: 5,
      appliedMigrationIds: [],
    });
    await expect(
      new SQLiteMigrationHistoryRepository(database).list(),
    ).resolves.toHaveLength(5);
  });

  it('rolls back an interrupted migration so startup can retry from the prior version', async () => {
    const interruptedMigration: Migration = {
      ...migrations[0]!,
      checksum: `sha256:${'0'.repeat(64)}`,
      statements: [
        'CREATE TABLE interruption_probe (id INTEGER PRIMARY KEY)',
        'INSERT INTO table_that_does_not_exist (id) VALUES (1)',
      ],
    };

    await expect(
      runMigrations(database, [interruptedMigration], () => timestamp),
    ).rejects.toThrow();

    await expect(
      database.getFirstAsync<{ user_version: number }>('PRAGMA user_version'),
    ).resolves.toEqual({ user_version: 0 });
    await expect(
      database.getFirstAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'interruption_probe'",
      ),
    ).resolves.toBeNull();
    await expect(
      runMigrations(database, migrations, () => timestamp),
    ).resolves.toMatchObject({
      fromVersion: 0,
      toVersion: 5,
    });
  });

  it('stops when the on-device schema is newer than this app supports', async () => {
    await database.execAsync('PRAGMA user_version = 6');

    await expect(
      runMigrations(database, migrations, () => timestamp),
    ).rejects.toMatchObject<Partial<MigrationError>>({
      code: 'database_schema_newer_than_app',
    });
  });

  it('fails closed before a migration that affects owner data can run without a backup', async () => {
    await runMigrations(database, migrations, () => timestamp);
    const ownerDataMigrationStatements = [
      'CREATE TABLE owner_data_probe (id INTEGER PRIMARY KEY)',
    ];
    const ownerDataMigration: Migration = {
      id: '0006_owner_data_probe',
      fromVersion: 5,
      toVersion: 6,
      checksum: checksum(ownerDataMigrationStatements),
      affectsOwnerData: true,
      statements: ownerDataMigrationStatements,
    };

    await expect(
      runMigrations(
        database,
        [...migrations, ownerDataMigration],
        () => timestamp,
      ),
    ).rejects.toMatchObject<Partial<MigrationError>>({
      code: 'database_backup_required',
    });
    await expect(
      database.getFirstAsync<{ user_version: number }>('PRAGMA user_version'),
    ).resolves.toEqual({ user_version: 5 });
    await expect(
      database.getFirstAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'owner_data_probe'",
      ),
    ).resolves.toBeNull();
  });

  it('upgrades an initialized schema-one database without a backup because only new tables are added', async () => {
    await runMigrations(database, [migrations[0]!], () => timestamp);

    await expect(
      runMigrations(database, migrations, () => timestamp),
    ).resolves.toEqual({
      fromVersion: 1,
      toVersion: 5,
      appliedMigrationIds: [
        '0002_user_profile',
        '0003_check_ins',
        '0004_check_in_focus_regions',
        '0005_check_in_safety',
      ],
    });
    await expect(
      database.getFirstAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'user_profiles'",
      ),
    ).resolves.toEqual({ name: 'user_profiles' });
    await expect(
      database.getFirstAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'check_ins'",
      ),
    ).resolves.toEqual({ name: 'check_ins' });
    await expect(
      database.getFirstAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'check_in_focus_regions'",
      ),
    ).resolves.toEqual({ name: 'check_in_focus_regions' });
    await expect(
      database.getFirstAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'check_in_safety_responses'",
      ),
    ).resolves.toEqual({ name: 'check_in_safety_responses' });
  });

  it('adds focus storage to schema three without rewriting existing observations', async () => {
    await runMigrations(database, migrations.slice(0, 3), () => timestamp);
    const profileId = '00000000000000000000000000';
    const checkInId = '00000000000000000000000001';
    await database.runAsync(
      `INSERT INTO user_profiles (
        id, onboarding_completed_at, safety_rules_version,
        safety_acknowledged_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      profileId,
      timestamp,
      'test_rules',
      timestamp,
      timestamp,
      timestamp,
    );
    await database.runAsync(
      `INSERT INTO check_ins (
        id, user_profile_id, observed_at, local_date, time_zone,
        session_mode, available_minutes, readiness, environment,
        capture_status, source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'captured', 'manual', ?, ?)`,
      checkInId,
      profileId,
      timestamp,
      '2026-08-30',
      'Europe/Amsterdam',
      'daily_restore',
      10,
      3,
      'home',
      timestamp,
      timestamp,
    );
    await database.runAsync(
      `INSERT INTO check_in_regions (
        id, check_in_id, region_slug, side, stiffness, soreness, discomfort
      ) VALUES (?, ?, 'wrist', 'right', 4, NULL, NULL)`,
      '00000000000000000000000002',
      checkInId,
    );

    await expect(
      runMigrations(database, migrations.slice(0, 4), () => timestamp),
    ).resolves.toEqual({
      fromVersion: 3,
      toVersion: 4,
      appliedMigrationIds: ['0004_check_in_focus_regions'],
    });
    await expect(
      database.getFirstAsync<{ stiffness: number }>(
        'SELECT stiffness FROM check_in_regions WHERE check_in_id = ?',
        checkInId,
      ),
    ).resolves.toEqual({ stiffness: 4 });
    await expect(
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM check_in_focus_regions',
      ),
    ).resolves.toEqual({ count: 0 });
  });

  it('adds safety storage to schema four without submitting an older capture', async () => {
    await runMigrations(database, migrations.slice(0, 4), () => timestamp);
    const profileId = '00000000000000000000000000';
    const checkInId = '00000000000000000000000001';
    await database.runAsync(
      `INSERT INTO user_profiles (
        id, onboarding_completed_at, safety_rules_version,
        safety_acknowledged_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      profileId,
      timestamp,
      'test_rules',
      timestamp,
      timestamp,
      timestamp,
    );
    await database.runAsync(
      `INSERT INTO check_ins (
        id, user_profile_id, observed_at, local_date, time_zone,
        session_mode, available_minutes, environment,
        capture_status, source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'daily_restore', 10, 'home',
        'captured', 'manual', ?, ?)`,
      checkInId,
      profileId,
      timestamp,
      '2026-08-30',
      'Europe/Amsterdam',
      timestamp,
      timestamp,
    );

    await expect(
      runMigrations(database, migrations, () => timestamp),
    ).resolves.toEqual({
      fromVersion: 4,
      toVersion: 5,
      appliedMigrationIds: ['0005_check_in_safety'],
    });
    await expect(
      database.getFirstAsync<{
        capture_status: string;
        safety_rule_ids_json: string | null;
      }>(
        'SELECT capture_status, safety_rule_ids_json FROM check_ins WHERE id = ?',
        checkInId,
      ),
    ).resolves.toEqual({
      capture_status: 'captured',
      safety_rule_ids_json: null,
    });
    await expect(
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM check_in_safety_responses',
      ),
    ).resolves.toEqual({ count: 0 });
  });

  it('rejects a non-contiguous or modified migration catalog before applying SQL', async () => {
    const invalidMigration: Migration = {
      ...migrations[0]!,
      fromVersion: 1,
      toVersion: 2,
    };

    await expect(
      runMigrations(database, [invalidMigration], () => timestamp),
    ).rejects.toMatchObject<Partial<MigrationError>>({
      code: 'database_invalid_migration_catalog',
    });
    await expect(
      database.getFirstAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_metadata'",
      ),
    ).resolves.toBeNull();
  });
});
