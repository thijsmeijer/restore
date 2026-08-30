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
      schemaVersion: 2,
      migrationState: 'idle',
      lastIntegrityResult: 'ok',
      updatedAt: timestamp,
    });
  });

  it('migrates the schema-version-zero fixture and exposes typed lifecycle repositories', async () => {
    const result = await runMigrations(database, migrations, () => timestamp);

    expect(result).toEqual({
      fromVersion: 0,
      toVersion: 2,
      appliedMigrationIds: ['0001_schema_lifecycle', '0002_user_profile'],
    });
    await expect(
      new SQLiteSchemaMetadataRepository(database).get(),
    ).resolves.toEqual({
      schemaVersion: 2,
      contentVersion: null,
      migrationState: 'idle',
      lastSuccessfulMigrationId: '0002_user_profile',
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
    ]);
  });

  it('is idempotent after the latest schema has been applied', async () => {
    await runMigrations(database, migrations, () => timestamp);

    await expect(
      runMigrations(database, migrations, () => timestamp),
    ).resolves.toEqual({
      fromVersion: 2,
      toVersion: 2,
      appliedMigrationIds: [],
    });
    await expect(
      new SQLiteMigrationHistoryRepository(database).list(),
    ).resolves.toHaveLength(2);
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
      toVersion: 2,
    });
  });

  it('stops when the on-device schema is newer than this app supports', async () => {
    await database.execAsync('PRAGMA user_version = 3');

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
      id: '0003_owner_data_probe',
      fromVersion: 2,
      toVersion: 3,
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
    ).resolves.toEqual({ user_version: 2 });
    await expect(
      database.getFirstAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'owner_data_probe'",
      ),
    ).resolves.toBeNull();
  });

  it('upgrades an initialized schema-one database without a backup because only new profile tables are added', async () => {
    await runMigrations(database, [migrations[0]!], () => timestamp);

    await expect(
      runMigrations(database, migrations, () => timestamp),
    ).resolves.toEqual({
      fromVersion: 1,
      toVersion: 2,
      appliedMigrationIds: ['0002_user_profile'],
    });
    await expect(
      database.getFirstAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'user_profiles'",
      ),
    ).resolves.toEqual({ name: 'user_profiles' });
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
