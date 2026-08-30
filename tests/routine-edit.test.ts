import { replaceRoutineItem } from '@/generator';

import { generationCatalog } from './support/generator-fixtures';
import {
  createRoutineFixture,
  routineFixtureAlternativeId,
  routineFixtureExercises,
  routineFixtureRules,
  routineFixtureSourceId,
  routineFixtureTemplate,
} from './support/routine-fixtures';

describe('ROUTINE-001 validated replacement', () => {
  it('replaces through an eligible reviewed relation and revalidates the result', () => {
    const routine = createRoutineFixture();
    expect(routine.items[0]).toMatchObject({
      exercise_id: routineFixtureSourceId,
      alternatives: [
        expect.objectContaining({ exercise_id: routineFixtureAlternativeId }),
      ],
    });

    const result = replaceRoutineItem(
      {
        routine,
        item_order: 0,
        replacement_exercise_id: routineFixtureAlternativeId,
        routine_id: '52000000-0000-4000-8000-000000000010',
        generated_at: '2026-08-30T12:05:00.000Z',
      },
      generationCatalog(routineFixtureExercises(), [routineFixtureTemplate()]),
      routineFixtureRules(),
    );

    expect(result).toMatchObject({
      ok: true,
      routine_id: '52000000-0000-4000-8000-000000000010',
      validation: { valid: true },
      items: [{ exercise_id: routineFixtureAlternativeId }],
    });
  });

  it('rejects an unlisted replacement without changing the original routine', () => {
    const routine = createRoutineFixture();
    const before = JSON.stringify(routine);

    expect(
      replaceRoutineItem(
        {
          routine,
          item_order: 0,
          replacement_exercise_id: '51000000-0000-4000-8000-000000000099',
          routine_id: '52000000-0000-4000-8000-000000000011',
          generated_at: '2026-08-30T12:06:00.000Z',
        },
        generationCatalog(routineFixtureExercises(), [
          routineFixtureTemplate(),
        ]),
        routineFixtureRules(),
      ),
    ).toMatchObject({ ok: false, code: 'replacement_unavailable' });
    expect(JSON.stringify(routine)).toBe(before);
  });

  it('re-runs the safety gate and cannot replace from blocked input', () => {
    const routine = createRoutineFixture();
    const blocked = {
      ...routine,
      input_snapshot: {
        ...routine.input_snapshot,
        safety_state: 'blocked' as const,
        recent_major_trauma: true,
        safety_matched_rule_ids: ['block_recent_major_trauma_v1'],
        safety_reason_codes: ['reported_recent_major_trauma'],
      },
    };

    expect(
      replaceRoutineItem(
        {
          routine: blocked,
          item_order: 0,
          replacement_exercise_id: routineFixtureAlternativeId,
          routine_id: '52000000-0000-4000-8000-000000000012',
          generated_at: '2026-08-30T12:07:00.000Z',
        },
        generationCatalog(routineFixtureExercises(), [
          routineFixtureTemplate(),
        ]),
        routineFixtureRules(),
      ),
    ).toMatchObject({ ok: false, code: 'blocked_by_safety' });
  });

  it('does not offer a relation that cannot preserve the current sequence slot', () => {
    const exercises = routineFixtureExercises().map((exercise) =>
      structuredClone(exercise),
    );
    exercises[1]!.phases = ['targeted_mobility'];
    const result = createRoutineFixture();
    const regenerated = routineFixtureRules();
    const catalog = generationCatalog(exercises, [routineFixtureTemplate()]);

    // The generated fixture proves the source relation is normally offered;
    // regenerating against the phase-incompatible catalog removes it.
    const source = result.items[0]!;
    expect(source.alternatives).toHaveLength(1);
    const invalid = replaceRoutineItem(
      {
        routine: result,
        item_order: 0,
        replacement_exercise_id: routineFixtureAlternativeId,
        routine_id: '52000000-0000-4000-8000-000000000013',
        generated_at: '2026-08-30T12:08:00.000Z',
      },
      catalog,
      regenerated,
    );
    expect(invalid).toMatchObject({
      ok: false,
      code: 'replacement_unavailable',
    });
  });
});
