import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { OptionChip } from '@/components/option-chip';
import { Screen } from '@/components/screen';
import { stableIdSchema } from '@/content/schemas';
import { exerciseIdentityKey } from '@/db/repositories/generation-catalog-repository';
import { radius, spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';
import type { ExerciseCopy } from '@/content/exercise-copy';
import type { GeneratedRoutineItem } from '@/generator/types';
import {
  createPlayerState,
  currentPlayerStage,
  playerRemainingSeconds,
  reducePlayerState,
  type ExercisePlayerStage,
  type PlayerEvent,
  type PlayerState,
} from '@/features/player/player-state-machine';
import { useRoutines } from '@/features/routine/routine-context';

function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function doseLabel(stage: ExercisePlayerStage): string {
  const dose = stage.dose;
  switch (stage.prescriptionType) {
    case 'repetitions':
      return `${dose} ${dose === 1 ? 'rep' : 'reps'}`;
    case 'breathing_cycles':
      return `${dose} ${dose === 1 ? 'breath' : 'breaths'}`;
    case 'reassessment':
      return 'One quick check';
    case 'timed_hold':
    case 'timed_movement':
      return formatClock(stage.plannedSeconds);
  }
}

function sideLabel(side: ExercisePlayerStage['side']): string | null {
  if (side === 'left') return 'Left side';
  if (side === 'right') return 'Right side';
  if (side === 'bilateral') return 'Both sides';
  return null;
}

function itemOrderForDisplay(state: PlayerState): number | null {
  const stage = currentPlayerStage(state);
  if (stage === null) return null;
  return stage.kind === 'transition' && stage.nextItemOrder !== null
    ? stage.nextItemOrder
    : stage.itemOrder;
}

export function resolvePlayerRouteId(
  value: string | readonly string[] | undefined,
): string | null {
  const rawId = Array.isArray(value) ? value[0] : value;
  const parsed = stableIdSchema.safeParse(rawId);
  return parsed.success ? parsed.data : null;
}

interface PlayerPromptProps {
  readonly visible: boolean;
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}

function PlayerPrompt({
  visible,
  title,
  description,
  children,
}: PlayerPromptProps) {
  const { colors } = useRestoreTheme();
  return (
    <Modal
      animationType="none"
      onRequestClose={() => undefined}
      transparent
      visible={visible}
    >
      <View
        accessibilityViewIsModal
        style={[styles.scrim, { backgroundColor: colors.scrim }]}
      >
        <View style={[styles.prompt, { backgroundColor: colors.surface }]}>
          <Text
            accessibilityRole="header"
            style={[styles.promptTitle, { color: colors.text }]}
          >
            {title}
          </Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            {description}
          </Text>
          <View style={styles.promptActions}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

export interface PlayerContentDetails {
  readonly routine: {
    readonly items: readonly {
      readonly id: string;
      readonly value: Pick<
        GeneratedRoutineItem,
        'order' | 'exercise_id' | 'exercise_version' | 'prescription'
      >;
    }[];
  };
  readonly exercises: ReadonlyMap<string, { readonly copy: ExerciseCopy }>;
}

export interface PlayerContentProps {
  readonly details: PlayerContentDetails;
  readonly onExit: () => void;
}

export function PlayerContent({ details, onExit }: PlayerContentProps) {
  const { colors } = useRestoreTheme();
  const [state, dispatch] = useReducer(
    reducePlayerState,
    { items: details.routine.items },
    createPlayerState,
  );
  const stage = currentPlayerStage(state);
  const orderedItems = useMemo(
    () =>
      [...details.routine.items].sort(
        (left, right) => left.value.order - right.value.order,
      ),
    [details.routine.items],
  );
  const displayOrder = itemOrderForDisplay(state);
  const item =
    displayOrder === null
      ? null
      : (orderedItems.find((entry) => entry.value.order === displayOrder) ??
        null);
  const presentation =
    item === null
      ? null
      : (details.exercises.get(
          exerciseIdentityKey(
            item.value.exercise_id,
            item.value.exercise_version,
          ),
        ) ?? null);
  const itemPosition =
    displayOrder === null
      ? 0
      : orderedItems.findIndex((entry) => entry.value.order === displayOrder) +
        1;
  const remainingSeconds = playerRemainingSeconds(state);
  const currentResponse =
    stage === null ? undefined : state.responses[stage.itemOrder];

  useEffect(() => {
    if (state.status !== 'running') return;
    const interval = setInterval(() => dispatch({ type: 'tick' }), 1_000);
    return () => clearInterval(interval);
  }, [state.status]);

  if (state.status === 'completed' || state.status === 'finished_early') {
    const completed = state.status === 'completed';
    return (
      <Screen bottomSafeArea testID="session-player-complete">
        <View style={styles.completion}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.text }]}
          >
            {completed ? 'Routine complete' : 'Session ended'}
          </Text>
          <Text style={[styles.completionTime, { color: colors.accent }]}>
            {formatClock(state.elapsedSeconds)}
          </Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            {completed
              ? 'Nice work taking the time to move and check in with yourself.'
              : 'You can stop whenever continuing does not feel right.'}
          </Text>
          <Text style={[styles.previewNotice, { color: colors.textMuted }]}>
            This player preview does not save session history yet.
          </Text>
          <Button label="Return to Today" onPress={onExit} />
        </View>
      </Screen>
    );
  }

  if (stage === null || item === null) {
    return (
      <Screen>
        <ErrorState
          description="Return to the routine preview and start again."
          onRetry={onExit}
          title="The session could not continue"
        />
      </Screen>
    );
  }

  const stageRemaining = Math.max(
    0,
    stage.plannedSeconds - state.stageElapsedSeconds,
  );
  const send = (event: PlayerEvent) => dispatch(event);
  const isExercise = stage.kind === 'exercise';
  const paused = state.status === 'paused';
  const progressNow = Math.max(1, itemPosition);

  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      testID="session-player-screen"
    >
      <View style={styles.header}>
        <View
          accessibilityLabel={`Movement ${progressNow} of ${orderedItems.length}`}
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 1,
            max: orderedItems.length,
            now: progressNow,
            text: `Movement ${progressNow} of ${orderedItems.length}`,
          }}
          style={styles.progressRow}
        >
          {orderedItems.map((entry, index) => (
            <View
              key={entry.id}
              style={[
                styles.progressSegment,
                {
                  backgroundColor:
                    index < progressNow ? colors.accent : colors.surfaceMuted,
                },
              ]}
            />
          ))}
        </View>
        <View style={styles.timeRow}>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            Movement {progressNow} of {orderedItems.length}
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            Elapsed {formatClock(state.elapsedSeconds)}
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            About {formatClock(remainingSeconds)} left
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.stageHeading}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>
            {stage.kind === 'rest'
              ? `Rest · set ${stage.completedSet} of ${stage.totalSets}`
              : stage.kind === 'transition'
                ? stage.nextItemOrder === null
                  ? 'Settle before finishing'
                  : 'Up next'
                : [
                    sideLabel(stage.side),
                    stage.totalSets > 1
                      ? `Set ${stage.setIndex + 1} of ${stage.totalSets}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Move at an easy pace'}
          </Text>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.text }]}
          >
            {stage.kind === 'rest'
              ? 'Rest'
              : stage.kind === 'transition'
                ? (presentation?.copy.name ?? 'Prepare for the next movement')
                : (presentation?.copy.name ?? 'Movement details unavailable')}
          </Text>
        </View>

        <View
          accessibilityLabel={
            isExercise && !stage.automatic
              ? doseLabel(stage)
              : `${formatClock(stageRemaining)} remaining`
          }
          accessibilityRole="timer"
          accessibilityValue={{
            text:
              isExercise && !stage.automatic
                ? doseLabel(stage)
                : `${formatClock(stageRemaining)} remaining`,
          }}
          style={[styles.dosePanel, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.dose, { color: colors.text }]}>
            {isExercise && !stage.automatic
              ? doseLabel(stage)
              : formatClock(stageRemaining)}
          </Text>
          <Text style={[styles.doseCaption, { color: colors.textMuted }]}>
            {paused
              ? 'Paused'
              : isExercise && !stage.automatic
                ? 'Tap Done when you finish'
                : stage.kind === 'rest'
                  ? 'Breathe easily'
                  : stage.kind === 'transition'
                    ? 'Get comfortable for what comes next'
                    : stage.prescriptionType === 'timed_hold'
                      ? 'Hold only a comfortable position'
                      : 'Keep the movement smooth'}
          </Text>
        </View>

        {isExercise && presentation !== null ? (
          <View style={styles.instructions}>
            <Text style={[styles.instruction, { color: colors.text }]}>
              {presentation.copy.execution}
            </Text>
            <Text style={[styles.instruction, { color: colors.textMuted }]}>
              {presentation.copy.breathing}
            </Text>
            <Text style={[styles.stopRule, { color: colors.danger }]}>
              {presentation.copy.stopRules[0]}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.controls,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <View style={styles.responseRow}>
          {isExercise ? (
            <>
              <OptionChip
                label="Feels good"
                onPress={() => send({ type: 'respond', response: 'helpful' })}
                selected={currentResponse === 'helpful'}
              />
              <OptionChip
                label="Neutral"
                onPress={() => send({ type: 'respond', response: 'neutral' })}
                selected={currentResponse === 'neutral'}
              />
            </>
          ) : null}
          <Button
            accessibilityHint="Pauses this movement immediately and shows options to stop or skip."
            containerStyle={styles.responseButton}
            label="Feels wrong"
            onPress={() => send({ type: 'feels_wrong' })}
            variant="destructive"
          />
        </View>
        {currentResponse === 'helpful' || currentResponse === 'neutral' ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.responseStatus, { color: colors.textMuted }]}
          >
            Response: {currentResponse === 'helpful' ? 'Feels good' : 'Neutral'}
          </Text>
        ) : null}

        <View style={styles.mainControls}>
          <Button
            containerStyle={styles.controlButton}
            disabled={state.stageIndex === 0}
            label="Previous"
            onPress={() => send({ type: 'previous' })}
            variant="secondary"
          />
          <Button
            accessibilityHint={
              paused ? 'Resumes automatic timers.' : 'Stops automatic timers.'
            }
            containerStyle={styles.controlButton}
            label={paused ? 'Resume' : 'Pause'}
            onPress={() => send({ type: paused ? 'resume' : 'pause' })}
          />
          <Button
            containerStyle={styles.controlButton}
            label={isExercise && !stage.automatic ? 'Done' : 'Next'}
            onPress={() => send({ type: 'next' })}
            variant="secondary"
          />
        </View>
        <View style={styles.secondaryControls}>
          <Button
            containerStyle={styles.secondaryButton}
            label="Skip movement"
            onPress={() => send({ type: 'skip' })}
            variant="secondary"
          />
          <Button
            containerStyle={styles.secondaryButton}
            label="Finish early"
            onPress={() => send({ type: 'request_finish' })}
            variant="secondary"
          />
        </View>
      </View>

      <PlayerPrompt
        description="Stop this movement. If what you feel is sudden, severe, spreading, or rapidly worsening, end the session and seek appropriate care."
        title="Movement paused"
        visible={state.status === 'wrong_prompt'}
      >
        <Button
          accessibilityHint="Stops this movement and continues with the next one."
          label="Skip this movement"
          onPress={() => send({ type: 'resolve_wrong_skip' })}
        />
        <Button
          label="End session"
          onPress={() => send({ type: 'resolve_wrong_end' })}
          variant="destructive"
        />
      </PlayerPrompt>

      <PlayerPrompt
        description="You can end here. This player preview does not save partial session history yet."
        title="Finish this session?"
        visible={state.status === 'finish_prompt'}
      >
        <Button
          label="Keep going"
          onPress={() => send({ type: 'cancel_finish' })}
          variant="secondary"
        />
        <Button
          label="Finish session"
          onPress={() => send({ type: 'confirm_finish' })}
          variant="destructive"
        />
      </PlayerPrompt>
    </SafeAreaView>
  );
}

export function PlayerScreen() {
  const router = useRouter();
  const { colors } = useRestoreTheme();
  const parameters = useLocalSearchParams<{ routineId?: string | string[] }>();
  const routines = useRoutines();
  const { loadById } = routines;
  const routineId = resolvePlayerRouteId(parameters.routineId);

  useEffect(() => {
    if (routineId !== null) void loadById(routineId);
  }, [loadById, routineId]);

  if (routineId === null) {
    return (
      <Screen>
        <ErrorState
          description="Return to Today and open the routine again."
          title="This session link is not valid"
        />
      </Screen>
    );
  }
  if (routines.status === 'loading' || routines.details === null) {
    return (
      <Screen>
        {routines.status === 'error' ? (
          <ErrorState
            description="Your routine is still on this iPhone."
            onRetry={() => void routines.loadById(routineId)}
            title="The session could not be loaded"
          />
        ) : (
          <Text style={[styles.body, { color: colors.textMuted }]}>
            Preparing session…
          </Text>
        )}
      </Screen>
    );
  }
  if (
    routines.details.routine.value.routine_id !== routineId ||
    routines.details.routine.status !== 'ready'
  ) {
    return (
      <Screen>
        <ErrorState
          description="Return to Today and choose the current routine."
          title="This routine cannot be started"
        />
      </Screen>
    );
  }

  return (
    <PlayerContent
      key={routineId}
      details={routines.details}
      onExit={() => router.replace('/(tabs)')}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  progressRow: { flexDirection: 'row', gap: spacing.xs },
  progressSegment: { borderRadius: radius.pill, flex: 1, height: 5 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { fontSize: typography.caption, fontWeight: '600' },
  content: {
    flexGrow: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  stageHeading: { alignItems: 'center', gap: spacing.xs },
  eyebrow: {
    fontSize: typography.label,
    fontWeight: '700',
    textAlign: 'center',
  },
  title: {
    fontSize: typography.display,
    fontWeight: '700',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  body: { fontSize: typography.body, lineHeight: 25 },
  dosePanel: {
    alignItems: 'center',
    borderRadius: radius.lg,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  dose: { fontSize: 56, fontVariant: ['tabular-nums'], fontWeight: '700' },
  doseCaption: { fontSize: typography.label, fontWeight: '600' },
  instructions: { gap: spacing.sm },
  instruction: {
    fontSize: typography.body,
    lineHeight: 25,
    textAlign: 'center',
  },
  stopRule: {
    fontSize: typography.label,
    fontWeight: '700',
    lineHeight: 21,
    textAlign: 'center',
  },
  controls: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  responseRow: { flexDirection: 'row', gap: spacing.sm },
  responseButton: { flex: 1, minHeight: 48, paddingHorizontal: spacing.sm },
  responseStatus: {
    fontSize: typography.caption,
    fontWeight: '600',
    textAlign: 'center',
  },
  mainControls: { flexDirection: 'row', gap: spacing.sm },
  controlButton: { flex: 1, minHeight: 64, paddingHorizontal: spacing.sm },
  secondaryControls: { flexDirection: 'row', gap: spacing.sm },
  secondaryButton: { flex: 1, minHeight: 52, paddingHorizontal: spacing.sm },
  scrim: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  prompt: {
    borderRadius: radius.lg,
    gap: spacing.md,
    maxWidth: 520,
    padding: spacing.lg,
    width: '100%',
  },
  promptTitle: { fontSize: typography.title, fontWeight: '700' },
  promptActions: { gap: spacing.sm },
  completion: {
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  completionTime: {
    fontSize: 56,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    textAlign: 'center',
  },
  previewNotice: { fontSize: typography.label, lineHeight: 21 },
});
