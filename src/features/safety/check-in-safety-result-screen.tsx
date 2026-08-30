import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';
import type { CheckIn } from '@/features/check-in/check-in';
import { labelForSafetySignal } from '@/features/safety/check-in-safety';

type CheckInSafetyResultScreenProps = {
  readonly checkIn: CheckIn;
  readonly onDone: () => void;
};

export function CheckInSafetyResultScreen({
  checkIn,
  onDone,
}: CheckInSafetyResultScreenProps) {
  const { colors } = useRestoreTheme();
  const blocked = checkIn.safetyResult === 'blocked';
  const reportedSignals = checkIn.safety?.reportedSignals ?? [];

  return (
    <Screen bottomSafeArea testID="check-in-safety-result-screen">
      <View style={styles.heading}>
        <Badge
          label={blocked ? 'Routine paused' : 'Gentle only'}
          tone="danger"
        />
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          {blocked ? 'Pause here' : 'Keep this gentle'}
        </Text>
        <Text
          accessibilityRole="alert"
          style={[styles.body, { color: colors.text }]}
        >
          {blocked
            ? 'Restore will not build a routine from this check-in.'
            : 'Only reviewed gentle movement can continue from this check-in.'}
        </Text>
      </View>

      <Card>
        {reportedSignals.length > 0 ? (
          <>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              You reported
            </Text>
            <View accessibilityRole="list" style={styles.list}>
              {reportedSignals.map((signal) => (
                <Text
                  accessibilityRole="text"
                  key={signal}
                  style={[styles.body, { color: colors.text }]}
                >
                  • {labelForSafetySignal(signal)}
                </Text>
              ))}
            </View>
          </>
        ) : null}
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Stop movement that makes what you reported worse and seek appropriate
          professional care. Your check-in has been saved on this iPhone.
        </Text>
        <Button label="Done" onPress={onDone} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    gap: spacing.sm,
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
  list: {
    gap: spacing.sm,
  },
});
