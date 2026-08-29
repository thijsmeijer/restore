import type { DatabaseConnection, DatabaseExecutor } from '@/db/database';
import type { Migration, MigrationResult } from '@/db/migrations/types';
import { MigrationError } from '@/db/migrations/types';

interface UserVersionRow {
  readonly user_version: number;
}

export type MigrationClock = () => string;

function validateVersion(version: number): boolean {
  return Number.isSafeInteger(version) && version >= 0;
}

function validateMigrationCatalog(migrations: readonly Migration[]): void {
  let expectedVersion = 0;
  const ids = new Set<string>();

  for (const migration of migrations) {
    const valid =
      migration.id.length > 0 &&
      !ids.has(migration.id) &&
      migration.fromVersion === expectedVersion &&
      validateVersion(migration.toVersion) &&
      migration.toVersion === migration.fromVersion + 1 &&
      /^sha256:[a-f0-9]{64}$/.test(migration.checksum) &&
      migration.statements.length > 0;

    if (!valid) {
      throw new MigrationError(
        'database_invalid_migration_catalog',
        `Invalid migration catalog entry: ${migration.id || '<missing id>'}`,
      );
    }

    ids.add(migration.id);
    expectedVersion = migration.toVersion;
  }
}

async function readUserVersion(database: DatabaseExecutor): Promise<number> {
  const row = await database.getFirstAsync<UserVersionRow>(
    'PRAGMA user_version',
  );
  const version = row?.user_version;

  if (typeof version !== 'number' || !validateVersion(version)) {
    throw new MigrationError(
      'database_invalid_migration_catalog',
      'SQLite returned an invalid schema version.',
    );
  }

  return version;
}

async function applyMigration(
  database: DatabaseConnection,
  migration: Migration,
  now: MigrationClock,
): Promise<void> {
  if (migration.affectsOwnerData) {
    throw new MigrationError(
      'database_backup_required',
      `Migration ${migration.id} requires the pre-migration backup protocol.`,
    );
  }

  const startedAt = now();

  await database.withExclusiveTransactionAsync(async (transaction) => {
    for (const statement of migration.statements) {
      await transaction.execAsync(statement);
    }

    const completedAt = now();
    await transaction.runAsync(
      `INSERT INTO migration_history (
        migration_id,
        from_schema_version,
        to_schema_version,
        started_at,
        completed_at,
        backup_id,
        status,
        checksum,
        failure_reason_code
      ) VALUES (?, ?, ?, ?, ?, NULL, 'completed', ?, NULL)`,
      migration.id,
      migration.fromVersion,
      migration.toVersion,
      startedAt,
      completedAt,
      migration.checksum,
    );
    await transaction.runAsync(
      `INSERT INTO schema_metadata (
        id,
        schema_version,
        content_version,
        migration_state,
        last_successful_migration_id,
        last_migrated_at,
        updated_at
      ) VALUES (1, ?, NULL, 'idle', ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        schema_version = excluded.schema_version,
        migration_state = 'idle',
        last_successful_migration_id = excluded.last_successful_migration_id,
        last_migrated_at = excluded.last_migrated_at,
        updated_at = excluded.updated_at`,
      migration.toVersion,
      migration.id,
      completedAt,
      completedAt,
    );
    await transaction.execAsync(`PRAGMA user_version = ${migration.toVersion}`);
  });
}

export async function runMigrations(
  database: DatabaseConnection,
  migrations: readonly Migration[],
  now: MigrationClock = () => new Date().toISOString(),
): Promise<MigrationResult> {
  validateMigrationCatalog(migrations);

  const fromVersion = await readUserVersion(database);
  const latestVersion = migrations.at(-1)?.toVersion ?? 0;

  if (fromVersion > latestVersion) {
    throw new MigrationError(
      'database_schema_newer_than_app',
      `Database schema ${fromVersion} is newer than supported schema ${latestVersion}.`,
    );
  }

  let currentVersion = fromVersion;
  const appliedMigrationIds: string[] = [];

  for (const migration of migrations) {
    if (migration.fromVersion < currentVersion) {
      continue;
    }

    if (migration.fromVersion !== currentVersion) {
      throw new MigrationError(
        'database_migration_path_missing',
        `No migration path exists from schema ${currentVersion}.`,
      );
    }

    await applyMigration(database, migration, now);
    currentVersion = migration.toVersion;
    appliedMigrationIds.push(migration.id);
  }

  if (currentVersion !== latestVersion) {
    throw new MigrationError(
      'database_migration_path_missing',
      `No migration path exists from schema ${currentVersion} to ${latestVersion}.`,
    );
  }

  return {
    fromVersion,
    toVersion: currentVersion,
    appliedMigrationIds,
  };
}
