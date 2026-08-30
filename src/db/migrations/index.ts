import { schemaLifecycleMigration } from '@/db/migrations/0001-schema-lifecycle';
import { userProfileMigration } from '@/db/migrations/0002-user-profile';
import { checkInsMigration } from '@/db/migrations/0003-check-ins';
import type { Migration } from '@/db/migrations/types';

export const migrations: readonly Migration[] = [
  schemaLifecycleMigration,
  userProfileMigration,
  checkInsMigration,
];

export const latestSchemaVersion = checkInsMigration.toVersion;
