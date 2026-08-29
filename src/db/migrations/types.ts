export interface Migration {
  readonly id: string;
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly checksum: string;
  readonly affectsOwnerData: boolean;
  readonly statements: readonly string[];
}

export type MigrationErrorCode =
  | 'database_backup_required'
  | 'database_invalid_migration_catalog'
  | 'database_migration_path_missing'
  | 'database_schema_newer_than_app';

export class MigrationError extends Error {
  public constructor(
    public readonly code: MigrationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

export interface MigrationResult {
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly appliedMigrationIds: readonly string[];
}
