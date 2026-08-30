import type { Migration } from '@/db/migrations/types';

export const userProfileMigration: Migration = {
  id: '0002_user_profile',
  fromVersion: 1,
  toVersion: 2,
  checksum:
    'sha256:f595caaef1d522f9dd18c32fefd0d51ef8cb2d40ff39fb5068910c32728a5b23',
  affectsOwnerData: false,
  statements: [
    `CREATE TABLE user_profiles (
      id TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 26),
      owner_slot INTEGER NOT NULL DEFAULT 1 UNIQUE CHECK (owner_slot = 1),
      preferred_quick_minutes INTEGER CHECK (preferred_quick_minutes IS NULL OR preferred_quick_minutes BETWEEN 2 AND 90),
      preferred_normal_minutes INTEGER CHECK (preferred_normal_minutes IS NULL OR preferred_normal_minutes BETWEEN 2 AND 90),
      preferred_deep_minutes INTEGER CHECK (preferred_deep_minutes IS NULL OR preferred_deep_minutes BETWEEN 2 AND 90),
      units TEXT CHECK (units IS NULL OR units IN ('metric', 'imperial')),
      coaching_preference TEXT CHECK (coaching_preference IS NULL OR coaching_preference IN ('silent', 'minimal', 'normal', 'detailed')),
      onboarding_completed_at TEXT NOT NULL,
      safety_rules_version TEXT NOT NULL,
      safety_acknowledged_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK (
        preferred_quick_minutes IS NULL OR
        preferred_normal_minutes IS NULL OR
        preferred_quick_minutes <= preferred_normal_minutes
      ),
      CHECK (
        preferred_normal_minutes IS NULL OR
        preferred_deep_minutes IS NULL OR
        preferred_normal_minutes <= preferred_deep_minutes
      )
    ) STRICT`,
    `CREATE TABLE profile_goals (
      id TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 26),
      user_profile_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
      goal_slug TEXT NOT NULL CHECK (goal_slug IN ('move_better', 'reduce_stiffness', 'prepare_for_calisthenics', 'improve_posture', 'wind_down', 'maintain_joints')),
      sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
      UNIQUE (user_profile_id, goal_slug),
      UNIQUE (user_profile_id, sort_order)
    ) STRICT`,
    `CREATE TABLE profile_body_regions (
      id TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 26),
      user_profile_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
      region_slug TEXT NOT NULL,
      side TEXT NOT NULL CHECK (side IN ('central', 'left', 'right', 'bilateral')),
      UNIQUE (user_profile_id, region_slug)
    ) STRICT`,
    `CREATE TABLE user_equipment (
      id TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 26),
      user_profile_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
      equipment_id TEXT NOT NULL,
      environment TEXT NOT NULL CHECK (environment IN ('home', 'desk', 'gym', 'travel', 'custom')),
      available INTEGER NOT NULL CHECK (available IN (0, 1)),
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (user_profile_id, equipment_id, environment)
    ) STRICT`,
    `CREATE TABLE profile_training_split (
      id TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 26),
      user_profile_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
      training_type TEXT NOT NULL CHECK (training_type IN ('pull', 'push', 'legs', 'planche', 'front_lever', 'handstand', 'mixed_skills', 'weighted_strength', 'running', 'rest')),
      sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
      UNIQUE (user_profile_id, training_type),
      UNIQUE (user_profile_id, sort_order)
    ) STRICT`,
    `CREATE INDEX profile_body_regions_profile_idx
      ON profile_body_regions(user_profile_id)`,
    `CREATE INDEX user_equipment_profile_idx
      ON user_equipment(user_profile_id)`,
    `CREATE INDEX profile_training_split_profile_idx
      ON profile_training_split(user_profile_id)`,
  ],
};
