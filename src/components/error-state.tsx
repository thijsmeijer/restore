import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';

type ErrorStateProps = {
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = 'Try again',
}: ErrorStateProps) {
  const { colors } = useRestoreTheme();

  return (
    <View style={styles.container}>
      <Text
        accessibilityRole="alert"
        style={[styles.title, { color: colors.danger }]}
      >
        {title}
      </Text>
      <Text style={[styles.description, { color: colors.text }]}>
        {description}
      </Text>
      {onRetry ? (
        <Button label={retryLabel} onPress={onRetry} variant="secondary" />
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
