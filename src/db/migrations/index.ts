import { schemaLifecycleMigration } from '@/db/migrations/0001-schema-lifecycle';
import { userProfileMigration } from '@/db/migrations/0002-user-profile';
import type { Migration } from '@/db/migrations/types';

export const migrations: readonly Migration[] = [
  schemaLifecycleMigration,
  userProfileMigration,
];

export const latestSchemaVersion = userProfileMigration.toVersion;
