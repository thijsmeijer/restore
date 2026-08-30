import type { DatabaseConnection, DatabaseExecutor } from '@/db/database';
import { createUlid } from '@/domain/identifiers';
import type {
  CheckIn,
  CheckInInput,
  CheckInRegionInput,
  CheckInTrainingInput,
  SubmitCheckInInput,
  SubmitCheckInResult,
} from '@/features/check-in/check-in';
import {
  validateCheckInInput,
  validateSubmitCheckInInput,
} from '@/features/check-in/check-in';
import type {
  CheckInEnvironment,
  CheckInMode,
} from '@/features/check-in/check-in-options';
import type {
  BodyRegionSlug,
  BodySide,
  TrainingType,
} from '@/features/onboarding/profile-options';
import {
  checkInSafetySignalDefinitions,
  evaluateCheckInSafety,
  type CheckInSafetyState,
} from '@/features/safety/check-in-safety';

interface ProfileIdRow {
  readonly id: string;
}

interface CheckInRow {
  readonly id: string;
  readonly observed_at: string;
  readonly local_date: string;
  readonly time_zone: string;
  readonly session_mode: CheckInMode;
  readonly available_minutes: number;
  readonly readiness: number | null;
  readonly environment: CheckInEnvironment;
  readonly planned_training_session_id: string | null;
  readonly completed_training_session_id: string | null;
  readonly note: string | null;
  readonly capture_status: CheckIn['captureStatus'];
  readonly safety_result: CheckInSafetyState | null;
  readonly safety_rules_version: string | null;
  readonly safety_rule_ids_json: string | null;
  readonly safety_reason_codes_json: string | null;
  readonly created_at: string;
}

interface EquipmentRow {
  readonly equipment_id: string;
}

interface RegionRow {
  readonly region_slug: BodyRegionSlug;
  readonly side: BodySide;
  readonly stiffness: number | null;
  readonly soreness: number | null;
  readonly discomfort: number | null;
}

interface FocusRegionRow {
  readonly region_slug: BodyRegionSlug;
  readonly side: BodySide;
}

interface TrainingRow {
  readonly training_type: TrainingType;
  readonly status: CheckInTrainingInput['status'];
  readonly stress: number | null;
}

interface SafetyResponseRow {
  readonly signal_id: string;
  readonly reported: number;
}

export interface CheckInRepository {
  getLatest(): Promise<CheckIn | null>;
  submit(input: SubmitCheckInInput): Promise<SubmitCheckInResult>;
}

function localDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function systemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function parseStoredStringArray(value: string | null, field: string): string[] {
  if (value === null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`Stored check-in ${field} is not valid JSON.`);
  }
  if (
    !Array.isArray(parsed) ||
    parsed.some((entry) => typeof entry !== 'string')
  ) {
    throw new Error(`Stored check-in ${field} is not a string array.`);
  }
  return parsed;
}

function arraysEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((entry, index) => entry === right[index])
  );
}

export class SQLiteCheckInRepository implements CheckInRepository {
  public constructor(
    private readonly database: DatabaseConnection,
    private readonly clock: () => Date = () => new Date(),
    private readonly timeZone: () => string = systemTimeZone,
    private readonly idFactory: () => string = createUlid,
  ) {}

  public async getLatest(): Promise<CheckIn | null> {
    const row = await this.database.getFirstAsync<CheckInRow>(
      `SELECT * FROM check_ins
      ORDER BY observed_at DESC, created_at DESC, id DESC
      LIMIT 1`,
    );
    return row === null ? null : this.hydrate(this.database, row);
  }

  public async submit(input: SubmitCheckInInput): Promise<SubmitCheckInResult> {
    const validation = validateSubmitCheckInInput(input);
    if (!validation.ok) return validation;

    let savedCheckIn: CheckIn | null = null;
    let profileMissing = false;
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const profile = await transaction.getFirstAsync<ProfileIdRow>(
        'SELECT id FROM user_profiles LIMIT 1',
      );
      if (profile === null) {
        profileMissing = true;
        return;
      }

      const now = this.clock();
      const timestamp = now.toISOString();
      const date = localDate(now);
      const checkInId = this.idFactory();
      let plannedTrainingSessionId: string | null = null;
      let completedTrainingSessionId: string | null = null;

      if (validation.value.training !== null) {
        const trainingSessionId = this.idFactory();
        await transaction.runAsync(
          `INSERT INTO training_sessions (
            id,
            user_profile_id,
            local_date,
            started_at,
            ended_at,
            training_type,
            status,
            stress,
            source,
            supersedes_training_session_id,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual', NULL, ?, ?)`,
          trainingSessionId,
          profile.id,
          date,
          null,
          null,
          validation.value.training.type,
          validation.value.training.status,
          validation.value.training.stress,
          timestamp,
          timestamp,
        );
        if (validation.value.training.status === 'completed') {
          completedTrainingSessionId = trainingSessionId;
        } else {
          plannedTrainingSessionId = trainingSessionId;
        }
      }

      await transaction.runAsync(
        `INSERT INTO check_ins (
          id,
          user_profile_id,
          observed_at,
          local_date,
          time_zone,
          session_mode,
          available_minutes,
          readiness,
          environment,
          planned_training_session_id,
          completed_training_session_id,
          note,
          capture_status,
          safety_result,
          safety_rules_version,
          safety_reason_codes_json,
          source,
          supersedes_check_in_id,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'captured', NULL, NULL, NULL, 'manual', NULL, ?, ?)`,
        checkInId,
        profile.id,
        timestamp,
        date,
        this.timeZone(),
        validation.value.mode,
        validation.value.availableMinutes,
        validation.value.readiness,
        validation.value.environment,
        plannedTrainingSessionId,
        completedTrainingSessionId,
        validation.value.note,
        timestamp,
        timestamp,
      );

      for (const equipmentId of validation.value.equipmentIds) {
        await transaction.runAsync(
          `INSERT INTO check_in_equipment (id, check_in_id, equipment_id)
          VALUES (?, ?, ?)`,
          this.idFactory(),
          checkInId,
          equipmentId,
        );
      }
      for (const region of validation.value.regions) {
        await transaction.runAsync(
          `INSERT INTO check_in_focus_regions (
            id, check_in_id, region_slug, side
          ) VALUES (?, ?, ?, ?)`,
          this.idFactory(),
          checkInId,
          region.regionSlug,
          region.side,
        );
        if (
          region.stiffness === null &&
          region.soreness === null &&
          region.discomfort === null
        ) {
          continue;
        }
        await transaction.runAsync(
          `INSERT INTO check_in_regions (
            id, check_in_id, region_slug, side, stiffness, soreness, discomfort
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          this.idFactory(),
          checkInId,
          region.regionSlug,
          region.side,
          region.stiffness,
          region.soreness,
          region.discomfort,
        );
      }

      const reportedSignals = new Set(validation.value.safety.reportedSignals);
      for (const [
        ruleOrder,
        definition,
      ] of checkInSafetySignalDefinitions.entries()) {
        await transaction.runAsync(
          `INSERT INTO check_in_safety_responses (
            check_in_id, signal_id, reported, rule_order
          ) VALUES (?, ?, ?, ?)`,
          checkInId,
          definition.signal,
          reportedSignals.has(definition.signal) ? 1 : 0,
          ruleOrder,
        );
      }

      const submission = await transaction.runAsync(
        `UPDATE check_ins SET
          capture_status = 'submitted',
          safety_result = ?,
          safety_rules_version = ?,
          safety_rule_ids_json = ?,
          safety_reason_codes_json = ?,
          updated_at = ?
        WHERE id = ? AND capture_status = 'captured'`,
        validation.safetyResult.state,
        validation.safetyResult.rulesVersion,
        JSON.stringify(validation.safetyResult.matchedRuleIds),
        JSON.stringify(validation.safetyResult.reasonCodes),
        timestamp,
        checkInId,
      );
      if (submission.changes !== 1) {
        throw new Error('Check-in could not transition to submitted.');
      }

      const row = await transaction.getFirstAsync<CheckInRow>(
        'SELECT * FROM check_ins WHERE id = ?',
        checkInId,
      );
      if (row !== null) savedCheckIn = await this.hydrate(transaction, row);
    });

    if (profileMissing) {
      return {
        ok: false,
        issues: [{ code: 'check_in_profile_missing', path: '$.profile' }],
      };
    }
    if (savedCheckIn === null) {
      throw new Error(
        'Check-in submission completed without a readable check-in.',
      );
    }

    return { ok: true, checkIn: savedCheckIn };
  }

  private async hydrate(
    database: DatabaseExecutor,
    row: CheckInRow,
  ): Promise<CheckIn> {
    const equipment = await database.getAllAsync<EquipmentRow>(
      `SELECT equipment_id FROM check_in_equipment
      WHERE check_in_id = ? ORDER BY rowid`,
      row.id,
    );
    const focusRegions = await database.getAllAsync<FocusRegionRow>(
      `SELECT region_slug, side FROM check_in_focus_regions
      WHERE check_in_id = ? ORDER BY rowid`,
      row.id,
    );
    const observations = await database.getAllAsync<RegionRow>(
      `SELECT region_slug, side, stiffness, soreness, discomfort
      FROM check_in_regions WHERE check_in_id = ? ORDER BY rowid`,
      row.id,
    );
    const safetyResponses = await database.getAllAsync<SafetyResponseRow>(
      `SELECT signal_id, reported FROM check_in_safety_responses
      WHERE check_in_id = ? ORDER BY rule_order`,
      row.id,
    );
    const focusKeys = new Set(
      focusRegions.map((entry) => `${entry.region_slug}:${entry.side}`),
    );
    const regions: readonly CheckInRegionInput[] = [
      ...focusRegions.map((focus): CheckInRegionInput => {
        const observation = observations.find(
          (entry) =>
            entry.region_slug === focus.region_slug &&
            entry.side === focus.side,
        );
        return {
          regionSlug: focus.region_slug,
          side: focus.side,
          stiffness: observation?.stiffness ?? null,
          soreness: observation?.soreness ?? null,
          discomfort: observation?.discomfort ?? null,
        };
      }),
      ...observations
        .filter((entry) => !focusKeys.has(`${entry.region_slug}:${entry.side}`))
        .map((entry): CheckInRegionInput => ({
          regionSlug: entry.region_slug,
          side: entry.side,
          stiffness: entry.stiffness,
          soreness: entry.soreness,
          discomfort: entry.discomfort,
        })),
    ];
    const trainingSessionId =
      row.planned_training_session_id ?? row.completed_training_session_id;
    const training =
      trainingSessionId === null
        ? null
        : await database.getFirstAsync<TrainingRow>(
            `SELECT training_type, status, stress FROM training_sessions
            WHERE id = ?`,
            trainingSessionId,
          );
    if (trainingSessionId !== null && training === null) {
      throw new Error('Stored check-in training reference is missing.');
    }

    const storedInput: CheckInInput = {
      mode: row.session_mode,
      availableMinutes: row.available_minutes,
      readiness: row.readiness,
      environment: row.environment,
      equipmentIds: equipment.map((entry) => entry.equipment_id),
      regions,
      training:
        training === null
          ? null
          : {
              type: training.training_type,
              status: training.status,
              stress: training.stress,
            },
      note: row.note,
    };
    const validation = validateCheckInInput(storedInput);
    if (!validation.ok) {
      throw new Error(
        `Stored check-in failed validation: ${validation.issues.map((issue) => issue.code).join(',')}`,
      );
    }

    let safety: CheckIn['safety'] = null;
    let safetyRuleIds: readonly string[] = [];
    let safetyReasonCodes: readonly string[] = [];

    if (row.capture_status === 'submitted') {
      const hasCompleteResponseSet =
        safetyResponses.length === checkInSafetySignalDefinitions.length &&
        safetyResponses.every(
          (response, index) =>
            response.signal_id ===
              checkInSafetySignalDefinitions[index]?.signal &&
            (response.reported === 0 || response.reported === 1),
        );
      if (!hasCompleteResponseSet) {
        throw new Error(
          'Stored submitted check-in has an incomplete safety response set.',
        );
      }

      safety = {
        reportedSignals: checkInSafetySignalDefinitions
          .filter((_, index) => safetyResponses[index]?.reported === 1)
          .map((definition) => definition.signal),
      };
      const evaluation = evaluateCheckInSafety(
        safety,
        row.safety_rules_version ?? '',
      );
      if (!evaluation.ok) {
        throw new Error('Stored check-in safety input failed validation.');
      }

      safetyRuleIds = parseStoredStringArray(
        row.safety_rule_ids_json,
        'safety rule IDs',
      );
      safetyReasonCodes = parseStoredStringArray(
        row.safety_reason_codes_json,
        'safety reason codes',
      );
      const storedResultMatches =
        row.safety_result === evaluation.result.state &&
        row.safety_rules_version === evaluation.result.rulesVersion &&
        arraysEqual(safetyRuleIds, evaluation.result.matchedRuleIds) &&
        arraysEqual(safetyReasonCodes, evaluation.result.reasonCodes);
      if (!storedResultMatches) {
        throw new Error(
          'Stored check-in safety result does not match its structured input.',
        );
      }
    } else if (
      safetyResponses.length > 0 ||
      row.safety_result !== null ||
      row.safety_rules_version !== null ||
      row.safety_rule_ids_json !== null ||
      row.safety_reason_codes_json !== null
    ) {
      throw new Error(
        'Stored captured check-in contains submitted safety data.',
      );
    }

    return {
      id: row.id,
      ...validation.value,
      safety,
      safetyResult: row.safety_result,
      safetyRulesVersion: row.safety_rules_version,
      safetyRuleIds,
      safetyReasonCodes,
      observedAt: row.observed_at,
      localDate: row.local_date,
      timeZone: row.time_zone,
      captureStatus: row.capture_status,
      createdAt: row.created_at,
    };
  }
}
