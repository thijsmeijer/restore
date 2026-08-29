import type { DatabaseExecutor } from '@/db/database';

export type MigrationHistoryStatus =
  'started' | 'completed' | 'failed' | 'recovery_required';

export interface MigrationHistoryEntry {
  readonly migrationId: string;
  readonly fromSchemaVersion: number;
  readonly toSchemaVersion: number;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly backupId: string | null;
  readonly status: MigrationHistoryStatus;
  readonly checksum: string;
  readonly failureReasonCode: string | null;
}

interface MigrationHistoryRow {
  readonly migration_id: string;
  readonly from_schema_version: number;
  readonly to_schema_version: number;
  readonly started_at: string;
  readonly completed_at: string | null;
  readonly backup_id: string | null;
  readonly status: MigrationHistoryStatus;
  readonly checksum: string;
  readonly failure_reason_code: string | null;
}

export interface MigrationHistoryRepository {
  list(): Promise<readonly MigrationHistoryEntry[]>;
}

export class SQLiteMigrationHistoryRepository implements MigrationHistoryRepository {
  public constructor(private readonly database: DatabaseExecutor) {}

  public async list(): Promise<readonly MigrationHistoryEntry[]> {
    const rows = await this.database.getAllAsync<MigrationHistoryRow>(
      `SELECT
        migration_id,
        from_schema_version,
        to_schema_version,
        started_at,
        completed_at,
        backup_id,
        status,
        checksum,
        failure_reason_code
      FROM migration_history
      ORDER BY to_schema_version ASC`,
    );

    return rows.map((row) => ({
      migrationId: row.migration_id,
      fromSchemaVersion: row.from_schema_version,
      toSchemaVersion: row.to_schema_version,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      backupId: row.backup_id,
      status: row.status,
      checksum: row.checksum,
      failureReasonCode: row.failure_reason_code,
    }));
  }
}
