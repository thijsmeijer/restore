import { initializeDatabaseConnection } from '@/db/initialize-database';
import { SQLiteCheckInRepository } from '@/db/repositories/check-in-repository';
import { SQLiteExerciseLibraryRepository } from '@/db/repositories/exercise-library-repository';
import {
  type ExerciseIdentity,
  type GenerationCatalogRepository,
  SQLiteGenerationCatalogRepository,
} from '@/db/repositories/generation-catalog-repository';
import { SQLiteRoutineRepository } from '@/db/repositories/routine-repository';
import { SQLiteUserProfileRepository } from '@/db/repositories/user-profile-repository';
import { DefaultRoutineService } from '@/features/routine/routine-service';

import { schemaVersionZeroFixture } from './fixtures/database/schema-v0';
import { generationCatalog } from './support/generator-fixtures';
import { NodeSQLiteDatabase } from './support/node-sqlite-database';
import {
  routineFixtureAlternativeId,
  routineFixtureExercises,
  routineFixtureRules,
  routineFixtureTemplate,
} from './support/routine-fixtures';

const timestamp = '2026-08-30T12:00:00.000Z';
const routineId = '52000000-0000-4000-8000-000000000020';

class ReviewedFixtureCatalogRepository implements GenerationCatalogRepository {
  public async getCurrent() {
    return generationCatalog(routineFixtureExercises(), [
      routineFixtureTemplate(),
    ]);
  }

  public async getExercisePresentations(
    _identities: readonly ExerciseIdentity[],
  ) {
    return new Map();
  }
}

describe('routine application service', () => {
  let database: NodeSQLiteDatabase;
  let checkIns: SQLiteCheckInRepository;
  let routines: SQLiteRoutineRepository;
  let profiles: SQLiteUserProfileRepository;
  let library: SQLiteExerciseLibraryRepository;

  beforeEach(async () => {
    database = new NodeSQLiteDatabase();
    await database.execAsync(schemaVersionZeroFixture);
    await initializeDatabaseConnection(database, () => timestamp);
    checkIns = new SQLiteCheckInRepository(database, () => new Date(timestamp));
    routines = new SQLiteRoutineRepository(database);
    profiles = new SQLiteUserProfileRepository(database, () => timestamp);
    library = new SQLiteExerciseLibraryRepository(database, () => timestamp);
    const saved = await profiles.save({
      goalSlugs: ['move_better'],
      bodyBaseline: [],
      equipmentIds: ['10000000-0000-4000-8000-000000000001'],
      trainingTypes: ['pull'],
      preferredDurations: { quick: 5, normal: 15, deep: 30 },
      safetyAcknowledged: true,
    });
    if (!saved.ok) throw new Error('profile_fixture_failed');
  });

  afterEach(() => database.close());

  async function submitClearCheckIn() {
    const result = await checkIns.submit({
      mode: 'daily_restore',
      availableMinutes: 5,
      readiness: 4,
      environment: 'home',
      equipmentIds: ['10000000-0000-4000-8000-000000000001'],
      regions: [
        {
          regionSlug: 'thoracic_spine',
          side: 'central',
          stiffness: 4,
          soreness: null,
          discomfort: 2,
        },
      ],
      training: { type: 'pull', status: 'planned', stress: null },
      note: 'This note must not enter routine presentation state.',
      safety: { reportedSignals: [] },
    });
    if (!result.ok) throw new Error('check_in_fixture_failed');
    return result.checkIn;
  }

  it('maps the submitted snapshot conservatively and stores a validated routine', async () => {
    const checkIn = await submitClearCheckIn();
    const service = new DefaultRoutineService({
      routines,
      checkIns,
      profiles,
      library,
      catalog: new ReviewedFixtureCatalogRepository(),
      rules: routineFixtureRules(),
      clock: () => new Date(timestamp),
      idFactory: () => routineId,
    });

    const result = await service.generateLatest();
    expect(result).toMatchObject({
      ok: true,
      details: {
        routine: {
          status: 'ready',
          value: {
            routine_id: routineId,
            check_in_id: checkIn.id,
            input_snapshot: {
              available_space: 'minimal',
              available_equipment: ['mat'],
              target_regions: [expect.objectContaining({ maximum_rating: 4 })],
              training_context: expect.objectContaining({ stress: null }),
            },
          },
        },
      },
    });
    expect(JSON.stringify(result)).not.toContain('This note must not enter');
    await expect(
      routines.getLatestReadyForCheckIn(checkIn.id),
    ).resolves.toMatchObject({ value: { routine_id: routineId } });
    await expect(service.generateLatest()).resolves.toMatchObject({
      ok: true,
      details: { routine: { value: { routine_id: routineId } } },
    });
    await expect(
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM generated_routines',
      ),
    ).resolves.toEqual({ count: 1 });
  });

  it('fails closed against the installed draft catalog without persisting output', async () => {
    await submitClearCheckIn();
    const service = new DefaultRoutineService({
      routines,
      checkIns,
      profiles,
      library,
      catalog: new SQLiteGenerationCatalogRepository(database),
      clock: () => new Date(timestamp),
      idFactory: () => routineId,
    });

    await expect(service.generateLatest()).resolves.toEqual({
      ok: false,
      code: 'catalog_not_clinically_reviewed',
    });
    await expect(
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM generated_routines',
      ),
    ).resolves.toEqual({ count: 0 });
  });

  it('keeps blocked input blocked before any replacement or persistence path', async () => {
    await checkIns.submit({
      mode: 'daily_restore',
      availableMinutes: 5,
      readiness: null,
      environment: 'home',
      equipmentIds: [],
      regions: [],
      training: null,
      note: null,
      safety: { reportedSignals: ['recent_major_trauma'] },
    });
    const service = new DefaultRoutineService({
      routines,
      checkIns,
      profiles,
      library,
      catalog: new ReviewedFixtureCatalogRepository(),
      rules: routineFixtureRules(),
      clock: () => new Date(timestamp),
      idFactory: () => routineId,
    });

    await expect(service.generateLatest()).resolves.toEqual({
      ok: false,
      code: 'blocked_by_safety',
    });
    await expect(
      database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM generated_routines',
      ),
    ).resolves.toEqual({ count: 0 });
  });

  it('wires replacement and regeneration to atomic immutable supersession', async () => {
    await submitClearCheckIn();
    const ids = [
      '52000000-0000-4000-8000-000000000030',
      '52000000-0000-4000-8000-000000000031',
      '52000000-0000-4000-8000-000000000032',
    ];
    const service = new DefaultRoutineService({
      routines,
      checkIns,
      profiles,
      library,
      catalog: new ReviewedFixtureCatalogRepository(),
      rules: routineFixtureRules(),
      clock: () => new Date(timestamp),
      idFactory: () => {
        const id = ids.shift();
        if (id === undefined) throw new Error('routine_id_fixture_exhausted');
        return id;
      },
    });
    const generated = await service.generateLatest();
    if (!generated.ok) throw new Error(`generation_failed:${generated.code}`);

    const replaced = await service.replace(
      generated.details.routine.value.routine_id,
      0,
      routineFixtureAlternativeId,
    );
    expect(replaced).toMatchObject({
      ok: true,
      details: {
        routine: {
          value: {
            routine_id: '52000000-0000-4000-8000-000000000031',
            items: [{ exercise_id: routineFixtureAlternativeId }],
          },
          editKind: 'replacement',
          items: [expect.objectContaining({ editSource: 'user_replacement' })],
        },
      },
    });
    if (!replaced.ok) return;
    await expect(
      routines.getById(generated.details.routine.value.routine_id),
    ).resolves.toMatchObject({ status: 'superseded' });

    const regenerated = await service.regenerate(
      replaced.details.routine.value.routine_id,
    );
    expect(regenerated).toMatchObject({
      ok: true,
      details: {
        routine: {
          value: {
            routine_id: '52000000-0000-4000-8000-000000000032',
          },
          editKind: 'regenerated',
        },
      },
    });
    await expect(
      routines.getById(replaced.details.routine.value.routine_id),
    ).resolves.toMatchObject({ status: 'superseded' });
  });
});
