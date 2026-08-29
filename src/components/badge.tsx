import { StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';

type BadgeProps = {
  label: string;
  accessibilityLabel?: string;
  tone?: 'neutral' | 'accent' | 'danger';
};

export function Badge({
  label,
  accessibilityLabel,
  tone = 'neutral',
}: BadgeProps) {
  const { colors } = useRestoreTheme();
  const backgroundColor =
    tone === 'accent'
      ? colors.accentMuted
      : tone === 'danger'
        ? colors.dangerSurface
        : colors.surfaceMuted;
  const foregroundColor =
    tone === 'accent'
      ? colors.accent
      : tone === 'danger'
        ? colors.danger
        : colors.textMuted;

  return (
    <View
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="text"
      style={[styles.badge, { backgroundColor }]}
    >
      <Text style={[styles.label, { color: foregroundColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
