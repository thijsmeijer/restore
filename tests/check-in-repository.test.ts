import { initializeDatabaseConnection } from '@/db/initialize-database';
import { SQLiteCheckInRepository } from '@/db/repositories/check-in-repository';
import { SQLiteUserProfileRepository } from '@/db/repositories/user-profile-repository';
import type { CheckInInput } from '@/features/check-in/check-in';

import { NodeSQLiteDatabase } from './support/node-sqlite-database';

const timestamp = '2026-08-30T08:15:00.000Z';

function sequentialIds(): () => string {
  let value = 0;
  return () => `${value++}`.padStart(26, '0');
}

function completeInput(): CheckInInput {
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

  it('stores and reloads the complete captured snapshot transactionally', async () => {
    const repository = new SQLiteCheckInRepository(
      database,
      () => new Date(timestamp),
      () => 'UTC',
      sequentialIds(),
    );

    const result = await repository.save(completeInput());

    expect(result).toMatchObject({ ok: true });
    await expect(repository.getLatest()).resolves.toEqual({
      id: '00000000000000000000000000',
      ...completeInput(),
      observedAt: timestamp,
      localDate: '2026-08-30',
      timeZone: 'UTC',
      captureStatus: 'captured',
      createdAt: timestamp,
    });
    await expect(
      database.getFirstAsync<{
        safety_result: string | null;
        safety_rules_version: string | null;
      }>('SELECT safety_result, safety_rules_version FROM check_ins LIMIT 1'),
    ).resolves.toEqual({ safety_result: null, safety_rules_version: null });
    await expect(
      database.getFirstAsync<{
        started_at: string | null;
        ended_at: string | null;
      }>('SELECT started_at, ended_at FROM training_sessions LIMIT 1'),
    ).resolves.toEqual({ started_at: null, ended_at: null });
  });

  it('keeps a minimal check-in durable across repository instances', async () => {
    const ids = sequentialIds();
    const input: CheckInInput = {
      mode: 'daily_restore',
      availableMinutes: 5,
      readiness: null,
      environment: 'home',
      equipmentIds: [],
      regions: [],
      training: null,
      note: null,
    };
    await new SQLiteCheckInRepository(
      database,
      () => new Date(timestamp),
      () => 'Europe/Amsterdam',
      ids,
    ).save(input);

    await expect(
      new SQLiteCheckInRepository(
        database,
        () => new Date(timestamp),
        () => 'Europe/Amsterdam',
        ids,
      ).getLatest(),
    ).resolves.toMatchObject({
      ...input,
      captureStatus: 'captured',
      timeZone: 'Europe/Amsterdam',
    });
  });

  it('stores a focus area without inventing an observation or zero rating', async () => {
    const ids = sequentialIds();
    const input: CheckInInput = {
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
    };
    const repository = new SQLiteCheckInRepository(
      database,
      () => new Date(timestamp),
      () => 'Europe/Amsterdam',
      ids,
    );

    await expect(repository.save(input)).resolves.toMatchObject({ ok: true });
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

      await expect(repository.save(completeInput())).resolves.toEqual({
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
    const result = await repository.save(completeInput());
    if (!result.ok) throw new Error('Expected the check-in to be saved.');

    await database.runAsync(
      `UPDATE check_ins SET
        capture_status = 'submitted',
        safety_result = 'clear',
        safety_rules_version = 'test_rules',
        safety_reason_codes_json = '[]'
      WHERE id = ?`,
      result.checkIn.id,
    );

    await expect(
      database.runAsync(
        'UPDATE check_ins SET note = ? WHERE id = ?',
        'Changed later',
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
  });

  it('rolls back every fact when a child snapshot write fails', async () => {
    const repository = new SQLiteCheckInRepository(
      database,
      () => new Date(timestamp),
      () => 'UTC',
      () => '99999999999999999999999999',
    );

    await expect(repository.save(completeInput())).rejects.toThrow();
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
