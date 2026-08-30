import type { Migration } from '@/db/migrations/types';

export const exerciseLibraryMigration: Migration = {
  id: '0006_exercise_library',
  fromVersion: 5,
  toVersion: 6,
  checksum:
    'sha256:1cf7ee0154ef804c8cc46fc45b40853ed033fb04577135c74bc62107de7817bd',
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
      id TEXT PRIMARY KEY CHECK (length(id) > 0),
      user_profile_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL CHECK (length(exercise_id) > 0),
      favorite INTEGER NOT NULL DEFAULT 0 CHECK (favorite IN (0, 1)),
      avoid_state TEXT NOT NULL DEFAULT 'none' CHECK (
        avoid_state IN ('none', 'temporary', 'permanent')
      ),
      avoid_until TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (user_profile_id, exercise_id),
      CHECK (
        (avoid_state = 'temporary' AND avoid_until IS NOT NULL)
        OR (avoid_state != 'temporary' AND avoid_until IS NULL)
      )
    ) STRICT`,
    `CREATE INDEX exercises_content_version_status
      ON exercises(content_version, review_status, name)`,
    `CREATE INDEX exercise_preferences_preference
      ON exercise_preferences(user_profile_id, favorite, avoid_state)`,
  ],
};
