import { schemaLifecycleMigration } from '@/db/migrations/0001-schema-lifecycle';
import { userProfileMigration } from '@/db/migrations/0002-user-profile';
import { checkInsMigration } from '@/db/migrations/0003-check-ins';
import { checkInFocusRegionsMigration } from '@/db/migrations/0004-check-in-focus-regions';
import { checkInSafetyMigration } from '@/db/migrations/0005-check-in-safety';
import { exerciseLibraryMigration } from '@/db/migrations/0006-exercise-library';
import type { Migration } from '@/db/migrations/types';

export const migrations: readonly Migration[] = [
  schemaLifecycleMigration,
  userProfileMigration,
  checkInsMigration,
  checkInFocusRegionsMigration,
  checkInSafetyMigration,
  exerciseLibraryMigration,
];

export const latestSchemaVersion = exerciseLibraryMigration.toVersion;
