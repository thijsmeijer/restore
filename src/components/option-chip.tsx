import { Pressable, StyleSheet, Text } from 'react-native';

import { radius, spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';

type OptionChipProps = {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly role?: 'checkbox' | 'radio';
  readonly accessibilityHint?: string;
};

export function OptionChip({
  label,
  selected,
  onPress,
  role = 'checkbox',
  accessibilityHint,
}: OptionChipProps) {
  const { colors } = useRestoreTheme();

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole={role}
      accessibilityState={
        role === 'checkbox' ? { checked: selected } : { selected }
      }
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.accentMuted : colors.surface,
          borderColor: selected ? colors.accent : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: {
    fontSize: typography.label,
    fontWeight: '700',
    textAlign: 'center',
  },
});
