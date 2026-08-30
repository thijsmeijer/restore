import type { DatabaseConnection, DatabaseExecutor } from '@/db/database';
import { createUlid } from '@/domain/identifiers';
import type {
  CheckIn,
  CheckInInput,
  CheckInRegionInput,
  CheckInTrainingInput,
  SaveCheckInResult,
} from '@/features/check-in/check-in';
import { validateCheckInInput } from '@/features/check-in/check-in';
import type {
  CheckInEnvironment,
  CheckInMode,
} from '@/features/check-in/check-in-options';
import type {
  BodyRegionSlug,
  BodySide,
  TrainingType,
} from '@/features/onboarding/profile-options';

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

export interface CheckInRepository {
  getLatest(): Promise<CheckIn | null>;
  save(input: CheckInInput): Promise<SaveCheckInResult>;
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

  public async save(input: CheckInInput): Promise<SaveCheckInResult> {
    const validation = validateCheckInInput(input);
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
      throw new Error('Check-in save completed without a readable check-in.');
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

    return {
      id: row.id,
      ...validation.value,
      observedAt: row.observed_at,
      localDate: row.local_date,
      timeZone: row.time_zone,
      captureStatus: row.capture_status,
      createdAt: row.created_at,
    };
  }
}
