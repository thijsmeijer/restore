import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';

export function Card({ children }: PropsWithChildren) {
  const { colors } = useRestoreTheme();

  return (
    <View
      style={[
        styles.card,
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
});
