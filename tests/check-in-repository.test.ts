import { initializeDatabaseConnection } from '@/db/initialize-database';
import { SQLiteCheckInRepository } from '@/db/repositories/check-in-repository';
import { SQLiteUserProfileRepository } from '@/db/repositories/user-profile-repository';
import type { SubmitCheckInInput } from '@/features/check-in/check-in';
import { checkInSafetyRulesVersion } from '@/features/safety/check-in-safety';

import { NodeSQLiteDatabase } from './support/node-sqlite-database';

const timestamp = '2026-08-30T08:15:00.000Z';

function sequentialIds(): () => string {
  let value = 0;
  return () => `${value++}`.padStart(26, '0');
}

function completeInput(): SubmitCheckInInput {
  return {
    mode: 'post_workout_reset',
    availableMinutes: 20,
    readiness: 3,
    environment: 'gym',
    equipmentIds: [
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000003',
    ],
    regions: [
      {
        regionSlug: 'wrist',
        side: 'right',
        stiffness: 0,
        soreness: 4,
        discomfort: null,
      },
      {
        regionSlug: 'thoracic_spine',
        side: 'central',
        stiffness: 6,
        soreness: null,
        discomfort: 2,
      },
    ],
    training: { type: 'planche', status: 'completed', stress: 4 },
    note: 'Felt restricted after the session.',
    safety: { reportedSignals: [] },
  };
}

describe('check-in repository', () => {
  let database: NodeSQLiteDatabase;

  beforeEach(async () => {
    database = new NodeSQLiteDatabase();
    await initializeDatabaseConnection(database, () => timestamp);
    await new SQLiteUserProfileRepository(
      database,
      () => timestamp,
      sequentialIds(),
    ).save({
      goalSlugs: [],
      bodyBaseline: [],
      equipmentIds: [],
      trainingTypes: [],
      preferredDurations: { quick: null, normal: null, deep: null },
      safetyAcknowledged: true,
    });
  });

  afterEach(() => database.close());

  it('classifies, submits, and reloads the complete snapshot transactionally', async () => {
    const repository = new SQLiteCheckInRepository(
      database,
      () => new Date(timestamp),
      () => 'UTC',
      sequentialIds(),
    );

    const result = await repository.submit(completeInput());

    expect(result).toMatchObject({ ok: true });
    await expect(repository.getLatest()).resolves.toEqual({
      id: '00000000000000000000000000',
      ...completeInput(),
      observedAt: timestamp,
      localDate: '2026-08-30',
      timeZone: 'UTC',
      safety: { reportedSignals: [] },
      safetyResult: 'clear',
      safetyRulesVersion: checkInSafetyRulesVersion,
      safetyRuleIds: [],
      safetyReasonCodes: [],
      captureStatus: 'submitted',
      createdAt: timestamp,
    });
    await expect(
      database.getFirstAsync<{
        capture_status: string;
        safety_result: string | null;
        safety_rules_version: string | null;
        safety_rule_ids_json: string | null;
        safety_reason_codes_json: string | null;
      }>(
        `SELECT capture_status, safety_result, safety_rules_version,
          safety_rule_ids_json, safety_reason_codes_json
        FROM check_ins LIMIT 1`,
      ),
    ).resolves.toEqual({
      capture_status: 'submitted',
      safety_result: 'clear',
      safety_rules_version: checkInSafetyRulesVersion,
      safety_rule_ids_json: '[]',
      safety_reason_codes_json: '[]',
    });
    await expect(
      database.getFirstAsync<{
        started_at: string | null;
        ended_at: string | null;
      }>('SELECT started_at, ended_at FROM training_sessions LIMIT 1'),
    ).resolves.toEqual({ started_at: null, ended_at: null });
  });

  it('keeps a minimal check-in durable across repository instances', async () => {
    const ids = sequentialIds();
    const input: SubmitCheckInInput = {
      mode: 'daily_restore',
      availableMinutes: 5,
      readiness: null,
      environment: 'home',
      equipmentIds: [],
      regions: [],
      training: null,
      note: null,
      safety: { reportedSignals: [] },
    };
    await new SQLiteCheckInRepository(
      database,
      () => new Date(timestamp),
      () => 'Europe/Amsterdam',
      ids,
    ).submit(input);

    await expect(
      new SQLiteCheckInRepository(
        database,
        () => new Date(timestamp),
        () => 'Europe/Amsterdam',
        ids,
      ).getLatest(),
    ).resolves.toMatchObject({
      ...input,
      captureStatus: 'submitted',
      timeZone: 'Europe/Amsterdam',
    });
  });

  it('keeps a pre-safety captured check-in readable but incomplete', async () => {
    const legacyCheckInId = '11111111111111111111111111';
    await database.runAsync(
      `INSERT INTO check_ins (
        id, user_profile_id, observed_at, local_date, time_zone,
        session_mode, available_minutes, readiness, environment,
        capture_status, source, created_at, updated_at
      ) VALUES (?, ?, ?, '2026-08-30', 'UTC', 'daily_restore', 15, NULL,
        'home', 'captured', 'manual', ?, ?)`,
      legacyCheckInId,
      '00000000000000000000000000',
      timestamp,
      timestamp,
      timestamp,
    );

    await expect(
      new SQLiteCheckInRepository(database).getLatest(),
    ).resolves.toMatchObject({
      id: legacyCheckInId,
      captureStatus: 'captured',
      safety: null,
      safetyResult: null,
      safetyRulesVersion: null,
      safetyRuleIds: [],
      safetyReasonCodes: [],
    });
  });

  it('stores a focus area without inventing an observation or zero rating', async () => {
    const ids = sequentialIds();
    const input: SubmitCheckInInput = {
      mode: 'targeted_area',
      availableMinutes: 10,
      readiness: 3,
      environment: 'home',
      equipmentIds: [],
      regions: [
        {
          regionSlug: 'neck',
          side: 'central',
          stiffness: null,
          soreness: null,
          discomfort: null,
        },
      ],
      training: null,
      note: null,
      safety: { reportedSignals: [] },
    };
    const repository = new SQLiteCheckInRepository(
      database,
      () => new Date(timestamp),
      () => 'Europe/Amsterdam',
      ids,
    );

    await expect(repository.submit(input)).resolves.toMatchObject({ ok: true });
    await expect(repository.getLatest()).resolves.toMatchObject(input);
    await expect(
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM check_in_focus_regions',
      ),
    ).resolves.toEqual({ count: 1 });
    await expect(
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM check_in_regions',
      ),
    ).resolves.toEqual({ count: 0 });
  });

  it('stores every structured response and the ordered blocked result', async () => {
    const repository = new SQLiteCheckInRepository(
      database,
      () => new Date(timestamp),
      () => 'UTC',
      sequentialIds(),
    );

    const result = await repository.submit({
      ...completeInput(),
      safety: {
        reportedSignals: [
          'rapidly_worsening_problem',
          'new_numbness_or_tingling',
        ],
      },
    });

    expect(result).toMatchObject({
      ok: true,
      checkIn: {
        captureStatus: 'submitted',
        safetyResult: 'blocked',
        safetyRuleIds: [
          'block_new_numbness_or_tingling_v1',
          'block_rapidly_worsening_problem_v1',
        ],
        safetyReasonCodes: [
          'reported_new_numbness_or_tingling',
          'reported_rapidly_worsening_problem',
        ],
      },
    });
    await expect(
      database.getFirstAsync<{ total: number; reported: number }>(
        `SELECT COUNT(*) AS total, SUM(reported) AS reported
        FROM check_in_safety_responses`,
      ),
    ).resolves.toEqual({ total: 8, reported: 2 });
  });

  it('does not create a check-in without a local owner profile', async () => {
    const emptyDatabase = new NodeSQLiteDatabase();
    try {
      await initializeDatabaseConnection(emptyDatabase, () => timestamp);
      const repository = new SQLiteCheckInRepository(
        emptyDatabase,
        () => new Date(timestamp),
        () => 'UTC',
        sequentialIds(),
      );

      await expect(repository.submit(completeInput())).resolves.toEqual({
        ok: false,
        issues: [{ code: 'check_in_profile_missing', path: '$.profile' }],
      });
      await expect(repository.getLatest()).resolves.toBeNull();
    } finally {
      emptyDatabase.close();
    }
  });

  it('prevents changes after the safety gate marks a check-in submitted', async () => {
    const repository = new SQLiteCheckInRepository(
      database,
      () => new Date(timestamp),
      () => 'UTC',
      sequentialIds(),
    );
    const result = await repository.submit(completeInput());
    if (!result.ok) throw new Error('Expected the check-in to be saved.');

    await expect(
      database.runAsync(
        'UPDATE check_ins SET note = ? WHERE id = ?',
        'Changed later',
        result.checkIn.id,
      ),
    ).rejects.toThrow('submitted_check_in_immutable');
    await expect(
      database.runAsync(
        `UPDATE check_in_safety_responses SET reported = 1
        WHERE check_in_id = ? AND signal_id = 'sudden_severe_pain'`,
        result.checkIn.id,
      ),
    ).rejects.toThrow('submitted_check_in_immutable');
    await expect(
      database.runAsync(
        `INSERT INTO check_in_safety_responses (
          check_in_id, signal_id, reported, rule_order
        ) VALUES (?, 'unknown_signal', 1, 99)`,
        result.checkIn.id,
      ),
    ).rejects.toThrow('submitted_check_in_immutable');
    await expect(
      database.runAsync(
        `DELETE FROM check_in_safety_responses
        WHERE check_in_id = ? AND signal_id = 'sudden_severe_pain'`,
        result.checkIn.id,
      ),
    ).rejects.toThrow('submitted_check_in_immutable');
    await expect(
      database.runAsync(
        'UPDATE check_in_regions SET stiffness = 9 WHERE check_in_id = ?',
        result.checkIn.id,
      ),
    ).rejects.toThrow('submitted_check_in_immutable');
    await expect(
      database.runAsync(
        `INSERT INTO check_in_focus_regions (id, check_in_id, region_slug, side)
        VALUES (?, ?, ?, ?)`,
        '88888888888888888888888888',
        result.checkIn.id,
        'neck',
        'central',
      ),
    ).rejects.toThrow('submitted_check_in_immutable');
    await expect(
      database.runAsync(
        `UPDATE check_in_focus_regions SET side = 'left'
        WHERE check_in_id = ? AND region_slug = 'wrist'`,
        result.checkIn.id,
      ),
    ).rejects.toThrow('submitted_check_in_immutable');
    await expect(
      database.runAsync(
        `DELETE FROM check_in_focus_regions
        WHERE check_in_id = ? AND region_slug = 'wrist'`,
        result.checkIn.id,
      ),
    ).rejects.toThrow('submitted_check_in_immutable');
    await expect(
      database.runAsync(
        `INSERT INTO check_in_equipment (id, check_in_id, equipment_id)
        VALUES (?, ?, ?)`,
        '99999999999999999999999999',
        result.checkIn.id,
        '10000000-0000-4000-8000-000000000004',
      ),
    ).rejects.toThrow('submitted_check_in_immutable');
    await expect(
      database.runAsync(
        `UPDATE training_sessions SET stress = 2
        WHERE id = (SELECT completed_training_session_id FROM check_ins WHERE id = ?)`,
        result.checkIn.id,
      ),
    ).rejects.toThrow('submitted_check_in_immutable');

    await expect(
      database.runAsync(
        'DELETE FROM check_ins WHERE id = ?',
        result.checkIn.id,
      ),
    ).resolves.toMatchObject({ changes: 1 });
    await expect(
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM check_in_regions',
      ),
    ).resolves.toEqual({ count: 0 });
    await expect(
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM check_in_focus_regions',
      ),
    ).resolves.toEqual({ count: 0 });
    await expect(
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM check_in_safety_responses',
      ),
    ).resolves.toEqual({ count: 0 });
  });

  it('rolls back every fact when a child snapshot write fails', async () => {
    const repository = new SQLiteCheckInRepository(
      database,
      () => new Date(timestamp),
      () => 'UTC',
      () => '99999999999999999999999999',
    );

    await expect(repository.submit(completeInput())).rejects.toThrow();
    await expect(
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM check_ins',
      ),
    ).resolves.toEqual({ count: 0 });
    await expect(
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM training_sessions',
      ),
    ).resolves.toEqual({ count: 0 });
  });
});
