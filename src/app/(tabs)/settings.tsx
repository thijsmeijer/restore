import { useRouter } from 'expo-router';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useRestoreTheme();

  return (
    <Screen testID="settings-screen">
      <View style={styles.heading}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          Settings
        </Text>
      </View>
      <Card>
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Your preferences
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Update your goals, focus areas, available equipment, usual training,
          and preferred routine lengths.
        </Text>
        <Button
          accessibilityHint="Opens your profile preferences."
          label="Edit profile"
          onPress={() => router.push('/profile')}
          variant="secondary"
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    paddingTop: spacing.lg,
  },
  title: {
    fontSize: typography.display,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  cardTitle: {
    fontSize: typography.title,
    fontWeight: '700',
  },
  body: {
    fontSize: typography.body,
    lineHeight: 25,
  },
});
