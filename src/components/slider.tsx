import { useState } from 'react';
import {
  type GestureResponderEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { radius, spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';

type SliderProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  accessibilityHint?: string;
  formatValue?: (value: number) => string;
};

const accessibilityActions = [
  { name: 'increment', label: 'Increase' },
  { name: 'decrement', label: 'Decrease' },
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function snap(value: number, min: number, max: number, step: number) {
  const safeStep = step > 0 ? step : 1;
  const precision = Math.max(
    `${safeStep}`.split('.')[1]?.length ?? 0,
    `${min}`.split('.')[1]?.length ?? 0,
  );
  const snapped =
    Math.round((clamp(value, min, max) - min) / safeStep) * safeStep + min;

  return clamp(Number(snapped.toFixed(precision)), min, max);
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  step = 1,
  disabled = false,
  accessibilityHint,
  formatValue = String,
}: SliderProps) {
  const { colors } = useRestoreTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const normalizedMin = Math.min(min, max);
  const normalizedMax = Math.max(min, max);
  const normalizedStep = step > 0 ? step : 1;
  const normalizedValue = snap(
    value,
    normalizedMin,
    normalizedMax,
    normalizedStep,
  );
  const range = normalizedMax - normalizedMin;
  const progress = range === 0 ? 0 : (normalizedValue - normalizedMin) / range;
  const displayValue = formatValue(normalizedValue);

  const emitChange = (nextValue: number) => {
    const next = snap(nextValue, normalizedMin, normalizedMax, normalizedStep);
    if (next !== normalizedValue) onChange(next);
  };

  const updateFromTouch = (event: GestureResponderEvent) => {
    if (disabled || trackWidth <= 0 || range === 0) return;

    const ratio = clamp(event.nativeEvent.locationX / trackWidth, 0, 1);
    emitChange(normalizedMin + ratio * range);
  };

  const adjust = (direction: -1 | 1) => {
    if (disabled) return;
    emitChange(normalizedValue + direction * normalizedStep);
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.value, { color: colors.textMuted }]}>
          {displayValue}
        </Text>
      </View>
      <View
        accessibilityActions={accessibilityActions}
        accessibilityHint={
          accessibilityHint ?? 'Swipe up or down to adjust the value.'
        }
        accessibilityLabel={label}
        accessibilityRole="adjustable"
        accessibilityState={{ disabled }}
        accessibilityValue={{
          min: normalizedMin,
          max: normalizedMax,
          now: normalizedValue,
          text: displayValue,
        }}
        accessible
        onAccessibilityAction={({ nativeEvent }) => {
          if (nativeEvent.actionName === 'increment') adjust(1);
          if (nativeEvent.actionName === 'decrement') adjust(-1);
        }}
        onLayout={({ nativeEvent }) => setTrackWidth(nativeEvent.layout.width)}
        onMoveShouldSetResponder={() => !disabled}
        onResponderGrant={updateFromTouch}
        onResponderMove={updateFromTouch}
        onStartShouldSetResponder={() => !disabled}
        style={styles.touchTarget}
      >
        <View style={[styles.track, { backgroundColor: colors.track }]}>
          <View
            style={[
              styles.fill,
              {
                backgroundColor: disabled ? colors.textMuted : colors.accent,
                width: `${progress * 100}%`,
              },
            ]}
          >
            <View
              style={[
                styles.thumb,
                {
                  backgroundColor: colors.surface,
                  borderColor: disabled ? colors.textMuted : colors.accent,
                },
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  labelRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  label: {
    flexShrink: 1,
    fontSize: typography.label,
    fontWeight: '700',
  },
  value: {
    fontSize: typography.label,
    fontVariant: ['tabular-nums'],
  },
  touchTarget: {
    justifyContent: 'center',
    minHeight: 48,
  },
  track: {
    borderRadius: radius.pill,
    height: 8,
  },
  fill: {
    borderRadius: radius.pill,
    height: 8,
  },
  thumb: {
    borderRadius: radius.pill,
    borderWidth: 3,
    height: 24,
    position: 'absolute',
    right: -12,
    top: -8,
    width: 24,
  },
});
