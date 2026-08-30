import type { DatabaseConnection, DatabaseExecutor } from '@/db/database';
import { createUlid } from '@/domain/identifiers';
import {
  generatedRoutineItemSchema,
  parseGeneratedRoutine,
  type RoutineEditKind,
  type RoutineItemEditSource,
  type RoutineStatus,
  type StoredRoutine,
  type StoredRoutineItem,
  type StoreRoutineOptions,
} from '@/features/routine/routine';
import type { GeneratedRoutine, GeneratedRoutineItem } from '@/generator';

interface RoutineRow {
  readonly id: string;
  readonly check_in_id: string;
  readonly generated_at: string;
  readonly input_schema_version: number;
  readonly input_snapshot_json: string;
  readonly template_id: string;
  readonly template_version: number;
  readonly mode: string;
  readonly estimated_duration_seconds: number;
  readonly content_version: string;
  readonly engine_version: string;
  readonly rules_version: string;
  readonly configuration_version: string;
  readonly seed: string;
  readonly target_priorities_json: string;
  readonly explanation_key: string;
  readonly validation_json: string;
  readonly rejection_report_json: string;
  readonly status: RoutineStatus;
  readonly supersedes_routine_id: string | null;
  readonly edit_kind: RoutineEditKind;
  readonly created_at: string;
  readonly ready_at: string;
}

interface RoutineItemRow {
  readonly id: string;
  readonly item_order: number;
  readonly phase: string;
  readonly exercise_id: string;
  readonly exercise_version: number;
  readonly prescription_json: string;
  readonly selection_reason_codes_json: string;
  readonly explanation_key: string;
  readonly explanation_reference_ids_json: string;
  readonly caution_rule_ids_json: string;
  readonly warning_keys_json: string;
  readonly alternatives_json: string;
  readonly score: number;
  readonly score_terms_json: string;
  readonly replaces_routine_item_id: string | null;
  readonly edit_source: RoutineItemEditSource;
}

interface PriorRoutineRow {
  readonly id: string;
  readonly check_in_id: string;
  readonly status: RoutineStatus;
}

export interface RoutineRepository {
  getById(routineId: string): Promise<StoredRoutine | null>;
  getLatestReadyForCheckIn(checkInId: string): Promise<StoredRoutine | null>;
  store(
    routine: GeneratedRoutine,
    options: StoreRoutineOptions,
  ): Promise<StoredRoutine>;
}

function parseJson(value: string, field: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Stored routine ${field} is not valid JSON.`);
  }
}

function itemFromRow(row: RoutineItemRow): StoredRoutineItem {
  const value = generatedRoutineItemSchema.parse({
    order: row.item_order,
    phase: row.phase,
    exercise_id: row.exercise_id,
    exercise_version: row.exercise_version,
    prescription: parseJson(row.prescription_json, 'prescription'),
    selection_reason_codes: parseJson(
      row.selection_reason_codes_json,
      'selection reasons',
    ),
    explanation_key: row.explanation_key,
    explanation_reference_ids: parseJson(
      row.explanation_reference_ids_json,
      'explanation references',
    ),
    caution_rule_ids: parseJson(row.caution_rule_ids_json, 'caution rules'),
    warning_keys: parseJson(row.warning_keys_json, 'warning keys'),
    alternatives: parseJson(row.alternatives_json, 'alternatives'),
    score: row.score,
    score_terms: parseJson(row.score_terms_json, 'score terms'),
  });

  return {
    id: row.id,
    replacesRoutineItemId: row.replaces_routine_item_id,
    editSource: row.edit_source,
    value,
  };
}

function assertStorableRoutine(routine: GeneratedRoutine): GeneratedRoutine {
  const parsed = parseGeneratedRoutine(routine);
  if (
    parsed.routine_id !== parsed.input_snapshot.routine_id ||
    parsed.check_in_id !== parsed.input_snapshot.check_in_id ||
    parsed.generated_at !== parsed.input_snapshot.generated_at ||
    parsed.content_version !== parsed.input_snapshot.content_version ||
    parsed.engine_version !== parsed.input_snapshot.engine_version ||
    parsed.rules_version !== parsed.input_snapshot.rules_version ||
    parsed.configuration_version !==
      parsed.input_snapshot.configuration_version ||
    parsed.seed !== parsed.input_snapshot.seed ||
    !parsed.validation.valid ||
    parsed.estimated_duration_seconds !==
      parsed.validation.estimated_duration_seconds ||
    parsed.items.some((item, index) => item.order !== index)
  ) {
    throw new Error('Routine snapshot is internally inconsistent.');
  }
  return parsed;
}

function editSourceFor(
  options: StoreRoutineOptions,
  item: GeneratedRoutineItem,
): RoutineItemEditSource {
  if (options.editKind === 'regenerated') return 'regeneration';
  if (
    options.editKind === 'replacement' &&
    options.replacement?.newItemOrder === item.order
  ) {
    return 'user_replacement';
  }
  return 'generator';
}

export class SQLiteRoutineRepository implements RoutineRepository {
  public constructor(
    private readonly database: DatabaseConnection,
    private readonly idFactory: () => string = createUlid,
  ) {}

  public async getById(routineId: string): Promise<StoredRoutine | null> {
    const row = await this.database.getFirstAsync<RoutineRow>(
      `SELECT * FROM generated_routines WHERE id = ? AND status != 'draft'`,
      routineId,
    );
    return row === null ? null : this.hydrate(this.database, row);
  }

  public async getLatestReadyForCheckIn(
    checkInId: string,
  ): Promise<StoredRoutine | null> {
    const row = await this.database.getFirstAsync<RoutineRow>(
      `SELECT * FROM generated_routines
      WHERE check_in_id = ? AND status = 'ready'
      ORDER BY generated_at DESC, created_at DESC, id DESC
      LIMIT 1`,
      checkInId,
    );
    return row === null ? null : this.hydrate(this.database, row);
  }

  public async store(
    rawRoutine: GeneratedRoutine,
    options: StoreRoutineOptions,
  ): Promise<StoredRoutine> {
    const routine = assertStorableRoutine(rawRoutine);
    const replacement = options.replacement;
    if (
      (options.editKind === 'replacement') !== (replacement !== null) ||
      (options.supersedesRoutineId === null) !==
        (options.editKind === 'generated')
    ) {
      throw new Error('Routine edit lineage is inconsistent.');
    }

    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      if (options.supersedesRoutineId !== null) {
        const prior = await transaction.getFirstAsync<PriorRoutineRow>(
          `SELECT id, check_in_id, status FROM generated_routines WHERE id = ?`,
          options.supersedesRoutineId,
        );
        if (
          prior === null ||
          prior.status !== 'ready' ||
          prior.check_in_id !== routine.check_in_id
        ) {
          throw new Error('Prior routine is not available for supersession.');
        }
      }

      await transaction.runAsync(
        `INSERT INTO generated_routines (
          id, check_in_id, generated_at, input_schema_version,
          input_snapshot_json, template_id, template_version, mode,
          estimated_duration_seconds, content_version, engine_version,
          rules_version, configuration_version, seed,
          target_priorities_json, explanation_key, validation_json,
          rejection_report_json, status, supersedes_routine_id, edit_kind,
          created_at, ready_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          'draft', ?, ?, ?, NULL)`,
        routine.routine_id,
        routine.check_in_id,
        routine.generated_at,
        routine.input_snapshot.schema_version,
        JSON.stringify(routine.input_snapshot),
        routine.template_id,
        routine.template_version,
        routine.mode,
        routine.estimated_duration_seconds,
        routine.content_version,
        routine.engine_version,
        routine.rules_version,
        routine.configuration_version,
        routine.seed,
        JSON.stringify(routine.target_priorities),
        routine.explanation_key,
        JSON.stringify(routine.validation),
        JSON.stringify(routine.rejection_report),
        options.supersedesRoutineId,
        options.editKind,
        routine.generated_at,
      );

      for (const item of routine.items) {
        await transaction.runAsync(
          `INSERT INTO routine_items (
            id, routine_id, item_order, phase, exercise_id, exercise_version,
            prescription_json, selection_reason_codes_json, explanation_key,
            explanation_reference_ids_json, caution_rule_ids_json,
            warning_keys_json, alternatives_json, score, score_terms_json,
            replaces_routine_item_id, edit_source, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          this.idFactory(),
          routine.routine_id,
          item.order,
          item.phase,
          item.exercise_id,
          item.exercise_version,
          JSON.stringify(item.prescription),
          JSON.stringify(item.selection_reason_codes),
          item.explanation_key,
          JSON.stringify(item.explanation_reference_ids),
          JSON.stringify(item.caution_rule_ids),
          JSON.stringify(item.warning_keys),
          JSON.stringify(item.alternatives),
          item.score,
          JSON.stringify(item.score_terms),
          replacement?.newItemOrder === item.order
            ? replacement.replacedRoutineItemId
            : null,
          editSourceFor(options, item),
          routine.generated_at,
        );
      }

      if (options.supersedesRoutineId !== null) {
        const superseded = await transaction.runAsync(
          `UPDATE generated_routines SET status = 'superseded'
          WHERE id = ? AND status = 'ready'`,
          options.supersedesRoutineId,
        );
        if (superseded.changes !== 1) {
          throw new Error('Prior routine could not be superseded.');
        }
      }

      const ready = await transaction.runAsync(
        `UPDATE generated_routines
        SET status = 'ready', ready_at = ?
        WHERE id = ? AND status = 'draft'`,
        routine.generated_at,
        routine.routine_id,
      );
      if (ready.changes !== 1) {
        throw new Error('Routine could not transition to ready.');
      }
    });

    const stored = await this.getById(routine.routine_id);
    if (stored === null) {
      throw new Error('Stored routine could not be read.');
    }
    return stored;
  }

  private async hydrate(
    database: DatabaseExecutor,
    row: RoutineRow,
  ): Promise<StoredRoutine> {
    const itemRows = await database.getAllAsync<RoutineItemRow>(
      `SELECT * FROM routine_items
      WHERE routine_id = ? ORDER BY item_order ASC`,
      row.id,
    );
    const items = itemRows.map(itemFromRow);
    const value = assertStorableRoutine(
      parseGeneratedRoutine({
        ok: true,
        routine_id: row.id,
        check_in_id: row.check_in_id,
        generated_at: row.generated_at,
        input_snapshot: parseJson(row.input_snapshot_json, 'input snapshot'),
        template_id: row.template_id,
        template_version: row.template_version,
        mode: row.mode,
        content_version: row.content_version,
        engine_version: row.engine_version,
        rules_version: row.rules_version,
        configuration_version: row.configuration_version,
        seed: row.seed,
        target_priorities: parseJson(
          row.target_priorities_json,
          'target priorities',
        ),
        items: items.map((item) => item.value),
        estimated_duration_seconds: row.estimated_duration_seconds,
        explanation_key: row.explanation_key,
        validation: parseJson(row.validation_json, 'validation'),
        rejection_report: parseJson(
          row.rejection_report_json,
          'rejection report',
        ),
      }),
    );
    if (value.input_snapshot.schema_version !== row.input_schema_version) {
      throw new Error('Stored routine input schema version is inconsistent.');
    }

    return {
      value,
      status: row.status,
      supersedesRoutineId: row.supersedes_routine_id,
      editKind: row.edit_kind,
      createdAt: row.created_at,
      readyAt: row.ready_at,
      items,
    };
  }
}
