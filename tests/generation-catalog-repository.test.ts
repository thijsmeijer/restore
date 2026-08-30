import { bundledContentInstallation } from '@/content/bundled-catalog';
import { initializeDatabaseConnection } from '@/db/initialize-database';
import {
  exerciseIdentityKey,
  SQLiteGenerationCatalogRepository,
} from '@/db/repositories/generation-catalog-repository';

import { schemaVersionZeroFixture } from './fixtures/database/schema-v0';
import { NodeSQLiteDatabase } from './support/node-sqlite-database';

const timestamp = '2026-08-30T12:00:00.000Z';

describe('SQLite generation catalog', () => {
  let database: NodeSQLiteDatabase;

  beforeEach(async () => {
    database = new NodeSQLiteDatabase();
    await database.execAsync(schemaVersionZeroFixture);
    await initializeDatabaseConnection(database, () => timestamp);
  });

  afterEach(() => database.close());

  it('reads the exact current manifest and exercise presentation from SQLite', async () => {
    const repository = new SQLiteGenerationCatalogRepository(database);
    const source = bundledContentInstallation.exercises[0]!;

    await expect(repository.getCurrent()).resolves.toMatchObject({
      content_version: bundledContentInstallation.contentVersion,
      review_status: 'draft',
      exercises: expect.arrayContaining([
        expect.objectContaining({
          id: source.exercise.id,
          version: source.exercise.version,
        }),
      ]),
      templates: [],
    });
    const presentations = await repository.getExercisePresentations([
      {
        exerciseId: source.exercise.id,
        exerciseVersion: source.exercise.version,
      },
    ]);
    expect(
      presentations.get(
        exerciseIdentityKey(source.exercise.id, source.exercise.version),
      ),
    ).toEqual({ exercise: source.exercise, copy: source.copy });
  });

  it('does not silently substitute a different exercise version', async () => {
    const repository = new SQLiteGenerationCatalogRepository(database);
    const source = bundledContentInstallation.exercises[0]!;
    await expect(
      repository.getExercisePresentations([
        {
          exerciseId: source.exercise.id,
          exerciseVersion: source.exercise.version + 1,
        },
      ]),
    ).resolves.toEqual(new Map());
  });
});
