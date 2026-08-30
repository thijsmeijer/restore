import type { Migration } from '@/db/migrations/types';

export const exercisePreferenceStatesMigration: Migration = {
  id: '0007_exercise_preference_states',
  fromVersion: 6,
  toVersion: 7,
  checksum:
    'sha256:fba2ecd49365c4d435404e3063bc5e6dcf862557aaaad60b34bb617be202414f',
  affectsOwnerData: false,
  statements: [
    `CREATE TABLE exercise_preference_states (
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
    `CREATE INDEX exercise_preference_states_lookup
      ON exercise_preference_states(user_profile_id, favorite, avoid_state)`,
  ],
};
