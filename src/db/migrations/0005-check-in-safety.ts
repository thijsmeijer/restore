import type { Migration } from '@/db/migrations/types';

export const checkInSafetyMigration: Migration = {
  id: '0005_check_in_safety',
  fromVersion: 4,
  toVersion: 5,
  checksum:
    'sha256:a0125fb2287843a0ef49cd66d9433b7d26de03cb942b22e2e46d93a02d434723',
  affectsOwnerData: false,
  statements: [
    `ALTER TABLE check_ins ADD COLUMN safety_rule_ids_json TEXT
      CHECK (safety_rule_ids_json IS NULL OR json_valid(safety_rule_ids_json))`,
    `CREATE TABLE check_in_safety_responses (
      check_in_id TEXT NOT NULL REFERENCES check_ins(id) ON DELETE CASCADE,
      signal_id TEXT NOT NULL CHECK (length(signal_id) > 0),
      reported INTEGER NOT NULL CHECK (reported IN (0, 1)),
      rule_order INTEGER NOT NULL CHECK (rule_order >= 0),
      PRIMARY KEY (check_in_id, signal_id),
      UNIQUE (check_in_id, rule_order)
    ) STRICT`,
    `CREATE TRIGGER prevent_submitted_check_in_safety_response_insert
      BEFORE INSERT ON check_in_safety_responses
      WHEN EXISTS (
        SELECT 1 FROM check_ins
        WHERE id = NEW.check_in_id AND capture_status = 'submitted'
      )
      BEGIN
        SELECT RAISE(ABORT, 'submitted_check_in_immutable');
      END`,
    `CREATE TRIGGER prevent_submitted_check_in_safety_response_update
      BEFORE UPDATE ON check_in_safety_responses
      WHEN EXISTS (
        SELECT 1 FROM check_ins
        WHERE id IN (OLD.check_in_id, NEW.check_in_id) AND capture_status = 'submitted'
      )
      BEGIN
        SELECT RAISE(ABORT, 'submitted_check_in_immutable');
      END`,
    `CREATE TRIGGER prevent_submitted_check_in_safety_response_delete
      BEFORE DELETE ON check_in_safety_responses
      WHEN EXISTS (
        SELECT 1 FROM check_ins
        WHERE id = OLD.check_in_id AND capture_status = 'submitted'
      )
      BEGIN
        SELECT RAISE(ABORT, 'submitted_check_in_immutable');
      END`,
  ],
};
