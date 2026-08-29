import type { Migration } from '@/db/migrations/types';

export const schemaLifecycleMigration: Migration = {
  id: '0001_schema_lifecycle',
  fromVersion: 0,
  toVersion: 1,
  checksum:
    'sha256:1d14af60e1fd12995d5cff36e56b90a6615e1e50029c89195ad372eef35eec6e',
  affectsOwnerData: false,
  statements: [
    `CREATE TABLE schema_metadata (
      id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
      schema_version INTEGER NOT NULL CHECK (schema_version >= 0),
      content_version TEXT,
      migration_state TEXT NOT NULL CHECK (migration_state IN ('idle', 'migrating', 'recovery_required')),
      last_successful_migration_id TEXT,
      last_migrated_at TEXT,
      last_successful_backup_id TEXT,
      last_successful_backup_checksum TEXT,
      last_successful_backup_at TEXT,
      last_import_schema_version INTEGER CHECK (last_import_schema_version IS NULL OR last_import_schema_version >= 0),
      last_export_schema_version INTEGER CHECK (last_export_schema_version IS NULL OR last_export_schema_version >= 0),
      last_integrity_result TEXT,
      updated_at TEXT NOT NULL
    ) STRICT`,
    `CREATE TABLE migration_history (
      migration_id TEXT PRIMARY KEY NOT NULL,
      from_schema_version INTEGER NOT NULL CHECK (from_schema_version >= 0),
      to_schema_version INTEGER NOT NULL CHECK (to_schema_version > from_schema_version),
      started_at TEXT NOT NULL,
      completed_at TEXT,
      backup_id TEXT,
      status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'recovery_required')),
      checksum TEXT NOT NULL,
      failure_reason_code TEXT,
      CHECK (
        (status = 'completed' AND completed_at IS NOT NULL AND failure_reason_code IS NULL) OR
        (status <> 'completed')
      )
    ) STRICT`,
  ],
};
