import {
  buildPlayerStages,
  createPlayerState,
  currentPlayerStage,
  playerRemainingSeconds,
  reducePlayerState,
  type PlayerRoutineInput,
} from '@/features/player/player-state-machine';

import { createRoutineFixture } from './support/routine-fixtures';

function item(
  order: number,
  prescription: PlayerRoutineInput['items'][number]['value']['prescription'],
): PlayerRoutineInput['items'][number] {
  const base = createRoutineFixture().items[0]!;
  return { value: { ...base, order, prescription } };
}

const timedBilateral = item(0, {
  type: 'timed_movement',
  dose: 10,
  sets: 2,
  tempo: 'controlled',
  side_mode: 'bilateral_sequential',
  side_sequence: ['left', 'right'],
  rest_seconds: 5,
  transition_seconds: 3,
  estimated_duration_seconds: 48,
});

const repetitions = item(1, {
  type: 'repetitions',
  dose: 8,
  sets: 1,
  tempo: 'controlled',
  side_mode: 'central',
  side_sequence: ['central'],
  rest_seconds: 0,
  transition_seconds: 2,
  estimated_duration_seconds: 34,
});

const routine: PlayerRoutineInput = { items: [timedBilateral, repetitions] };

describe('player state machine', () => {
  it('builds exact sides, sets, rest, and transition without changing duration', () => {
    const stages = buildPlayerStages(routine);

    expect(
      stages.map((stage) =>
        stage.kind === 'exercise'
          ? `${stage.kind}:${stage.itemOrder}:${stage.setIndex}:${stage.side}`
          : `${stage.kind}:${stage.itemOrder}`,
      ),
    ).toEqual([
      'exercise:0:0:left',
      'exercise:0:0:right',
      'rest:0',
      'exercise:0:1:left',
      'exercise:0:1:right',
      'transition:0',
      'exercise:1:0:central',
      'transition:1',
    ]);
    expect(
      stages.reduce((total, stage) => total + stage.plannedSeconds, 0),
    ).toBe(82);
    expect(stages[5]).toMatchObject({ nextItemOrder: 1, plannedSeconds: 3 });
    expect(stages[7]).toMatchObject({ nextItemOrder: null, plannedSeconds: 2 });
  });

  it('auto-advances timed, rest, and transition stages but waits on manual dose', () => {
    let state = createPlayerState(routine);
    expect(playerRemainingSeconds(state)).toBe(82);

    state = reducePlayerState(state, { type: 'tick', seconds: 48 });
    expect(currentPlayerStage(state)).toMatchObject({
      kind: 'exercise',
      itemOrder: 1,
      prescriptionType: 'repetitions',
    });
    expect(state.elapsedSeconds).toBe(48);

    state = reducePlayerState(state, { type: 'tick', seconds: 60 });
    expect(currentPlayerStage(state)).toMatchObject({
      kind: 'exercise',
      itemOrder: 1,
    });
    expect(playerRemainingSeconds(state)).toBe(2);

    state = reducePlayerState(state, { type: 'next' });
    expect(currentPlayerStage(state)).toMatchObject({ kind: 'transition' });
    state = reducePlayerState(state, { type: 'tick', seconds: 2 });
    expect(state.status).toBe('completed');
  });

  it('pauses immediately on a wrong response and cannot auto-advance unresolved', () => {
    let state = createPlayerState(routine);
    state = reducePlayerState(state, { type: 'feels_wrong' });

    expect(state.status).toBe('wrong_prompt');
    expect(state.responses[0]).toBe('uncomfortable');
    expect(reducePlayerState(state, { type: 'tick', seconds: 30 })).toEqual(
      state,
    );
    expect(reducePlayerState(state, { type: 'next' })).toEqual(state);

    state = reducePlayerState(state, { type: 'resolve_wrong_skip' });
    expect(state.status).toBe('running');
    expect(state.stoppedWrongItemOrders).toEqual([0]);
    expect(currentPlayerStage(state)).toMatchObject({
      kind: 'exercise',
      itemOrder: 1,
    });
  });

  it('supports pause, resume, previous, skip, and confirmed early finish', () => {
    let state = createPlayerState(routine);
    state = reducePlayerState(state, { type: 'tick', seconds: 10 });
    expect(currentPlayerStage(state)).toMatchObject({ side: 'right' });

    state = reducePlayerState(state, { type: 'previous' });
    expect(currentPlayerStage(state)).toMatchObject({ side: 'left' });
    state = reducePlayerState(state, { type: 'pause' });
    expect(state.status).toBe('paused');
    expect(reducePlayerState(state, { type: 'tick' })).toEqual(state);
    state = reducePlayerState(state, { type: 'resume' });
    expect(state.status).toBe('running');

    state = reducePlayerState(state, { type: 'skip' });
    expect(state.skippedItemOrders).toEqual([0]);
    expect(currentPlayerStage(state)).toMatchObject({ itemOrder: 1 });

    state = reducePlayerState(state, { type: 'request_finish' });
    expect(state.status).toBe('finish_prompt');
    expect(reducePlayerState(state, { type: 'tick' })).toEqual(state);
    state = reducePlayerState(state, { type: 'cancel_finish' });
    expect(state.status).toBe('running');
    state = reducePlayerState(state, { type: 'request_finish' });
    state = reducePlayerState(state, { type: 'confirm_finish' });
    expect(state.status).toBe('finished_early');
  });
});
