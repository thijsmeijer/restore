import { initializeDatabaseConnection } from '@/db/initialize-database';
import { SQLiteRoutineRepository } from '@/db/repositories/routine-repository';

import { schemaVersionZeroFixture } from './fixtures/database/schema-v0';
import {
  createRoutineFixture,
  routineFixtureInput,
} from './support/routine-fixtures';
import { NodeSQLiteDatabase } from './support/node-sqlite-database';

const timestamp = '2026-08-30T12:00:00.000Z';
const profileId = '00000000000000000000000000';
const checkInId = '00000000000000000000000001';

describe('routine persistence', () => {
  let database: NodeSQLiteDatabase;
  let nextItemId: number;

  beforeEach(async () => {
    database = new NodeSQLiteDatabase();
    await database.execAsync(schemaVersionZeroFixture);
    await initializeDatabaseConnection(database, () => timestamp);
    await database.runAsync(
      `INSERT INTO user_profiles (
        id, onboarding_completed_at, safety_rules_version,
        safety_acknowledged_at, created_at, updated_at
      ) VALUES (?, ?, 'test_rules', ?, ?, ?)`,
      profileId,
      timestamp,
      timestamp,
      timestamp,
      timestamp,
    );
    await database.runAsync(
      `INSERT INTO check_ins (
        id, user_profile_id, observed_at, local_date, time_zone,
        session_mode, available_minutes, environment, capture_status,
        safety_result, safety_rules_version, safety_reason_codes_json,
        safety_rule_ids_json, source, created_at, updated_at
      ) VALUES (?, ?, ?, '2026-08-30', 'Europe/Amsterdam',
        'daily_restore', 5, 'home', 'submitted', 'clear',
        'check_in_safety_engineering_2026_08_30', '[]', '[]', 'manual', ?, ?)`,
      checkInId,
      profileId,
      timestamp,
      timestamp,
      timestamp,
    );
    nextItemId = 10;
  });

  afterEach(() => database.close());

  function repository(): SQLiteRoutineRepository {
    return new SQLiteRoutineRepository(database, () => {
      const id = `${nextItemId}`.padStart(26, '0');
      nextItemId += 1;
      return id;
    });
  }

  it('persists and hydrates the exact validated routine snapshot', async () => {
    const routine = createRoutineFixture();
    const stored = await repository().store(routine, {
      editKind: 'generated',
      supersedesRoutineId: null,
      replacement: null,
    });

    expect(stored.value).toEqual(routine);
    expect(stored.status).toBe('ready');
    expect(stored.items).toHaveLength(routine.items.length);
    await expect(
      repository().getLatestReadyForCheckIn(checkInId),
    ).resolves.toEqual(stored);
  });

  it('makes ready routine facts and items immutable in SQLite', async () => {
    const stored = await repository().store(createRoutineFixture(), {
      editKind: 'generated',
      supersedesRoutineId: null,
      replacement: null,
    });

    await expect(
      database.runAsync(
        'UPDATE generated_routines SET seed = ? WHERE id = ?',
        'changed',
        stored.value.routine_id,
      ),
    ).rejects.toThrow(/ready_routine_immutable/);
    await expect(
      database.runAsync(
        'UPDATE routine_items SET item_order = 4 WHERE id = ?',
        stored.items[0]!.id,
      ),
    ).rejects.toThrow(/ready_routine_items_immutable/);
    await expect(
      database.runAsync(
        'DELETE FROM generated_routines WHERE id = ?',
        stored.value.routine_id,
      ),
    ).rejects.toThrow(/ready_routine_immutable/);
  });

  it('allows only the forward lifecycle transitions needed by the player', async () => {
    const stored = await repository().store(createRoutineFixture(), {
      editKind: 'generated',
      supersedesRoutineId: null,
      replacement: null,
    });

    await expect(
      database.runAsync(
        "UPDATE generated_routines SET status = 'started' WHERE id = ?",
        stored.value.routine_id,
      ),
    ).resolves.toMatchObject({ changes: 1 });
    await expect(
      database.runAsync(
        "UPDATE generated_routines SET status = 'completed' WHERE id = ?",
        stored.value.routine_id,
      ),
    ).resolves.toMatchObject({ changes: 1 });
    await expect(
      database.runAsync(
        "UPDATE generated_routines SET status = 'ready' WHERE id = ?",
        stored.value.routine_id,
      ),
    ).rejects.toThrow(/ready_routine_immutable/);
  });

  it('atomically preserves and supersedes the prior routine with lineage', async () => {
    const routines = repository();
    const prior = await routines.store(createRoutineFixture(), {
      editKind: 'generated',
      supersedesRoutineId: null,
      replacement: null,
    });
    const nextId = '52000000-0000-4000-8000-000000000002';
    const next = createRoutineFixture(
      routineFixtureInput(nextId, checkInId, '2026-08-30T12:01:00.000Z'),
    );
    const stored = await routines.store(next, {
      editKind: 'replacement',
      supersedesRoutineId: prior.value.routine_id,
      replacement: {
        newItemOrder: 0,
        replacedRoutineItemId: prior.items[0]!.id,
      },
    });

    expect(stored.supersedesRoutineId).toBe(prior.value.routine_id);
    expect(stored.items[0]).toMatchObject({
      replacesRoutineItemId: prior.items[0]!.id,
      editSource: 'user_replacement',
    });
    await expect(
      routines.getById(prior.value.routine_id),
    ).resolves.toMatchObject({ status: 'superseded' });
    await expect(routines.getLatestReadyForCheckIn(checkInId)).resolves.toEqual(
      stored,
    );
  });

  it('leaves the prior routine ready when supersession cannot commit', async () => {
    const routines = repository();
    const prior = await routines.store(createRoutineFixture(), {
      editKind: 'generated',
      supersedesRoutineId: null,
      replacement: null,
    });
    const next = createRoutineFixture(
      routineFixtureInput(
        '52000000-0000-4000-8000-000000000003',
        checkInId,
        '2026-08-30T12:02:00.000Z',
      ),
    );

    await expect(
      routines.store(next, {
        editKind: 'regenerated',
        supersedesRoutineId: '52000000-0000-4000-8000-000000000099',
        replacement: null,
      }),
    ).rejects.toThrow(/Prior routine/);
    await expect(
      routines.getById(prior.value.routine_id),
    ).resolves.toMatchObject({ status: 'ready' });
    await expect(routines.getById(next.routine_id)).resolves.toBeNull();
  });

  it('prevents two ready recommendations for the same check-in', async () => {
    const routines = repository();
    const prior = await routines.store(createRoutineFixture(), {
      editKind: 'generated',
      supersedesRoutineId: null,
      replacement: null,
    });
    const competing = createRoutineFixture(
      routineFixtureInput(
        '52000000-0000-4000-8000-000000000004',
        checkInId,
        '2026-08-30T12:03:00.000Z',
      ),
    );

    await expect(
      routines.store(competing, {
        editKind: 'generated',
        supersedesRoutineId: null,
        replacement: null,
      }),
    ).rejects.toThrow();
    await expect(routines.getLatestReadyForCheckIn(checkInId)).resolves.toEqual(
      prior,
    );
    await expect(routines.getById(competing.routine_id)).resolves.toBeNull();
  });
});
