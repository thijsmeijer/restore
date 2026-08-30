import { z } from 'zod';

import { exerciseCopySchema } from '@/content/exercise-copy';
import { exerciseSchema } from '@/content/schemas';
import type { DatabaseConnection } from '@/db/database';
import { createUlid } from '@/domain/identifiers';
import type {
  ExerciseAvoidState,
  LibraryExercise,
} from '@/features/library/library';

interface ExerciseRow {
  readonly content_version: string;
  readonly payload_json: string;
  readonly favorite: number | null;
  readonly avoid_state: ExerciseAvoidState | null;
  readonly avoid_until: string | null;
}

interface IdRow {
  readonly id: string;
}

const payloadSchema = z.strictObject({
  exercise: exerciseSchema,
  copy: exerciseCopySchema,
});

interface PreferenceRow {
  readonly id: string;
  readonly favorite: number;
  readonly avoid_state: ExerciseAvoidState;
  readonly avoid_until: string | null;
  readonly created_at: string;
}

export type SaveExercisePreferenceResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly code: 'profile_missing' | 'exercise_missing';
    };

export interface ExerciseLibraryRepository {
  list(): Promise<readonly LibraryExercise[]>;
  setFavorite(
    exerciseId: string,
    favorite: boolean,
  ): Promise<SaveExercisePreferenceResult>;
  setAvoided(
    exerciseId: string,
    avoided: boolean,
  ): Promise<SaveExercisePreferenceResult>;
}

export class SQLiteExerciseLibraryRepository implements ExerciseLibraryRepository {
  public constructor(
    private readonly database: DatabaseConnection,
    private readonly now: () => string = () => new Date().toISOString(),
    private readonly idFactory: () => string = createUlid,
  ) {}

  public async list(): Promise<readonly LibraryExercise[]> {
    const profile = await this.database.getFirstAsync<IdRow>(
      'SELECT id FROM user_profiles LIMIT 1',
    );
    const rows = await this.database.getAllAsync<ExerciseRow>(
      `SELECT
        exercises.content_version,
        exercises.payload_json,
        exercise_preferences.favorite,
        exercise_preferences.avoid_state,
        exercise_preferences.avoid_until
      FROM exercises
      JOIN schema_metadata
        ON schema_metadata.content_version = exercises.content_version
      LEFT JOIN exercise_preferences
        ON exercise_preferences.exercise_id = exercises.exercise_id
        AND exercise_preferences.user_profile_id = ?
      WHERE exercises.review_status != 'retired'
      ORDER BY exercises.name COLLATE NOCASE, exercises.exercise_id`,
      profile?.id ?? '',
    );

    return rows.map((row) => {
      const payload = payloadSchema.parse(JSON.parse(row.payload_json));
      return {
        contentVersion: row.content_version,
        exercise: payload.exercise,
        copy: payload.copy,
        preference: {
          favorite: row.favorite === 1,
          avoidState: row.avoid_state ?? 'none',
          avoidUntil: row.avoid_until,
        },
      };
    });
  }

  public setFavorite(
    exerciseId: string,
    favorite: boolean,
  ): Promise<SaveExercisePreferenceResult> {
    return this.updatePreference(exerciseId, (current) => ({
      favorite,
      avoidState: current?.avoid_state ?? 'none',
      avoidUntil: current?.avoid_until ?? null,
    }));
  }

  public setAvoided(
    exerciseId: string,
    avoided: boolean,
  ): Promise<SaveExercisePreferenceResult> {
    return this.updatePreference(exerciseId, (current) => ({
      favorite: current?.favorite === 1,
      avoidState: avoided ? 'permanent' : 'none',
      avoidUntil: null,
    }));
  }

  private async updatePreference(
    exerciseId: string,
    update: (current: PreferenceRow | null) => {
      readonly favorite: boolean;
      readonly avoidState: ExerciseAvoidState;
      readonly avoidUntil: string | null;
    },
  ): Promise<SaveExercisePreferenceResult> {
    let result: SaveExercisePreferenceResult = {
      ok: false,
      code: 'profile_missing',
    };
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const profile = await transaction.getFirstAsync<IdRow>(
        'SELECT id FROM user_profiles LIMIT 1',
      );
      if (profile === null) return;

      const exercise = await transaction.getFirstAsync<IdRow>(
        `SELECT exercises.exercise_id AS id
        FROM exercises
        JOIN schema_metadata
          ON schema_metadata.content_version = exercises.content_version
        WHERE exercises.exercise_id = ? AND exercises.review_status != 'retired'
        LIMIT 1`,
        exerciseId,
      );
      if (exercise === null) {
        result = { ok: false, code: 'exercise_missing' };
        return;
      }

      const current = await transaction.getFirstAsync<PreferenceRow>(
        `SELECT id, favorite, avoid_state, avoid_until, created_at
        FROM exercise_preferences
        WHERE user_profile_id = ? AND exercise_id = ?`,
        profile.id,
        exerciseId,
      );
      const next = update(current);
      if (!next.favorite && next.avoidState === 'none') {
        await transaction.runAsync(
          `DELETE FROM exercise_preferences
          WHERE user_profile_id = ? AND exercise_id = ?`,
          profile.id,
          exerciseId,
        );
      } else {
        const timestamp = this.now();
        await transaction.runAsync(
          `INSERT INTO exercise_preferences (
            id, user_profile_id, exercise_id, favorite, avoid_state,
            avoid_until, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_profile_id, exercise_id) DO UPDATE SET
            favorite = excluded.favorite,
            avoid_state = excluded.avoid_state,
            avoid_until = excluded.avoid_until,
            updated_at = excluded.updated_at`,
          current?.id ?? this.idFactory(),
          profile.id,
          exerciseId,
          next.favorite ? 1 : 0,
          next.avoidState,
          next.avoidUntil,
          current?.created_at ?? timestamp,
          timestamp,
        );
      }

      result = { ok: true };
    });
    return result;
  }
}
