import type { Migration } from '@/db/migrations/types';

export const checkInsMigration: Migration = {
  id: '0003_check_ins',
  fromVersion: 2,
  toVersion: 3,
  checksum:
    'sha256:e56c3a2004320dda75764e2ca7a3dbb4a6402e9e3a0bbb2da886015c7d5cbcac',
  affectsOwnerData: false,
  statements: [
    `CREATE TABLE training_sessions (
      id TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 26),
      user_profile_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
      local_date TEXT NOT NULL CHECK (length(local_date) = 10),
      started_at TEXT,
      ended_at TEXT,
      training_type TEXT NOT NULL CHECK (training_type IN ('pull', 'push', 'legs', 'planche', 'front_lever', 'handstand', 'mixed_skills', 'weighted_strength', 'running', 'rest')),
      status TEXT NOT NULL CHECK (status IN ('planned', 'completed', 'skipped', 'changed')),
      stress INTEGER CHECK (stress IS NULL OR stress BETWEEN 1 AND 5),
      source TEXT NOT NULL CHECK (source = 'manual'),
      supersedes_training_session_id TEXT REFERENCES training_sessions(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT`,
    `CREATE TABLE check_ins (
      id TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 26),
      user_profile_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
      observed_at TEXT NOT NULL,
      local_date TEXT NOT NULL CHECK (length(local_date) = 10),
      time_zone TEXT NOT NULL CHECK (length(time_zone) > 0),
      session_mode TEXT NOT NULL CHECK (session_mode IN ('daily_restore', 'morning_primer', 'pre_workout_prep', 'post_workout_reset', 'desk_rescue', 'night_downshift', 'targeted_area', 'pain_aware_gentle', 'deep_restoration', 'gym', 'skill_prep', 'recovery_day', 'emergency_reset')),
      available_minutes INTEGER NOT NULL CHECK (available_minutes BETWEEN 2 AND 90),
      readiness INTEGER CHECK (readiness IS NULL OR readiness BETWEEN 1 AND 5),
      environment TEXT NOT NULL CHECK (environment IN ('home', 'desk', 'gym', 'travel', 'custom')),
      planned_training_session_id TEXT REFERENCES training_sessions(id),
      completed_training_session_id TEXT REFERENCES training_sessions(id),
      note TEXT CHECK (note IS NULL OR length(note) <= 1000),
      capture_status TEXT NOT NULL CHECK (capture_status IN ('captured', 'submitted')),
      safety_result TEXT CHECK (safety_result IS NULL OR safety_result IN ('clear', 'gentle_only', 'blocked')),
      safety_rules_version TEXT,
      safety_reason_codes_json TEXT CHECK (safety_reason_codes_json IS NULL OR json_valid(safety_reason_codes_json)),
      source TEXT NOT NULL CHECK (source IN ('manual', 'correction', 'import')),
      supersedes_check_in_id TEXT REFERENCES check_ins(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK (planned_training_session_id IS NULL OR completed_training_session_id IS NULL),
      CHECK (
        (capture_status = 'captured' AND safety_result IS NULL AND safety_rules_version IS NULL AND safety_reason_codes_json IS NULL) OR
        (capture_status = 'submitted' AND safety_result IS NOT NULL AND safety_rules_version IS NOT NULL AND safety_reason_codes_json IS NOT NULL)
      )
    ) STRICT`,
    `CREATE TABLE check_in_equipment (
      id TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 26),
      check_in_id TEXT NOT NULL REFERENCES check_ins(id) ON DELETE CASCADE,
      equipment_id TEXT NOT NULL,
      UNIQUE (check_in_id, equipment_id)
    ) STRICT`,
    `CREATE TABLE check_in_regions (
      id TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 26),
      check_in_id TEXT NOT NULL REFERENCES check_ins(id) ON DELETE CASCADE,
      region_slug TEXT NOT NULL,
      side TEXT NOT NULL CHECK (side IN ('central', 'left', 'right', 'bilateral')),
      stiffness INTEGER CHECK (stiffness IS NULL OR stiffness BETWEEN 0 AND 10),
      soreness INTEGER CHECK (soreness IS NULL OR soreness BETWEEN 0 AND 10),
      discomfort INTEGER CHECK (discomfort IS NULL OR discomfort BETWEEN 0 AND 10),
      CHECK (stiffness IS NOT NULL OR soreness IS NOT NULL OR discomfort IS NOT NULL),
      UNIQUE (check_in_id, region_slug, side)
    ) STRICT`,
    `CREATE INDEX training_sessions_profile_date_idx
      ON training_sessions(user_profile_id, local_date DESC)`,
    `CREATE INDEX check_ins_profile_observed_idx
      ON check_ins(user_profile_id, observed_at DESC)`,
    `CREATE INDEX check_in_equipment_check_in_idx
      ON check_in_equipment(check_in_id)`,
    `CREATE INDEX check_in_regions_check_in_idx
      ON check_in_regions(check_in_id)`,
    `CREATE TRIGGER prevent_submitted_check_in_update
      BEFORE UPDATE ON check_ins
      WHEN OLD.capture_status = 'submitted'
      BEGIN
        SELECT RAISE(ABORT, 'submitted_check_in_immutable');
      END`,
    `CREATE TRIGGER prevent_submitted_check_in_equipment_insert
      BEFORE INSERT ON check_in_equipment
      WHEN EXISTS (
        SELECT 1 FROM check_ins
        WHERE id = NEW.check_in_id AND capture_status = 'submitted'
      )
      BEGIN
        SELECT RAISE(ABORT, 'submitted_check_in_immutable');
      END`,
    `CREATE TRIGGER prevent_submitted_check_in_equipment_update
      BEFORE UPDATE ON check_in_equipment
      WHEN EXISTS (
        SELECT 1 FROM check_ins
        WHERE id IN (OLD.check_in_id, NEW.check_in_id) AND capture_status = 'submitted'
      )
      BEGIN
        SELECT RAISE(ABORT, 'submitted_check_in_immutable');
      END`,
    `CREATE TRIGGER prevent_submitted_check_in_equipment_delete
      BEFORE DELETE ON check_in_equipment
      WHEN EXISTS (
        SELECT 1 FROM check_ins
        WHERE id = OLD.check_in_id AND capture_status = 'submitted'
      )
      BEGIN
        SELECT RAISE(ABORT, 'submitted_check_in_immutable');
      END`,
    `CREATE TRIGGER prevent_submitted_check_in_region_insert
      BEFORE INSERT ON check_in_regions
      WHEN EXISTS (
        SELECT 1 FROM check_ins
        WHERE id = NEW.check_in_id AND capture_status = 'submitted'
      )
      BEGIN
        SELECT RAISE(ABORT, 'submitted_check_in_immutable');
      END`,
    `CREATE TRIGGER prevent_submitted_check_in_region_update
      BEFORE UPDATE ON check_in_regions
      WHEN EXISTS (
        SELECT 1 FROM check_ins
        WHERE id IN (OLD.check_in_id, NEW.check_in_id) AND capture_status = 'submitted'
      )
      BEGIN
        SELECT RAISE(ABORT, 'submitted_check_in_immutable');
      END`,
    `CREATE TRIGGER prevent_submitted_check_in_region_delete
      BEFORE DELETE ON check_in_regions
      WHEN EXISTS (
        SELECT 1 FROM check_ins
        WHERE id = OLD.check_in_id AND capture_status = 'submitted'
      )
      BEGIN
        SELECT RAISE(ABORT, 'submitted_check_in_immutable');
      END`,
    `CREATE TRIGGER prevent_submitted_check_in_training_update
      BEFORE UPDATE ON training_sessions
      WHEN EXISTS (
        SELECT 1 FROM check_ins
        WHERE capture_status = 'submitted'
          AND (planned_training_session_id = OLD.id OR completed_training_session_id = OLD.id)
      )
      BEGIN
        SELECT RAISE(ABORT, 'submitted_check_in_immutable');
      END`,
    `CREATE TRIGGER prevent_submitted_check_in_training_delete
      BEFORE DELETE ON training_sessions
      WHEN EXISTS (
        SELECT 1 FROM check_ins
        WHERE capture_status = 'submitted'
          AND (planned_training_session_id = OLD.id OR completed_training_session_id = OLD.id)
      )
      BEGIN
        SELECT RAISE(ABORT, 'submitted_check_in_immutable');
      END`,
  ],
};
