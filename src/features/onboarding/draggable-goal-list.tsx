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

type DraggableGoalRowProps = {
  goal: GoalSlug;
  label: string;
  index: number;
  count: number;
  onMove: (goal: GoalSlug, targetIndex: number) => void;
};

function DraggableGoalRow({
  goal,
  label,
  index,
  count,
  onMove,
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
        },
        onPanResponderMove: (_, gesture) => {
          translateY.setValue(gesture.dy);
        },
        onPanResponderRelease: (_, gesture) => {
          const offset = Math.round(gesture.dy / rowHeight);
          const targetIndex = Math.max(0, Math.min(index + offset, count - 1));
          translateY.setValue(0);
          setDragging(false);
          onMove(goal, targetIndex);
        },
        onPanResponderTerminate: () => {
          translateY.setValue(0);
          setDragging(false);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [count, goal, index, onMove, rowHeight, translateY],
  );

  const accessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'decrement' && index > 0) {
      onMove(goal, index - 1);
    }
    if (event.nativeEvent.actionName === 'increment' && index < count - 1) {
      onMove(goal, index + 1);
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
          opacity: dragging ? 0.9 : 1,
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
}: DraggableGoalListProps) {
  const onMove = (goal: GoalSlug, targetIndex: number) => {
    onChange(moveGoalToIndex(goals, goal, targetIndex));
  };

  return (
    <View style={styles.list}>
      {goals.map((goal, index) => (
        <DraggableGoalRow
          count={goals.length}
          goal={goal}
          index={index}
          key={goal}
          label={labelForGoal(goal)}
          onMove={onMove}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
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
