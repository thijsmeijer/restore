import type { Migration } from '@/db/migrations/types';

export const generatedRoutinesMigration: Migration = {
  id: '0008_generated_routines',
  fromVersion: 7,
  toVersion: 8,
  checksum:
    'sha256:0dbe5d95ca918840847528242bc7709376e6f3832c0744eff7ac9786bb0bd404',
  affectsOwnerData: false,
  statements: [
    `CREATE TABLE generated_routines (
      id TEXT PRIMARY KEY CHECK (length(id) > 0),
      check_in_id TEXT NOT NULL REFERENCES check_ins(id),
      generated_at TEXT NOT NULL,
      input_schema_version INTEGER NOT NULL CHECK (input_schema_version > 0),
      input_snapshot_json TEXT NOT NULL CHECK (json_valid(input_snapshot_json)),
      template_id TEXT NOT NULL CHECK (length(template_id) > 0),
      template_version INTEGER NOT NULL CHECK (template_version > 0),
      mode TEXT NOT NULL CHECK (length(mode) > 0),
      estimated_duration_seconds INTEGER NOT NULL CHECK (estimated_duration_seconds > 0),
      content_version TEXT NOT NULL CHECK (length(content_version) > 0),
      engine_version TEXT NOT NULL CHECK (length(engine_version) > 0),
      rules_version TEXT NOT NULL CHECK (length(rules_version) > 0),
      configuration_version TEXT NOT NULL CHECK (length(configuration_version) > 0),
      seed TEXT NOT NULL CHECK (length(seed) > 0),
      target_priorities_json TEXT NOT NULL CHECK (json_valid(target_priorities_json)),
      explanation_key TEXT NOT NULL CHECK (length(explanation_key) > 0),
      validation_json TEXT NOT NULL CHECK (json_valid(validation_json)),
      rejection_report_json TEXT NOT NULL CHECK (json_valid(rejection_report_json)),
      status TEXT NOT NULL CHECK (
        status IN ('draft', 'ready', 'started', 'completed', 'abandoned', 'superseded')
      ),
      supersedes_routine_id TEXT REFERENCES generated_routines(id),
      edit_kind TEXT NOT NULL CHECK (edit_kind IN ('generated', 'replacement', 'regenerated')),
      created_at TEXT NOT NULL,
      ready_at TEXT,
      UNIQUE (supersedes_routine_id),
      CHECK (
        (status = 'draft' AND ready_at IS NULL)
        OR (status != 'draft' AND ready_at IS NOT NULL)
      )
    ) STRICT`,
    `CREATE TABLE routine_items (
      id TEXT PRIMARY KEY CHECK (length(id) > 0),
      routine_id TEXT NOT NULL REFERENCES generated_routines(id) ON DELETE RESTRICT,
      item_order INTEGER NOT NULL CHECK (item_order >= 0),
      phase TEXT NOT NULL CHECK (length(phase) > 0),
      exercise_id TEXT NOT NULL CHECK (length(exercise_id) > 0),
      exercise_version INTEGER NOT NULL CHECK (exercise_version > 0),
      prescription_json TEXT NOT NULL CHECK (json_valid(prescription_json)),
      selection_reason_codes_json TEXT NOT NULL CHECK (json_valid(selection_reason_codes_json)),
      explanation_key TEXT NOT NULL CHECK (length(explanation_key) > 0),
      explanation_reference_ids_json TEXT NOT NULL CHECK (json_valid(explanation_reference_ids_json)),
      caution_rule_ids_json TEXT NOT NULL CHECK (json_valid(caution_rule_ids_json)),
      warning_keys_json TEXT NOT NULL CHECK (json_valid(warning_keys_json)),
      alternatives_json TEXT NOT NULL CHECK (json_valid(alternatives_json)),
      score INTEGER NOT NULL,
      score_terms_json TEXT NOT NULL CHECK (json_valid(score_terms_json)),
      replaces_routine_item_id TEXT REFERENCES routine_items(id),
      edit_source TEXT NOT NULL CHECK (edit_source IN ('generator', 'user_replacement', 'regeneration')),
      created_at TEXT NOT NULL,
      UNIQUE (routine_id, item_order),
      UNIQUE (routine_id, exercise_id)
    ) STRICT`,
    `CREATE INDEX generated_routines_check_in_status
      ON generated_routines(check_in_id, status, generated_at DESC)`,
    `CREATE UNIQUE INDEX generated_routines_one_ready_per_check_in
      ON generated_routines(check_in_id) WHERE status = 'ready'`,
    `CREATE INDEX routine_items_routine_order
      ON routine_items(routine_id, item_order)`,
    `CREATE TRIGGER generated_routines_ready_immutable
      BEFORE UPDATE ON generated_routines
      WHEN OLD.status != 'draft'
      BEGIN
        SELECT CASE WHEN
          NEW.id IS NOT OLD.id
          OR NEW.check_in_id IS NOT OLD.check_in_id
          OR NEW.generated_at IS NOT OLD.generated_at
          OR NEW.input_schema_version IS NOT OLD.input_schema_version
          OR NEW.input_snapshot_json IS NOT OLD.input_snapshot_json
          OR NEW.template_id IS NOT OLD.template_id
          OR NEW.template_version IS NOT OLD.template_version
          OR NEW.mode IS NOT OLD.mode
          OR NEW.estimated_duration_seconds IS NOT OLD.estimated_duration_seconds
          OR NEW.content_version IS NOT OLD.content_version
          OR NEW.engine_version IS NOT OLD.engine_version
          OR NEW.rules_version IS NOT OLD.rules_version
          OR NEW.configuration_version IS NOT OLD.configuration_version
          OR NEW.seed IS NOT OLD.seed
          OR NEW.target_priorities_json IS NOT OLD.target_priorities_json
          OR NEW.explanation_key IS NOT OLD.explanation_key
          OR NEW.validation_json IS NOT OLD.validation_json
          OR NEW.rejection_report_json IS NOT OLD.rejection_report_json
          OR NEW.supersedes_routine_id IS NOT OLD.supersedes_routine_id
          OR NEW.edit_kind IS NOT OLD.edit_kind
          OR NEW.created_at IS NOT OLD.created_at
          OR NEW.ready_at IS NOT OLD.ready_at
          OR NOT (
            (OLD.status = 'ready' AND NEW.status IN ('started', 'abandoned', 'superseded'))
            OR (OLD.status = 'started' AND NEW.status IN ('completed', 'abandoned'))
          )
        THEN RAISE(ABORT, 'ready_routine_immutable') END;
      END`,
    `CREATE TRIGGER generated_routines_ready_no_delete
      BEFORE DELETE ON generated_routines
      WHEN OLD.status != 'draft'
      BEGIN
        SELECT RAISE(ABORT, 'ready_routine_immutable');
      END`,
    `CREATE TRIGGER routine_items_insert_draft_only
      BEFORE INSERT ON routine_items
      WHEN (SELECT status FROM generated_routines WHERE id = NEW.routine_id) != 'draft'
      BEGIN
        SELECT RAISE(ABORT, 'ready_routine_items_immutable');
      END`,
    `CREATE TRIGGER routine_items_update_draft_only
      BEFORE UPDATE ON routine_items
      WHEN (SELECT status FROM generated_routines WHERE id = OLD.routine_id) != 'draft'
      BEGIN
        SELECT RAISE(ABORT, 'ready_routine_items_immutable');
      END`,
    `CREATE TRIGGER routine_items_delete_draft_only
      BEFORE DELETE ON routine_items
      WHEN (SELECT status FROM generated_routines WHERE id = OLD.routine_id) != 'draft'
      BEGIN
        SELECT RAISE(ABORT, 'ready_routine_items_immutable');
      END`,
  ],
};
