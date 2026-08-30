import type { Migration } from '@/db/migrations/types';

export const checkInFocusRegionsMigration: Migration = {
  id: '0004_check_in_focus_regions',
  fromVersion: 3,
  toVersion: 4,
  checksum:
    'sha256:485e7c50efa56611e2a0267f23ffa58041d114a89f823679e2538f016777d640',
  affectsOwnerData: false,
  statements: [
    `CREATE TABLE check_in_focus_regions (
      id TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 26),
      check_in_id TEXT NOT NULL REFERENCES check_ins(id) ON DELETE CASCADE,
      region_slug TEXT NOT NULL,
      side TEXT NOT NULL CHECK (side IN ('central', 'left', 'right', 'bilateral')),
      UNIQUE (check_in_id, region_slug, side)
    ) STRICT`,
    `CREATE INDEX check_in_focus_regions_check_in_idx
      ON check_in_focus_regions(check_in_id)`,
    `CREATE TRIGGER prevent_submitted_check_in_focus_region_insert
      BEFORE INSERT ON check_in_focus_regions
      WHEN EXISTS (
        SELECT 1 FROM check_ins
        WHERE id = NEW.check_in_id AND capture_status = 'submitted'
      )
      BEGIN
        SELECT RAISE(ABORT, 'submitted_check_in_immutable');
      END`,
    `CREATE TRIGGER prevent_submitted_check_in_focus_region_update
      BEFORE UPDATE ON check_in_focus_regions
      WHEN EXISTS (
        SELECT 1 FROM check_ins
        WHERE id IN (OLD.check_in_id, NEW.check_in_id) AND capture_status = 'submitted'
      )
      BEGIN
        SELECT RAISE(ABORT, 'submitted_check_in_immutable');
      END`,
    `CREATE TRIGGER prevent_submitted_check_in_focus_region_delete
      BEFORE DELETE ON check_in_focus_regions
      WHEN EXISTS (
        SELECT 1 FROM check_ins
        WHERE id = OLD.check_in_id AND capture_status = 'submitted'
      )
      BEGIN
        SELECT RAISE(ABORT, 'submitted_check_in_immutable');
      END`,
  ],
};
