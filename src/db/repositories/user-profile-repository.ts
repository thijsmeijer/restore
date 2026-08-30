import type { DatabaseConnection, DatabaseExecutor } from '@/db/database';
import { createUlid } from '@/domain/identifiers';
import {
  currentSafetyRulesVersion,
  type BodyRegionSlug,
  type BodySide,
  type GoalSlug,
  type TrainingType,
} from '@/features/onboarding/profile-options';
import {
  type OnboardingProfileInput,
  type SaveProfileResult,
  type UserProfile,
  validateProfileInput,
} from '@/features/onboarding/profile';

interface ProfileRow {
  readonly id: string;
  readonly preferred_quick_minutes: number | null;
  readonly preferred_normal_minutes: number | null;
  readonly preferred_deep_minutes: number | null;
  readonly units: UserProfile['units'];
  readonly coaching_preference: UserProfile['coachingPreference'];
  readonly onboarding_completed_at: string;
  readonly safety_rules_version: string;
  readonly safety_acknowledged_at: string;
  readonly created_at: string;
  readonly updated_at: string;
}

interface GoalRow {
  readonly goal_slug: GoalSlug;
}

interface BodyRegionRow {
  readonly region_slug: BodyRegionSlug;
  readonly side: BodySide;
}

interface EquipmentRow {
  readonly equipment_id: string;
}

interface TrainingTypeRow {
  readonly training_type: TrainingType;
}

export interface UserProfileRepository {
  get(): Promise<UserProfile | null>;
  save(input: OnboardingProfileInput): Promise<SaveProfileResult>;
}

export class SQLiteUserProfileRepository implements UserProfileRepository {
  public constructor(
    private readonly database: DatabaseConnection,
    private readonly now: () => string = () => new Date().toISOString(),
    private readonly idFactory: () => string = createUlid,
  ) {}

  public async get(): Promise<UserProfile | null> {
    return this.read(this.database);
  }

  public async save(input: OnboardingProfileInput): Promise<SaveProfileResult> {
    const validation = validateProfileInput(input);
    if (!validation.ok) return validation;

    let savedProfile: UserProfile | null = null;
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const existing = await transaction.getFirstAsync<ProfileRow>(
        'SELECT * FROM user_profiles LIMIT 1',
      );
      const timestamp = this.now();
      const profileId = existing?.id ?? this.idFactory();
      const createdAt = existing?.created_at ?? timestamp;
      const safetyAcknowledgedAt =
        existing?.safety_rules_version === currentSafetyRulesVersion
          ? existing.safety_acknowledged_at
          : timestamp;

      await transaction.runAsync(
        `INSERT INTO user_profiles (
          id,
          preferred_quick_minutes,
          preferred_normal_minutes,
          preferred_deep_minutes,
          units,
          coaching_preference,
          onboarding_completed_at,
          safety_rules_version,
          safety_acknowledged_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          preferred_quick_minutes = excluded.preferred_quick_minutes,
          preferred_normal_minutes = excluded.preferred_normal_minutes,
          preferred_deep_minutes = excluded.preferred_deep_minutes,
          onboarding_completed_at = excluded.onboarding_completed_at,
          safety_rules_version = excluded.safety_rules_version,
          safety_acknowledged_at = excluded.safety_acknowledged_at,
          updated_at = excluded.updated_at`,
        profileId,
        validation.value.preferredDurations.quick,
        validation.value.preferredDurations.normal,
        validation.value.preferredDurations.deep,
        existing?.onboarding_completed_at ?? timestamp,
        currentSafetyRulesVersion,
        safetyAcknowledgedAt,
        createdAt,
        timestamp,
      );

      await transaction.runAsync(
        'DELETE FROM profile_goals WHERE user_profile_id = ?',
        profileId,
      );
      await transaction.runAsync(
        'DELETE FROM profile_body_regions WHERE user_profile_id = ?',
        profileId,
      );
      await transaction.runAsync(
        'DELETE FROM user_equipment WHERE user_profile_id = ?',
        profileId,
      );
      await transaction.runAsync(
        'DELETE FROM profile_training_split WHERE user_profile_id = ?',
        profileId,
      );

      for (const [
        sortOrder,
        goalSlug,
      ] of validation.value.goalSlugs.entries()) {
        await transaction.runAsync(
          `INSERT INTO profile_goals (id, user_profile_id, goal_slug, sort_order)
          VALUES (?, ?, ?, ?)`,
          this.idFactory(),
          profileId,
          goalSlug,
          sortOrder,
        );
      }
      for (const selection of validation.value.bodyBaseline) {
        await transaction.runAsync(
          `INSERT INTO profile_body_regions (id, user_profile_id, region_slug, side)
          VALUES (?, ?, ?, ?)`,
          this.idFactory(),
          profileId,
          selection.regionSlug,
          selection.side,
        );
      }
      for (const equipmentId of validation.value.equipmentIds) {
        await transaction.runAsync(
          `INSERT INTO user_equipment (
            id, user_profile_id, equipment_id, environment, available, note, created_at, updated_at
          ) VALUES (?, ?, ?, 'home', 1, NULL, ?, ?)`,
          this.idFactory(),
          profileId,
          equipmentId,
          timestamp,
          timestamp,
        );
      }
      for (const [
        sortOrder,
        trainingType,
      ] of validation.value.trainingTypes.entries()) {
        await transaction.runAsync(
          `INSERT INTO profile_training_split (
            id, user_profile_id, training_type, sort_order
          ) VALUES (?, ?, ?, ?)`,
          this.idFactory(),
          profileId,
          trainingType,
          sortOrder,
        );
      }

      savedProfile = await this.read(transaction);
    });

    if (savedProfile === null) {
      throw new Error('Profile save completed without a readable profile.');
    }

    return { ok: true, profile: savedProfile };
  }

  private async read(database: DatabaseExecutor): Promise<UserProfile | null> {
    const row = await database.getFirstAsync<ProfileRow>(
      'SELECT * FROM user_profiles LIMIT 1',
    );
    if (row === null) return null;

    const goals = await database.getAllAsync<GoalRow>(
      `SELECT goal_slug FROM profile_goals
      WHERE user_profile_id = ? ORDER BY sort_order`,
      row.id,
    );
    const bodyBaseline = await database.getAllAsync<BodyRegionRow>(
      `SELECT region_slug, side FROM profile_body_regions
      WHERE user_profile_id = ? ORDER BY rowid`,
      row.id,
    );
    const equipment = await database.getAllAsync<EquipmentRow>(
      `SELECT equipment_id FROM user_equipment
      WHERE user_profile_id = ? AND environment = 'home' AND available = 1
      ORDER BY rowid`,
      row.id,
    );
    const trainingTypes = await database.getAllAsync<TrainingTypeRow>(
      `SELECT training_type FROM profile_training_split
      WHERE user_profile_id = ? ORDER BY sort_order`,
      row.id,
    );
    const storedInput: OnboardingProfileInput = {
      goalSlugs: goals.map((entry) => entry.goal_slug),
      bodyBaseline: bodyBaseline.map((entry) => ({
        regionSlug: entry.region_slug,
        side: entry.side,
      })),
      equipmentIds: equipment.map((entry) => entry.equipment_id),
      trainingTypes: trainingTypes.map((entry) => entry.training_type),
      preferredDurations: {
        quick: row.preferred_quick_minutes,
        normal: row.preferred_normal_minutes,
        deep: row.preferred_deep_minutes,
      },
      safetyAcknowledged: true,
    };
    const validation = validateProfileInput(storedInput);
    if (!validation.ok) {
      throw new Error(
        `Stored profile failed validation: ${validation.issues.map((entry) => entry.code).join(',')}`,
      );
    }

    return {
      id: row.id,
      goalSlugs: validation.value.goalSlugs,
      bodyBaseline: validation.value.bodyBaseline,
      equipmentIds: validation.value.equipmentIds,
      trainingTypes: validation.value.trainingTypes,
      preferredDurations: validation.value.preferredDurations,
      units: row.units,
      coachingPreference: row.coaching_preference,
      onboardingCompletedAt: row.onboarding_completed_at,
      safetyRulesVersion: row.safety_rules_version,
      safetyAcknowledgedAt: row.safety_acknowledged_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
