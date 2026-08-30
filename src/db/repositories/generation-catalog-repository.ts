import { z } from 'zod';

import { exerciseCopySchema, type ExerciseCopy } from '@/content/exercise-copy';
import {
  contentManifestSchema,
  exerciseSchema,
  type Exercise,
} from '@/content/schemas';
import type { DatabaseConnection } from '@/db/database';
import type { GenerationCatalog } from '@/generator';

interface ContentPackRow {
  readonly content_version: string;
  readonly review_status: GenerationCatalog['review_status'];
  readonly manifest_json: string;
}

interface ExercisePayloadRow {
  readonly exercise_id: string;
  readonly version: number;
  readonly payload_json: string;
}

const exercisePayloadSchema = z.strictObject({
  exercise: exerciseSchema,
  copy: exerciseCopySchema,
});

export interface ExerciseIdentity {
  readonly exerciseId: string;
  readonly exerciseVersion: number;
}

export interface ExercisePresentation {
  readonly exercise: Exercise;
  readonly copy: ExerciseCopy;
}

export interface GenerationCatalogRepository {
  getCurrent(): Promise<GenerationCatalog | null>;
  getExercisePresentations(
    identities: readonly ExerciseIdentity[],
  ): Promise<ReadonlyMap<string, ExercisePresentation>>;
}

export function exerciseIdentityKey(
  exerciseId: string,
  exerciseVersion: number,
): string {
  return `${exerciseId}@${exerciseVersion}`;
}

export class SQLiteGenerationCatalogRepository implements GenerationCatalogRepository {
  public constructor(private readonly database: DatabaseConnection) {}

  public async getCurrent(): Promise<GenerationCatalog | null> {
    const row = await this.database.getFirstAsync<ContentPackRow>(
      `SELECT content_packs.content_version, content_packs.review_status,
        content_packs.manifest_json
      FROM content_packs
      JOIN schema_metadata
        ON schema_metadata.content_version = content_packs.content_version
      LIMIT 1`,
    );
    if (row === null) return null;

    const manifest = contentManifestSchema.parse(JSON.parse(row.manifest_json));
    if (
      manifest.content_version !== row.content_version ||
      manifest.review_status !== row.review_status
    ) {
      throw new Error('Installed generation catalog metadata is inconsistent.');
    }
    return {
      content_version: row.content_version,
      review_status: row.review_status,
      exercises: manifest.exercises,
      templates: manifest.routine_templates,
    };
  }

  public async getExercisePresentations(
    identities: readonly ExerciseIdentity[],
  ): Promise<ReadonlyMap<string, ExercisePresentation>> {
    const result = new Map<string, ExercisePresentation>();
    for (const identity of identities) {
      const row = await this.database.getFirstAsync<ExercisePayloadRow>(
        `SELECT exercise_id, version, payload_json FROM exercises
        WHERE exercise_id = ? AND version = ?`,
        identity.exerciseId,
        identity.exerciseVersion,
      );
      if (row === null) continue;
      const payload = exercisePayloadSchema.parse(JSON.parse(row.payload_json));
      if (
        payload.exercise.id !== row.exercise_id ||
        payload.exercise.version !== row.version
      ) {
        throw new Error('Stored exercise presentation is inconsistent.');
      }
      result.set(exerciseIdentityKey(row.exercise_id, row.version), payload);
    }
    return result;
  }
}
