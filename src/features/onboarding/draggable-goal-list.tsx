import { useMemo, useState } from 'react';
import {
  Animated,
  PanResponder,
  type AccessibilityActionEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { radius, spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';
import type { GoalSlug } from '@/features/onboarding/profile-options';

type DraggableGoalListProps = {
  goals: readonly GoalSlug[];
  labelForGoal: (goal: GoalSlug) => string;
  onChange: (goals: readonly GoalSlug[]) => void;
  onDragStateChange?: (dragging: boolean) => void;
};

export function moveGoalToIndex(
  goals: readonly GoalSlug[],
  goal: GoalSlug,
  targetIndex: number,
): GoalSlug[] {
  const sourceIndex = goals.indexOf(goal);
  if (sourceIndex === -1) return [...goals];

  const boundedTarget = Math.max(0, Math.min(targetIndex, goals.length - 1));
  const next = [...goals];
  next.splice(sourceIndex, 1);
  next.splice(boundedTarget, 0, goal);
  return next;
}

export function insertionSlotForMove(
  sourceIndex: number,
  targetIndex: number,
): number {
  return targetIndex > sourceIndex ? targetIndex + 1 : targetIndex;
}

type DraggableGoalRowProps = {
  goal: GoalSlug;
  label: string;
  index: number;
  count: number;
  onAccessibilityMove: (goal: GoalSlug, targetIndex: number) => void;
  onDragCancel: () => void;
  onDragEnd: (goal: GoalSlug, targetIndex: number) => void;
  onDragStart: (goal: GoalSlug, targetIndex: number) => void;
  onDragTarget: (goal: GoalSlug, targetIndex: number) => void;
};

function DraggableGoalRow({
  goal,
  label,
  index,
  count,
  onAccessibilityMove,
  onDragCancel,
  onDragEnd,
  onDragStart,
  onDragTarget,
}: DraggableGoalRowProps) {
  const { colors } = useRestoreTheme();
  const [translateY] = useState(() => new Animated.Value(0));
  const [rowHeight, setRowHeight] = useState(64);
  const [dragging, setDragging] = useState(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dy) > 5 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderGrant: () => {
          setDragging(true);
          onDragStart(goal, index);
        },
        onPanResponderMove: (_, gesture) => {
          translateY.setValue(gesture.dy);
          const offset = Math.round(gesture.dy / rowHeight);
          const targetIndex = Math.max(0, Math.min(index + offset, count - 1));
          onDragTarget(goal, targetIndex);
        },
        onPanResponderRelease: (_, gesture) => {
          const offset = Math.round(gesture.dy / rowHeight);
          const targetIndex = Math.max(0, Math.min(index + offset, count - 1));
          translateY.setValue(0);
          setDragging(false);
          onDragEnd(goal, targetIndex);
        },
        onPanResponderTerminate: () => {
          translateY.setValue(0);
          setDragging(false);
          onDragCancel();
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [
      count,
      goal,
      index,
      onDragCancel,
      onDragEnd,
      onDragStart,
      onDragTarget,
      rowHeight,
      translateY,
    ],
  );

  const accessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'decrement' && index > 0) {
      onAccessibilityMove(goal, index - 1);
    }
    if (event.nativeEvent.actionName === 'increment' && index < count - 1) {
      onAccessibilityMove(goal, index + 1);
    }
  };

  return (
    <Animated.View
      onLayout={({ nativeEvent }) => {
        setRowHeight(Math.max(nativeEvent.layout.height, 1));
      }}
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: dragging ? colors.accent : colors.border,
          elevation: dragging ? 8 : 0,
          opacity: dragging ? 0.9 : 1,
          shadowColor: colors.accent,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: dragging ? 0.28 : 0,
          shadowRadius: dragging ? 10 : 0,
          transform: [{ translateY }],
          zIndex: dragging ? 1 : 0,
        },
      ]}
    >
      <Text style={[styles.priority, { color: colors.textMuted }]}>
        {index + 1}
      </Text>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View
        accessible
        accessibilityActions={[
          { name: 'decrement', label: 'Move earlier' },
          { name: 'increment', label: 'Move later' },
        ]}
        accessibilityHint="Drag up or down to change priority. With VoiceOver, swipe up or down."
        accessibilityLabel={`${label}, priority ${index + 1} of ${count}`}
        accessibilityRole="adjustable"
        accessibilityValue={{
          min: 1,
          max: count,
          now: index + 1,
          text: `${index + 1} of ${count}`,
        }}
        onAccessibilityAction={accessibilityAction}
        style={styles.handle}
        {...panResponder.panHandlers}
      >
        <Text
          accessibilityElementsHidden
          style={[styles.handleIcon, { color: colors.accent }]}
        >
          ≡
        </Text>
      </View>
    </Animated.View>
  );
}

export function DraggableGoalList({
  goals,
  labelForGoal,
  onChange,
  onDragStateChange,
}: DraggableGoalListProps) {
  const { colors } = useRestoreTheme();
  const [dragState, setDragState] = useState<{
    goal: GoalSlug;
    targetIndex: number;
  } | null>(null);
  const sourceIndex = dragState === null ? -1 : goals.indexOf(dragState.goal);
  const insertionSlot =
    dragState === null || sourceIndex === -1
      ? null
      : insertionSlotForMove(sourceIndex, dragState.targetIndex);

  const accessibilityMove = (goal: GoalSlug, targetIndex: number) => {
    onChange(moveGoalToIndex(goals, goal, targetIndex));
  };

  const startDrag = (goal: GoalSlug, targetIndex: number) => {
    setDragState({ goal, targetIndex });
    onDragStateChange?.(true);
  };

  const updateDragTarget = (goal: GoalSlug, targetIndex: number) => {
    setDragState((current) =>
      current?.goal === goal && current.targetIndex === targetIndex
        ? current
        : { goal, targetIndex },
    );
  };

  const clearDrag = () => {
    setDragState(null);
    onDragStateChange?.(false);
  };

  const finishDrag = (goal: GoalSlug, targetIndex: number) => {
    onChange(moveGoalToIndex(goals, goal, targetIndex));
    clearDrag();
  };

  return (
    <View style={styles.container}>
      <Text
        accessibilityLiveRegion="polite"
        style={[styles.dragStatus, { color: colors.textMuted }]}
      >
        {dragState
          ? `Drop at priority ${dragState.targetIndex + 1}`
          : 'Hold the handle and drag to change the order.'}
      </Text>
      <View style={styles.list}>
        {goals.map((goal, index) => (
          <View
            key={goal}
            style={[
              styles.rowSlot,
              dragState?.goal === goal ? styles.draggingSlot : null,
            ]}
          >
            {insertionSlot === index ? (
              <View
                accessibilityElementsHidden
                style={[
                  styles.dropIndicator,
                  styles.dropIndicatorBefore,
                  { backgroundColor: colors.accent },
                ]}
              />
            ) : null}
            <DraggableGoalRow
              count={goals.length}
              goal={goal}
              index={index}
              label={labelForGoal(goal)}
              onAccessibilityMove={accessibilityMove}
              onDragCancel={clearDrag}
              onDragEnd={finishDrag}
              onDragStart={startDrag}
              onDragTarget={updateDragTarget}
            />
            {insertionSlot === goals.length && index === goals.length - 1 ? (
              <View
                accessibilityElementsHidden
                style={[
                  styles.dropIndicator,
                  styles.dropIndicatorAfter,
                  { backgroundColor: colors.accent },
                ]}
              />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  dragStatus: {
    fontSize: typography.label,
    lineHeight: 21,
    minHeight: 21,
  },
  list: {
    gap: spacing.sm,
    position: 'relative',
  },
  rowSlot: {
    position: 'relative',
  },
  draggingSlot: {
    zIndex: 3,
  },
  dropIndicator: {
    borderRadius: radius.pill,
    height: 4,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 2,
  },
  dropIndicatorBefore: {
    top: -6,
  },
  dropIndicatorAfter: {
    bottom: -6,
  },
  row: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 56,
    paddingLeft: spacing.md,
  },
  priority: {
    fontSize: typography.label,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    minWidth: 20,
  },
  label: {
    flex: 1,
    fontSize: typography.body,
    fontWeight: '700',
    paddingVertical: spacing.sm,
  },
  handle: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    minWidth: 56,
  },
  handleIcon: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 30,
  },
});
