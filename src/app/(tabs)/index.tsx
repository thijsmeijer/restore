import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';
import type { CheckIn } from '@/features/check-in/check-in';
import { useCheckIns } from '@/features/check-in/check-in-context';
import {
  checkInModeOptions,
  environmentOptions,
} from '@/features/check-in/check-in-options';

type TodayContentProps = {
  readonly latest: CheckIn | null;
  readonly status: 'loading' | 'ready' | 'error';
  readonly onCheckIn: () => void;
  readonly onRetry: () => void;
};

function labelForMode(checkIn: CheckIn): string {
  return (
    checkInModeOptions.find((option) => option.value === checkIn.mode)?.label ??
    'Restore'
  );
}

function labelForEnvironment(checkIn: CheckIn): string {
  return (
    environmentOptions.find((option) => option.value === checkIn.environment)
      ?.label ?? checkIn.environment
  );
}

function observedTime(checkIn: CheckIn): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(checkIn.observedAt));
}

export function TodayContent({
  latest,
  status,
  onCheckIn,
  onRetry,
}: TodayContentProps) {
  const { colors } = useRestoreTheme();

  return (
    <Screen testID="today-screen">
      <View style={styles.heading}>
        <Badge label="Today" tone="accent" />
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          Make space to move
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Start with what your body and schedule need right now.
        </Text>
      </View>

      {status === 'loading' ? (
        <Card>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Loading today’s details…
          </Text>
        </Card>
      ) : null}

      {status === 'error' ? (
        <Card>
          <Text
            accessibilityRole="alert"
            style={[styles.cardTitle, { color: colors.text }]}
          >
            Today’s details could not be loaded
          </Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            Your saved information is still on this iPhone.
          </Text>
          <Button label="Try again" onPress={onRetry} variant="secondary" />
        </Card>
      ) : null}

      {status === 'ready' && latest === null ? (
        <Card>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            How are you feeling today?
          </Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            Log your time, readiness, body, and training context in one quick
            check-in.
          </Text>
          <Button
            accessibilityHint="Opens today's check-in form."
            label="Check in"
            onPress={onCheckIn}
          />
        </Card>
      ) : null}

      {status === 'ready' && latest !== null ? (
        <Card>
          <View style={styles.cardHeading}>
            <View style={styles.cardHeadingText}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Latest check-in
              </Text>
              <Text style={[styles.caption, { color: colors.textMuted }]}>
                Saved at {observedTime(latest)}
              </Text>
            </View>
            <Badge label={`${latest.availableMinutes} min`} tone="accent" />
          </View>
          <Text style={[styles.body, { color: colors.text }]}>
            {labelForMode(latest)} · {labelForEnvironment(latest)}
          </Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            {latest.regions.length === 0
              ? 'No body areas rated'
              : `${latest.regions.length} ${latest.regions.length === 1 ? 'body area' : 'body areas'} rated`}
            {latest.readiness === null
              ? ''
              : ` · Readiness ${latest.readiness} of 5`}
          </Text>
          <Button label="Check in again" onPress={onCheckIn} />
        </Card>
      ) : null}
    </Screen>
  );
}

export default function TodayScreen() {
  const router = useRouter();
  const checkIns = useCheckIns();

  return (
    <TodayContent
      latest={checkIns.latest}
      onCheckIn={() => router.push('/check-in')}
      onRetry={() => void checkIns.reload()}
      status={checkIns.status}
    />
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
  body: {
    fontSize: typography.body,
    lineHeight: 25,
  },
  cardTitle: {
    fontSize: typography.title,
    fontWeight: '700',
  },
  caption: {
    fontSize: typography.caption,
    lineHeight: 19,
  },
  cardHeading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  cardHeadingText: {
    flex: 1,
    gap: spacing.xs,
  },
});
