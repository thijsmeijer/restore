import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';

export type SegmentOption<Value extends string> = {
  label: string;
  value: Value;
  accessibilityHint?: string;
};

type SegmentedControlProps<Value extends string> = {
  label: string;
  value: Value;
  options: readonly SegmentOption<Value>[];
  onChange: (value: Value) => void;
  disabled?: boolean;
};

export function SegmentedControl<Value extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: SegmentedControlProps<Value>) {
  const { colors } = useRestoreTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.groupLabel, { color: colors.text }]}>{label}</Text>
      <View
        accessibilityLabel={label}
        accessibilityRole="radiogroup"
        style={[
          styles.group,
          { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
        ]}
      >
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <Pressable
              accessibilityLabel={option.label}
              accessibilityRole="radio"
              accessibilityState={{ disabled, selected }}
              disabled={disabled}
              key={option.value}
              onPress={() => onChange(option.value)}
              {...(option.accessibilityHint
                ? { accessibilityHint: option.accessibilityHint }
                : {})}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: selected
                    ? colors.accent
                    : pressed && !disabled
                      ? colors.surface
                      : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.optionLabel,
                  {
                    color: selected
                      ? colors.accentText
                      : disabled
                        ? colors.textMuted
                        : colors.text,
                  },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  groupLabel: {
    fontSize: typography.label,
    fontWeight: '700',
  },
  group: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 2,
    padding: 2,
  },
  option: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  optionLabel: {
    fontSize: typography.label,
    fontWeight: '700',
    textAlign: 'center',
  },
});
