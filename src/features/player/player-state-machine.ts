import type { GeneratedRoutineItem } from '@/generator/types';

type PlayerPrescription = GeneratedRoutineItem['prescription'];

export type PlayerResponse = 'helpful' | 'neutral' | 'uncomfortable';

export type PlayerStatus =
  | 'running'
  | 'paused'
  | 'wrong_prompt'
  | 'finish_prompt'
  | 'completed'
  | 'finished_early';

interface BasePlayerStage {
  readonly itemOrder: number;
  readonly plannedSeconds: number;
}

export interface ExercisePlayerStage extends BasePlayerStage {
  readonly kind: 'exercise';
  readonly setIndex: number;
  readonly totalSets: number;
  readonly sideIndex: number;
  readonly totalSides: number;
  readonly side: PlayerPrescription['side_sequence'][number];
  readonly dose: number;
  readonly prescriptionType: PlayerPrescription['type'];
  readonly automatic: boolean;
}

export interface RestPlayerStage extends BasePlayerStage {
  readonly kind: 'rest';
  readonly completedSet: number;
  readonly totalSets: number;
}

export interface TransitionPlayerStage extends BasePlayerStage {
  readonly kind: 'transition';
  readonly nextItemOrder: number | null;
}

export type PlayerStage =
  ExercisePlayerStage | RestPlayerStage | TransitionPlayerStage;

export interface PlayerRoutineInput {
  readonly items: readonly {
    readonly value: Pick<GeneratedRoutineItem, 'order' | 'prescription'>;
  }[];
}

export interface PlayerState {
  readonly status: PlayerStatus;
  readonly stages: readonly PlayerStage[];
  readonly stageIndex: number;
  readonly stageElapsedSeconds: number;
  readonly elapsedSeconds: number;
  readonly responses: Readonly<Record<number, PlayerResponse>>;
  readonly skippedItemOrders: readonly number[];
  readonly stoppedWrongItemOrders: readonly number[];
  readonly resumeAfterFinishPrompt: boolean;
}

export type PlayerEvent =
  | { readonly type: 'tick'; readonly seconds?: number }
  | { readonly type: 'pause' }
  | { readonly type: 'resume' }
  | { readonly type: 'next' }
  | { readonly type: 'previous' }
  | { readonly type: 'skip' }
  | {
      readonly type: 'respond';
      readonly response: Exclude<PlayerResponse, 'uncomfortable'>;
    }
  | { readonly type: 'feels_wrong' }
  | { readonly type: 'resolve_wrong_skip' }
  | { readonly type: 'resolve_wrong_end' }
  | { readonly type: 'request_finish' }
  | { readonly type: 'cancel_finish' }
  | { readonly type: 'confirm_finish' };

function isAutomaticPrescription(
  type: ExercisePlayerStage['prescriptionType'],
): boolean {
  return type === 'timed_hold' || type === 'timed_movement';
}

function allocateActiveSeconds(
  totalSeconds: number,
  count: number,
): readonly number[] {
  const boundedTotal = Math.max(count, totalSeconds);
  const base = Math.floor(boundedTotal / count);
  const remainder = boundedTotal % count;
  return Array.from({ length: count }, (_, index) =>
    index < remainder ? base + 1 : base,
  );
}

export function buildPlayerStages(
  routine: PlayerRoutineInput,
): readonly PlayerStage[] {
  const stages: PlayerStage[] = [];
  const orderedItems = [...routine.items].sort(
    (left, right) => left.value.order - right.value.order,
  );

  orderedItems.forEach((item, itemIndex) => {
    const prescription = item.value.prescription;
    const sides = prescription.side_sequence;
    const activeStageCount = prescription.sets * sides.length;
    const restTotal =
      prescription.rest_seconds * Math.max(0, prescription.sets - 1);
    const activeTotal =
      prescription.estimated_duration_seconds -
      restTotal -
      prescription.transition_seconds;
    const activeSeconds = allocateActiveSeconds(activeTotal, activeStageCount);
    let activeIndex = 0;

    for (let setIndex = 0; setIndex < prescription.sets; setIndex += 1) {
      sides.forEach((side, sideIndex) => {
        stages.push({
          kind: 'exercise',
          itemOrder: item.value.order,
          plannedSeconds: activeSeconds[activeIndex]!,
          setIndex,
          totalSets: prescription.sets,
          sideIndex,
          totalSides: sides.length,
          side,
          dose: prescription.dose,
          prescriptionType: prescription.type,
          automatic: isAutomaticPrescription(prescription.type),
        });
        activeIndex += 1;
      });

      if (setIndex < prescription.sets - 1 && prescription.rest_seconds > 0) {
        stages.push({
          kind: 'rest',
          itemOrder: item.value.order,
          plannedSeconds: prescription.rest_seconds,
          completedSet: setIndex + 1,
          totalSets: prescription.sets,
        });
      }
    }

    if (prescription.transition_seconds > 0) {
      stages.push({
        kind: 'transition',
        itemOrder: item.value.order,
        plannedSeconds: prescription.transition_seconds,
        nextItemOrder: orderedItems[itemIndex + 1]?.value.order ?? null,
      });
    }
  });

  return stages;
}

export function createPlayerState(routine: PlayerRoutineInput): PlayerState {
  const stages = buildPlayerStages(routine);
  return {
    status: stages.length === 0 ? 'completed' : 'running',
    stages,
    stageIndex: stages.length === 0 ? -1 : 0,
    stageElapsedSeconds: 0,
    elapsedSeconds: 0,
    responses: {},
    skippedItemOrders: [],
    stoppedWrongItemOrders: [],
    resumeAfterFinishPrompt: false,
  };
}

export function currentPlayerStage(state: PlayerState): PlayerStage | null {
  return state.stages[state.stageIndex] ?? null;
}

export function playerRemainingSeconds(state: PlayerState): number {
  if (state.stageIndex < 0 || state.status === 'completed') return 0;
  return state.stages.reduce((total, stage, index) => {
    if (index < state.stageIndex) return total;
    if (index === state.stageIndex) {
      return (
        total + Math.max(0, stage.plannedSeconds - state.stageElapsedSeconds)
      );
    }
    return total + stage.plannedSeconds;
  }, 0);
}

function completedState(state: PlayerState): PlayerState {
  return {
    ...state,
    status: 'completed',
    stageIndex: state.stages.length,
    stageElapsedSeconds: 0,
    resumeAfterFinishPrompt: false,
  };
}

function advanceOneStage(state: PlayerState): PlayerState {
  const nextIndex = state.stageIndex + 1;
  if (nextIndex >= state.stages.length) return completedState(state);
  return { ...state, stageIndex: nextIndex, stageElapsedSeconds: 0 };
}

function findNextExerciseIndex(
  state: PlayerState,
  itemOrder: number,
): number | null {
  for (
    let index = state.stageIndex + 1;
    index < state.stages.length;
    index += 1
  ) {
    const stage = state.stages[index]!;
    if (stage.kind === 'exercise' && stage.itemOrder !== itemOrder)
      return index;
  }
  return null;
}

function skipCurrentItem(
  state: PlayerState,
  result: 'skipped' | 'stopped_wrong',
): PlayerState {
  const stage = currentPlayerStage(state);
  if (stage === null) return state;
  const nextIndex = findNextExerciseIndex(state, stage.itemOrder);
  const skippedItemOrders =
    result === 'skipped' && !state.skippedItemOrders.includes(stage.itemOrder)
      ? [...state.skippedItemOrders, stage.itemOrder]
      : state.skippedItemOrders;
  const stoppedWrongItemOrders =
    result === 'stopped_wrong' &&
    !state.stoppedWrongItemOrders.includes(stage.itemOrder)
      ? [...state.stoppedWrongItemOrders, stage.itemOrder]
      : state.stoppedWrongItemOrders;

  if (nextIndex === null) {
    return completedState({
      ...state,
      skippedItemOrders,
      stoppedWrongItemOrders,
    });
  }
  return {
    ...state,
    status: 'running',
    stageIndex: nextIndex,
    stageElapsedSeconds: 0,
    skippedItemOrders,
    stoppedWrongItemOrders,
  };
}

function tick(state: PlayerState, seconds: number): PlayerState {
  if (state.status !== 'running' || seconds <= 0) return state;
  let next = { ...state, elapsedSeconds: state.elapsedSeconds + seconds };
  let remainingTick = seconds;

  while (remainingTick > 0) {
    const stage = currentPlayerStage(next);
    if (stage === null) return completedState(next);
    const remainingStage = Math.max(
      0,
      stage.plannedSeconds - next.stageElapsedSeconds,
    );

    if (stage.kind === 'exercise' && !stage.automatic) {
      return {
        ...next,
        stageElapsedSeconds: Math.min(
          stage.plannedSeconds,
          next.stageElapsedSeconds + remainingTick,
        ),
      };
    }

    if (remainingTick < remainingStage) {
      return {
        ...next,
        stageElapsedSeconds: next.stageElapsedSeconds + remainingTick,
      };
    }

    remainingTick -= remainingStage;
    next = advanceOneStage(next);
    if (next.status === 'completed') return next;
  }

  return next;
}

function previousExerciseIndex(state: PlayerState): number | null {
  for (let index = state.stageIndex - 1; index >= 0; index -= 1) {
    if (state.stages[index]?.kind === 'exercise') return index;
  }
  return null;
}

export function reducePlayerState(
  state: PlayerState,
  event: PlayerEvent,
): PlayerState {
  switch (event.type) {
    case 'tick':
      return tick(state, event.seconds ?? 1);
    case 'pause':
      return state.status === 'running'
        ? { ...state, status: 'paused' }
        : state;
    case 'resume':
      return state.status === 'paused'
        ? { ...state, status: 'running' }
        : state;
    case 'next':
      return state.status === 'running' || state.status === 'paused'
        ? advanceOneStage(state)
        : state;
    case 'previous': {
      if (state.status !== 'running' && state.status !== 'paused') return state;
      const previousIndex = previousExerciseIndex(state);
      return previousIndex === null
        ? state
        : { ...state, stageIndex: previousIndex, stageElapsedSeconds: 0 };
    }
    case 'skip':
      return state.status === 'running' || state.status === 'paused'
        ? skipCurrentItem(state, 'skipped')
        : state;
    case 'respond': {
      const stage = currentPlayerStage(state);
      if (
        stage === null ||
        (state.status !== 'running' && state.status !== 'paused')
      ) {
        return state;
      }
      return {
        ...state,
        responses: { ...state.responses, [stage.itemOrder]: event.response },
      };
    }
    case 'feels_wrong': {
      const stage = currentPlayerStage(state);
      if (
        stage === null ||
        (state.status !== 'running' && state.status !== 'paused')
      ) {
        return state;
      }
      return {
        ...state,
        status: 'wrong_prompt',
        responses: {
          ...state.responses,
          [stage.itemOrder]: 'uncomfortable',
        },
      };
    }
    case 'resolve_wrong_skip':
      return state.status === 'wrong_prompt'
        ? skipCurrentItem(state, 'stopped_wrong')
        : state;
    case 'resolve_wrong_end':
      return state.status === 'wrong_prompt'
        ? { ...state, status: 'finished_early' }
        : state;
    case 'request_finish':
      return state.status === 'running' || state.status === 'paused'
        ? {
            ...state,
            status: 'finish_prompt',
            resumeAfterFinishPrompt: state.status === 'running',
          }
        : state;
    case 'cancel_finish':
      return state.status === 'finish_prompt'
        ? {
            ...state,
            status: state.resumeAfterFinishPrompt ? 'running' : 'paused',
            resumeAfterFinishPrompt: false,
          }
        : state;
    case 'confirm_finish':
      return state.status === 'finish_prompt'
        ? {
            ...state,
            status: 'finished_early',
            resumeAfterFinishPrompt: false,
          }
        : state;
  }
}
