import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';

type CardProps = PropsWithChildren<{ compact?: boolean }>;

export function Card({ children, compact = false }: CardProps) {
  const { colors } = useRestoreTheme();

  return (
    <View
      style={[
        styles.card,
        compact ? styles.compact : null,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  compact: {
    padding: spacing.md,
  },
});
