import { schemaLifecycleMigration } from '@/db/migrations/0001-schema-lifecycle';
import type { Migration } from '@/db/migrations/types';

export const migrations: readonly Migration[] = [schemaLifecycleMigration];

export const latestSchemaVersion = schemaLifecycleMigration.toVersion;
