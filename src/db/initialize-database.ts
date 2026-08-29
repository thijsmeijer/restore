import type { SQLiteDatabase } from 'expo-sqlite';

import type { DatabaseConnection } from '@/db/database';
import { ExpoSQLiteConnection } from '@/db/expo-sqlite-adapter';
import { migrations } from '@/db/migrations';
import { runMigrations } from '@/db/migrations/runner';

interface ForeignKeysRow {
  readonly foreign_keys: number;
}

interface IntegrityCheckRow {
  readonly quick_check: string;
}

export type DatabaseInitializationErrorCode =
  'database_foreign_keys_disabled' | 'database_integrity_check_failed';

export class DatabaseInitializationError extends Error {
  public constructor(
    public readonly code: DatabaseInitializationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DatabaseInitializationError';
  }
}

export async function initializeDatabaseConnection(
  connection: DatabaseConnection,
  now: () => string = () => new Date().toISOString(),
): Promise<void> {
  await connection.execAsync(
    'PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;',
  );

  const foreignKeys = await connection.getFirstAsync<ForeignKeysRow>(
    'PRAGMA foreign_keys',
  );
  if (foreignKeys?.foreign_keys !== 1) {
    throw new DatabaseInitializationError(
      'database_foreign_keys_disabled',
      'SQLite foreign-key enforcement could not be enabled.',
    );
  }

  await runMigrations(connection, migrations, now);

  const integrity =
    await connection.getFirstAsync<IntegrityCheckRow>('PRAGMA quick_check');
  if (integrity?.quick_check !== 'ok') {
    throw new DatabaseInitializationError(
      'database_integrity_check_failed',
      'SQLite integrity verification failed after initialization.',
    );
  }

  await connection.runAsync(
    `UPDATE schema_metadata
    SET last_integrity_result = 'ok', updated_at = ?
    WHERE id = 1`,
    now(),
  );
}

export function initializeDatabase(database: SQLiteDatabase): Promise<void> {
  return initializeDatabaseConnection(new ExpoSQLiteConnection(database));
}
