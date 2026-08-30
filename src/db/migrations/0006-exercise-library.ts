import type { Migration } from '@/db/migrations/types';

export const exerciseLibraryMigration: Migration = {
  id: '0006_exercise_library',
  fromVersion: 5,
  toVersion: 6,
  checksum:
    'sha256:22fe266d9821baa99b2b68e6dac3aca16a6b398a357ca652a74be5e8ec143889',
  affectsOwnerData: false,
  statements: [
    `CREATE TABLE content_packs (
      content_version TEXT PRIMARY KEY CHECK (length(content_version) > 0),
      schema_version INTEGER NOT NULL CHECK (schema_version > 0),
      created_at TEXT NOT NULL,
      review_status TEXT NOT NULL CHECK (
        review_status IN ('draft', 'engineering_reviewed', 'clinical_reviewed', 'retired')
      ),
      checksum TEXT NOT NULL CHECK (length(checksum) > 0),
      manifest_json TEXT NOT NULL CHECK (json_valid(manifest_json)),
      import_source TEXT NOT NULL CHECK (import_source = 'bundled'),
      installed_at TEXT NOT NULL
    ) STRICT`,
    `CREATE TABLE exercises (
      exercise_id TEXT NOT NULL CHECK (length(exercise_id) > 0),
      version INTEGER NOT NULL CHECK (version > 0),
      content_version TEXT NOT NULL REFERENCES content_packs(content_version),
      slug TEXT NOT NULL CHECK (length(slug) > 0),
      review_status TEXT NOT NULL CHECK (
        review_status IN ('draft', 'engineering_reviewed', 'clinical_reviewed', 'retired')
      ),
      name TEXT NOT NULL CHECK (length(name) > 0),
      summary TEXT NOT NULL CHECK (length(summary) > 0),
      payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
      PRIMARY KEY (exercise_id, version),
      UNIQUE (slug, version)
    ) STRICT`,
    `CREATE TABLE exercise_preferences (
      user_profile_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL CHECK (length(exercise_id) > 0),
      preference TEXT NOT NULL CHECK (preference IN ('favorite', 'avoided')),
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_profile_id, exercise_id)
    ) STRICT`,
    `CREATE INDEX exercises_content_version_status
      ON exercises(content_version, review_status, name)`,
    `CREATE INDEX exercise_preferences_preference
      ON exercise_preferences(user_profile_id, preference)`,
  ],
};
