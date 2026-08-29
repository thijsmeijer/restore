import type { DatabaseExecutor } from '@/db/database';

export type MigrationState = 'idle' | 'migrating' | 'recovery_required';

export interface SchemaMetadata {
  readonly schemaVersion: number;
  readonly contentVersion: string | null;
  readonly migrationState: MigrationState;
  readonly lastSuccessfulMigrationId: string | null;
  readonly lastMigratedAt: string | null;
  readonly lastSuccessfulBackupId: string | null;
  readonly lastSuccessfulBackupChecksum: string | null;
  readonly lastSuccessfulBackupAt: string | null;
  readonly lastImportSchemaVersion: number | null;
  readonly lastExportSchemaVersion: number | null;
  readonly lastIntegrityResult: string | null;
  readonly updatedAt: string;
}

interface SchemaMetadataRow {
  readonly schema_version: number;
  readonly content_version: string | null;
  readonly migration_state: MigrationState;
  readonly last_successful_migration_id: string | null;
  readonly last_migrated_at: string | null;
  readonly last_successful_backup_id: string | null;
  readonly last_successful_backup_checksum: string | null;
  readonly last_successful_backup_at: string | null;
  readonly last_import_schema_version: number | null;
  readonly last_export_schema_version: number | null;
  readonly last_integrity_result: string | null;
  readonly updated_at: string;
}

export interface SchemaMetadataRepository {
  get(): Promise<SchemaMetadata>;
}

export class SQLiteSchemaMetadataRepository implements SchemaMetadataRepository {
  public constructor(private readonly database: DatabaseExecutor) {}

  public async get(): Promise<SchemaMetadata> {
    const row = await this.database.getFirstAsync<SchemaMetadataRow>(
      `SELECT
        schema_version,
        content_version,
        migration_state,
        last_successful_migration_id,
        last_migrated_at,
        last_successful_backup_id,
        last_successful_backup_checksum,
        last_successful_backup_at,
        last_import_schema_version,
        last_export_schema_version,
        last_integrity_result,
        updated_at
      FROM schema_metadata
      WHERE id = 1`,
    );

    if (row === null) {
      throw new Error(
        'Schema metadata is missing after database initialization.',
      );
    }

    return {
      schemaVersion: row.schema_version,
      contentVersion: row.content_version,
      migrationState: row.migration_state,
      lastSuccessfulMigrationId: row.last_successful_migration_id,
      lastMigratedAt: row.last_migrated_at,
      lastSuccessfulBackupId: row.last_successful_backup_id,
      lastSuccessfulBackupChecksum: row.last_successful_backup_checksum,
      lastSuccessfulBackupAt: row.last_successful_backup_at,
      lastImportSchemaVersion: row.last_import_schema_version,
      lastExportSchemaVersion: row.last_export_schema_version,
      lastIntegrityResult: row.last_integrity_result,
      updatedAt: row.updated_at,
    };
  }
}
