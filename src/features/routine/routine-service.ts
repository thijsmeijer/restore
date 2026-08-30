import type { ExerciseCopy } from '@/content/exercise-copy';
import type { Exercise } from '@/content/schemas';
import type { GenerationCatalogRepository } from '@/db/repositories/generation-catalog-repository';
import { exerciseIdentityKey } from '@/db/repositories/generation-catalog-repository';
import type { CheckInRepository } from '@/db/repositories/check-in-repository';
import type { ExerciseLibraryRepository } from '@/db/repositories/exercise-library-repository';
import type { RoutineRepository } from '@/db/repositories/routine-repository';
import type { UserProfileRepository } from '@/db/repositories/user-profile-repository';
import { createUlid } from '@/domain/identifiers';
import type { CheckIn } from '@/features/check-in/check-in';
import type { CheckInMode } from '@/features/check-in/check-in-options';
import { equipmentOptions } from '@/features/onboarding/profile-options';
import type {
  StoredRoutine,
  StoredRoutineItem,
} from '@/features/routine/routine';
import {
  engineeringGenerationRules,
  generateRoutine,
  generatorEngineVersion,
  replaceRoutineItem,
  type GenerationFailureCode,
  type GenerationInput,
  type GenerationRules,
} from '@/generator';

export interface RoutineExercisePresentation {
  readonly exercise: Exercise;
  readonly copy: ExerciseCopy;
}

export interface RoutineDetails {
  readonly routine: StoredRoutine;
  readonly exercises: ReadonlyMap<string, RoutineExercisePresentation>;
}

export type RoutineOperationFailureCode =
  | GenerationFailureCode
  | 'catalog_missing'
  | 'check_in_missing'
  | 'check_in_not_submitted'
  | 'profile_missing'
  | 'routine_missing'
  | 'routine_not_editable'
  | 'routine_operation_failed'
  | 'routine_persistence_failed';

export type RoutineOperationResult =
  | { readonly ok: true; readonly details: RoutineDetails }
  | { readonly ok: false; readonly code: RoutineOperationFailureCode };

export interface RoutineService {
  getById(routineId: string): Promise<RoutineDetails | null>;
  getLatestForCheckIn(checkInId: string): Promise<RoutineDetails | null>;
  generateLatest(): Promise<RoutineOperationResult>;
  regenerate(routineId: string): Promise<RoutineOperationResult>;
  replace(
    routineId: string,
    itemOrder: number,
    replacementExerciseId: string,
  ): Promise<RoutineOperationResult>;
}

export interface RoutineServiceDependencies {
  readonly routines: RoutineRepository;
  readonly checkIns: CheckInRepository;
  readonly profiles: UserProfileRepository;
  readonly library: ExerciseLibraryRepository;
  readonly catalog: GenerationCatalogRepository;
  readonly rules?: GenerationRules;
  readonly clock?: () => Date;
  readonly idFactory?: () => string;
}

const intentByMode: Readonly<
  Partial<Record<CheckInMode, GenerationInput['intent']>>
> = {
  daily_restore: 'mobilize',
  pre_workout_prep: 'prepare_for_load',
  post_workout_reset: 'recover_after_load',
  night_downshift: 'down_regulate',
};

const equipmentSlugById = new Map<string, string>(
  equipmentOptions.map((option) => [option.id, option.slug]),
);

function maximumRating(region: CheckIn['regions'][number]): number | null {
  const values = [region.stiffness, region.soreness, region.discomfort].filter(
    (value): value is number => value !== null,
  );
  return values.length === 0 ? null : Math.max(...values);
}

function itemByOrder(
  routine: StoredRoutine,
  itemOrder: number,
): StoredRoutineItem | null {
  return routine.items.find((item) => item.value.order === itemOrder) ?? null;
}

export class DefaultRoutineService implements RoutineService {
  private readonly rules: GenerationRules;
  private readonly clock: () => Date;
  private readonly idFactory: () => string;

  public constructor(
    private readonly dependencies: RoutineServiceDependencies,
  ) {
    this.rules = dependencies.rules ?? engineeringGenerationRules;
    this.clock = dependencies.clock ?? (() => new Date());
    this.idFactory = dependencies.idFactory ?? createUlid;
  }

  public async getById(routineId: string): Promise<RoutineDetails | null> {
    const routine = await this.dependencies.routines.getById(routineId);
    return routine === null ? null : this.details(routine);
  }

  public async getLatestForCheckIn(
    checkInId: string,
  ): Promise<RoutineDetails | null> {
    const routine =
      await this.dependencies.routines.getLatestReadyForCheckIn(checkInId);
    return routine === null ? null : this.details(routine);
  }

  public async generateLatest(): Promise<RoutineOperationResult> {
    const [checkIn, profile, library, catalog] = await Promise.all([
      this.dependencies.checkIns.getLatest(),
      this.dependencies.profiles.get(),
      this.dependencies.library.list(),
      this.dependencies.catalog.getCurrent(),
    ]);
    if (checkIn === null) return { ok: false, code: 'check_in_missing' };
    if (
      checkIn.captureStatus !== 'submitted' ||
      checkIn.safety === null ||
      checkIn.safetyResult === null ||
      checkIn.safetyRulesVersion === null
    ) {
      return { ok: false, code: 'check_in_not_submitted' };
    }
    if (profile === null) return { ok: false, code: 'profile_missing' };
    if (catalog === null) return { ok: false, code: 'catalog_missing' };

    const routineId = this.idFactory();
    const generatedAt = this.clock().toISOString();
    const input: GenerationInput = {
      schema_version: 2,
      routine_id: routineId,
      check_in_id: checkIn.id,
      generated_at: generatedAt,
      mode: checkIn.mode,
      available_minutes: checkIn.availableMinutes,
      environment: checkIn.environment,
      // Space is not yet captured explicitly. Minimal is the conservative
      // value and cannot admit an exercise that needs more room.
      available_space: 'minimal',
      available_equipment: checkIn.equipmentIds.flatMap((id) => {
        const slug = equipmentSlugById.get(id);
        return slug === undefined ? [] : [slug];
      }),
      unstable_equipment: [],
      safety_state: checkIn.safetyResult,
      safety_rules_version: checkIn.safetyRulesVersion,
      safety_matched_rule_ids: checkIn.safetyRuleIds,
      safety_reason_codes: checkIn.safetyReasonCodes,
      target_regions: checkIn.regions.map((region) => ({
        region_slug: region.regionSlug,
        side: region.side,
        maximum_rating: maximumRating(region),
        symptom_qualities: [],
      })),
      intent: intentByMode[checkIn.mode] ?? null,
      recent_major_trauma: checkIn.safety.reportedSignals.includes(
        'recent_major_trauma',
      ),
      restricted_demand_flags: [],
      profile_goal_slugs: profile.goalSlugs,
      training_context:
        checkIn.training === null
          ? null
          : {
              training_type: checkIn.training.type,
              status: checkIn.training.status,
              stress: checkIn.training.stress,
            },
      preferences: library.map((entry) => ({
        exercise_id: entry.exercise.id,
        favorite: entry.preference.favorite,
        avoid_state: entry.preference.avoidState,
        avoid_until: entry.preference.avoidUntil,
      })),
      response_aggregates: [],
      recent_exercise_ids: [],
      content_version: catalog.content_version,
      engine_version: generatorEngineVersion,
      rules_version: this.rules.rules_version,
      configuration_version: this.rules.configuration_version,
      seed: `routine_${routineId}`,
    };
    const result = generateRoutine(input, catalog, this.rules);
    if (!result.ok) return { ok: false, code: result.code };

    let stored: StoredRoutine;
    try {
      stored = await this.dependencies.routines.store(result, {
        editKind: 'generated',
        supersedesRoutineId: null,
        replacement: null,
      });
    } catch {
      const existing =
        await this.dependencies.routines.getLatestReadyForCheckIn(checkIn.id);
      if (existing !== null) {
        return { ok: true, details: await this.details(existing) };
      }
      return { ok: false, code: 'routine_persistence_failed' };
    }
    return { ok: true, details: await this.details(stored) };
  }

  public async regenerate(routineId: string): Promise<RoutineOperationResult> {
    const [prior, catalog] = await Promise.all([
      this.dependencies.routines.getById(routineId),
      this.dependencies.catalog.getCurrent(),
    ]);
    if (prior === null) return { ok: false, code: 'routine_missing' };
    if (prior.status !== 'ready') {
      return { ok: false, code: 'routine_not_editable' };
    }
    if (catalog === null) return { ok: false, code: 'catalog_missing' };

    const nextId = this.idFactory();
    const generatedAt = this.clock().toISOString();
    const result = generateRoutine(
      {
        ...prior.value.input_snapshot,
        routine_id: nextId,
        generated_at: generatedAt,
        seed: `routine_${nextId}`,
      },
      catalog,
      this.rules,
    );
    if (!result.ok) return { ok: false, code: result.code };
    let stored: StoredRoutine;
    try {
      stored = await this.dependencies.routines.store(result, {
        editKind: 'regenerated',
        supersedesRoutineId: prior.value.routine_id,
        replacement: null,
      });
    } catch {
      return { ok: false, code: 'routine_persistence_failed' };
    }
    return { ok: true, details: await this.details(stored) };
  }

  public async replace(
    routineId: string,
    itemOrder: number,
    replacementExerciseId: string,
  ): Promise<RoutineOperationResult> {
    const [prior, catalog] = await Promise.all([
      this.dependencies.routines.getById(routineId),
      this.dependencies.catalog.getCurrent(),
    ]);
    if (prior === null) return { ok: false, code: 'routine_missing' };
    if (prior.status !== 'ready') {
      return { ok: false, code: 'routine_not_editable' };
    }
    if (catalog === null) return { ok: false, code: 'catalog_missing' };
    const priorItem = itemByOrder(prior, itemOrder);
    if (priorItem === null) {
      return { ok: false, code: 'replacement_unavailable' };
    }

    const result = replaceRoutineItem(
      {
        routine: prior.value,
        item_order: itemOrder,
        replacement_exercise_id: replacementExerciseId,
        routine_id: this.idFactory(),
        generated_at: this.clock().toISOString(),
      },
      catalog,
      this.rules,
    );
    if (!result.ok) return { ok: false, code: result.code };
    let stored: StoredRoutine;
    try {
      stored = await this.dependencies.routines.store(result, {
        editKind: 'replacement',
        supersedesRoutineId: prior.value.routine_id,
        replacement: {
          newItemOrder: itemOrder,
          replacedRoutineItemId: priorItem.id,
        },
      });
    } catch {
      return { ok: false, code: 'routine_persistence_failed' };
    }
    return { ok: true, details: await this.details(stored) };
  }

  private async details(routine: StoredRoutine): Promise<RoutineDetails> {
    const identities = routine.value.items
      .map((item) => ({
        exerciseId: item.exercise_id,
        exerciseVersion: item.exercise_version,
      }))
      .concat(
        routine.value.items.flatMap((item) =>
          item.alternatives.map((alternative) => ({
            exerciseId: alternative.exercise_id,
            exerciseVersion: alternative.exercise_version,
          })),
        ),
      );
    const presentations =
      await this.dependencies.catalog.getExercisePresentations(identities);
    return { routine, exercises: presentations };
  }
}

export function presentationForItem(
  details: RoutineDetails,
  item: StoredRoutineItem,
): RoutineExercisePresentation | null {
  return (
    details.exercises.get(
      exerciseIdentityKey(item.value.exercise_id, item.value.exercise_version),
    ) ?? null
  );
}
