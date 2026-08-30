import { initializeDatabaseConnection } from '@/db/initialize-database';
import { SQLiteUserProfileRepository } from '@/db/repositories/user-profile-repository';
import type { OnboardingProfileInput } from '@/features/onboarding/profile';
import { currentSafetyRulesVersion } from '@/features/onboarding/profile-options';

import { NodeSQLiteDatabase } from './support/node-sqlite-database';

const firstTimestamp = '2026-08-30T08:00:00.000Z';
const secondTimestamp = '2026-08-30T09:00:00.000Z';

function fullInput(): OnboardingProfileInput {
  return {
    goalSlugs: ['prepare_for_calisthenics', 'reduce_stiffness'],
    bodyBaseline: [
      { regionSlug: 'thoracic_spine', side: 'central' },
      { regionSlug: 'wrist', side: 'right' },
    ],
    equipmentIds: [
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000003',
    ],
    trainingTypes: ['planche', 'pull', 'rest'],
    preferredDurations: { quick: 5, normal: 15, deep: 45 },
    safetyAcknowledged: true,
  };
}

function sequentialIds(): () => string {
  let value = 0;
  return () => `${value++}`.padStart(26, '0');
}

describe('user profile repository', () => {
  let database: NodeSQLiteDatabase;

  beforeEach(async () => {
    database = new NodeSQLiteDatabase();
    await initializeDatabaseConnection(database, () => firstTimestamp);
  });

  afterEach(() => database.close());

  it('stores the complete profile transactionally and reloads its exact ordering', async () => {
    const repository = new SQLiteUserProfileRepository(
      database,
      () => firstTimestamp,
      sequentialIds(),
    );

    const result = await repository.save(fullInput());

    expect(result).toMatchObject({ ok: true });
    await expect(repository.get()).resolves.toEqual({
      id: '00000000000000000000000000',
      goalSlugs: ['prepare_for_calisthenics', 'reduce_stiffness'],
      bodyBaseline: [
        { regionSlug: 'thoracic_spine', side: 'central' },
        { regionSlug: 'wrist', side: 'right' },
      ],
      equipmentIds: [
        '10000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000003',
      ],
      trainingTypes: ['planche', 'pull', 'rest'],
      preferredDurations: { quick: 5, normal: 15, deep: 45 },
      units: null,
      coachingPreference: null,
      onboardingCompletedAt: firstTimestamp,
      safetyRulesVersion: currentSafetyRulesVersion,
      safetyAcknowledgedAt: firstTimestamp,
      createdAt: firstTimestamp,
      updatedAt: firstTimestamp,
    });
  });

  it('allows every non-safety field to be skipped', async () => {
    const repository = new SQLiteUserProfileRepository(
      database,
      () => firstTimestamp,
      sequentialIds(),
    );

    await expect(
      repository.save({
        goalSlugs: [],
        bodyBaseline: [],
        equipmentIds: [],
        trainingTypes: [],
        preferredDurations: { quick: null, normal: null, deep: null },
        safetyAcknowledged: true,
      }),
    ).resolves.toMatchObject({ ok: true });
    await expect(repository.get()).resolves.toMatchObject({
      goalSlugs: [],
      bodyBaseline: [],
      equipmentIds: [],
      trainingTypes: [],
      preferredDurations: { quick: null, normal: null, deep: null },
    });
  });

  it('refuses completion without the safety acknowledgement', async () => {
    const repository = new SQLiteUserProfileRepository(
      database,
      () => firstTimestamp,
      sequentialIds(),
    );
    const input = fullInput();

    const result = await repository.save({
      ...input,
      safetyAcknowledged: false,
    });

    expect(result).toEqual({
      ok: false,
      issues: [
        {
          code: 'profile_safety_acknowledgement_required',
          path: '$.safetyAcknowledged',
        },
      ],
    });
    await expect(repository.get()).resolves.toBeNull();
  });

  it('rejects duplicate, incompatible-side, and invalid-duration input before writing', async () => {
    const repository = new SQLiteUserProfileRepository(
      database,
      () => firstTimestamp,
      sequentialIds(),
    );
    const input = fullInput();

    const result = await repository.save({
      ...input,
      goalSlugs: ['move_better', 'move_better'],
      bodyBaseline: [{ regionSlug: 'thoracic_spine', side: 'left' }],
      preferredDurations: { quick: 30, normal: 10, deep: 91 },
    });

    expect(result).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        { code: 'profile_duplicate_value', path: '$.goalSlugs' },
        {
          code: 'profile_body_side_incompatible',
          path: '$.bodyBaseline[0].side',
        },
        {
          code: 'profile_duration_invalid',
          path: '$.preferredDurations',
        },
      ]),
    });
    await expect(repository.get()).resolves.toBeNull();
  });

  it('edits atomically while preserving profile identity and completion history', async () => {
    let timestamp = firstTimestamp;
    const repository = new SQLiteUserProfileRepository(
      database,
      () => timestamp,
      sequentialIds(),
    );
    await repository.save(fullInput());
    timestamp = secondTimestamp;

    await repository.save({
      ...fullInput(),
      goalSlugs: ['maintain_joints'],
      bodyBaseline: [],
      equipmentIds: [],
      trainingTypes: [],
      preferredDurations: { quick: 10, normal: 20, deep: 60 },
    });

    await expect(repository.get()).resolves.toMatchObject({
      id: '00000000000000000000000000',
      goalSlugs: ['maintain_joints'],
      bodyBaseline: [],
      equipmentIds: [],
      trainingTypes: [],
      preferredDurations: { quick: 10, normal: 20, deep: 60 },
      onboardingCompletedAt: firstTimestamp,
      safetyAcknowledgedAt: firstTimestamp,
      createdAt: firstTimestamp,
      updatedAt: secondTimestamp,
    });
  });

  it('rolls back an edit when a child write fails', async () => {
    const repository = new SQLiteUserProfileRepository(
      database,
      () => firstTimestamp,
      sequentialIds(),
    );
    await repository.save(fullInput());
    const original = await repository.get();
    const duplicateChildIds = new SQLiteUserProfileRepository(
      database,
      () => secondTimestamp,
      () => '00000000000000000000000999',
    );

    await expect(
      duplicateChildIds.save({
        ...fullInput(),
        goalSlugs: ['move_better', 'reduce_stiffness'],
      }),
    ).rejects.toThrow();
    await expect(repository.get()).resolves.toEqual(original);
  });

  it('survives a new repository instance on the same database', async () => {
    const ids = sequentialIds();
    await new SQLiteUserProfileRepository(
      database,
      () => firstTimestamp,
      ids,
    ).save(fullInput());

    const relaunchedRepository = new SQLiteUserProfileRepository(
      database,
      () => secondTimestamp,
      ids,
    );

    await expect(relaunchedRepository.get()).resolves.toMatchObject({
      goalSlugs: fullInput().goalSlugs,
      onboardingCompletedAt: firstTimestamp,
    });
  });

  it('refuses to expose persisted selections that violate the body taxonomy', async () => {
    const repository = new SQLiteUserProfileRepository(
      database,
      () => firstTimestamp,
      sequentialIds(),
    );
    await repository.save(fullInput());
    await database.runAsync(
      `UPDATE profile_body_regions SET side = 'left'
      WHERE region_slug = 'thoracic_spine'`,
    );

    await expect(repository.get()).rejects.toThrow(
      'Stored profile failed validation: profile_body_side_incompatible',
    );
  });
});
