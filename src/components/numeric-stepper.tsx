import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';

type NumericStepperProps = {
  readonly label: string;
  readonly value: number | null;
  readonly onChange: (value: number | null) => void;
  readonly minimum: number;
  readonly maximum: number;
  readonly nullLabel?: string;
  readonly valueSuffix?: string;
  readonly allowClear?: boolean;
  readonly quickValues?: readonly number[];
};

export function NumericStepper({
  label,
  value,
  onChange,
  minimum,
  maximum,
  nullLabel = 'Not rated',
  valueSuffix = '',
  allowClear = true,
  quickValues = [],
}: NumericStepperProps) {
  const { colors } = useRestoreTheme();
  const decrementDisabled = value === null || value <= minimum;
  const incrementDisabled = value !== null && value >= maximum;
  const displayValue = value === null ? nullLabel : `${value}${valueSuffix}`;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      {quickValues.length > 0 ? (
        <View
          accessibilityLabel={`${label} quick values`}
          accessibilityRole="radiogroup"
          style={styles.quickValues}
        >
          {quickValues.map((quickValue) => {
            const selected = value === quickValue;
            return (
              <Pressable
                accessibilityLabel={`${label} ${quickValue}${valueSuffix}`}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                key={quickValue}
                onPress={() => onChange(quickValue)}
                style={({ pressed }) => [
                  styles.quickValue,
                  {
                    backgroundColor: selected
                      ? colors.accentMuted
                      : colors.surfaceMuted,
                    borderColor: selected ? colors.accent : colors.border,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Text style={[styles.quickValueLabel, { color: colors.text }]}>
                  {quickValue}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <View style={styles.controls}>
        <Pressable
          accessibilityLabel={`Decrease ${label}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: decrementDisabled }}
          disabled={decrementDisabled}
          onPress={() => {
            if (value !== null) onChange(Math.max(minimum, value - 1));
          }}
          style={({ pressed }) => [
            styles.adjustButton,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
              opacity: decrementDisabled ? 0.45 : pressed ? 0.75 : 1,
            },
          ]}
        >
          <Text style={[styles.adjustLabel, { color: colors.text }]}>−</Text>
        </Pressable>
        <View
          accessibilityLabel={`${label}: ${displayValue}`}
          accessibilityRole="text"
          style={styles.value}
        >
          <Text style={[styles.valueLabel, { color: colors.text }]}>
            {displayValue}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={`Increase ${label}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: incrementDisabled }}
          disabled={incrementDisabled}
          onPress={() =>
            onChange(value === null ? minimum : Math.min(maximum, value + 1))
          }
          style={({ pressed }) => [
            styles.adjustButton,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
              opacity: incrementDisabled ? 0.45 : pressed ? 0.75 : 1,
            },
          ]}
        >
          <Text style={[styles.adjustLabel, { color: colors.text }]}>+</Text>
        </Pressable>
        {value !== null && allowClear ? (
          <Pressable
            accessibilityLabel={`Clear ${label}`}
            accessibilityRole="button"
            onPress={() => onChange(null)}
            style={({ pressed }) => [
              styles.clearButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.clearLabel, { color: colors.accent }]}>
              Clear
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.label,
    fontWeight: '700',
  },
  controls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickValues: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickValue: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacing.sm,
  },
  quickValueLabel: {
    fontSize: typography.label,
    fontWeight: '700',
  },
  adjustButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  adjustLabel: {
    fontSize: typography.title,
    fontWeight: '700',
  },
  value: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  valueLabel: {
    fontSize: typography.body,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  clearButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.xs,
  },
  clearLabel: {
    fontSize: typography.label,
    fontWeight: '700',
  },
});
