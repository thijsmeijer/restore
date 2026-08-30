import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ErrorState } from '@/components/error-state';
import { Screen } from '@/components/screen';
import { spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';
import { useProfile } from '@/features/onboarding/profile-context';

export default function LoadingScreen() {
  const { colors } = useRestoreTheme();
  const profileState = useProfile();

  if (profileState.status === 'error') {
    return (
      <Screen testID="profile-load-error-screen">
        <ErrorState
          description="Your local information was not changed."
          onRetry={() => void profileState.reload()}
          title="Could not open your profile"
        />
      </Screen>
    );
  }

  return (
    <Screen testID="profile-loading-screen">
      <View accessibilityLiveRegion="polite" style={styles.content}>
        <ActivityIndicator
          accessibilityLabel="Opening your local profile"
          color={colors.accent}
          size="large"
        />
        <Text style={[styles.text, { color: colors.text }]}>
          Opening Restore…
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
  },
  text: {
    fontSize: typography.body,
  },
});
