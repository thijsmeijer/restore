import { Pressable, StyleSheet, Text } from 'react-native';

import { radius, spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  accessibilityHint?: string;
};

export function Button({ label, onPress, accessibilityHint }: ButtonProps) {
  const { colors } = useRestoreTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      {...(accessibilityHint ? { accessibilityHint } : {})}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? colors.accentPressed : colors.accent,
        },
      ]}
    >
      <Text style={[styles.label, { color: colors.accentText }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  label: {
    fontSize: typography.body,
    fontWeight: '700',
  },
});
