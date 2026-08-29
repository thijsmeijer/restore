import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHint?: string;
  onAction?: () => void;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHint,
  onAction,
}: EmptyStateProps) {
  const { colors } = useRestoreTheme();

  return (
    <View style={styles.container}>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.text }]}
      >
        {title}
      </Text>
      <Text style={[styles.description, { color: colors.textMuted }]}>
        {description}
      </Text>
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          {...(actionHint ? { accessibilityHint: actionHint } : {})}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    fontSize: typography.body,
    lineHeight: 25,
    textAlign: 'center',
  },
});
