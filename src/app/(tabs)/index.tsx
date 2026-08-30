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
import { useRoutines } from '@/features/routine/routine-context';
import type {
  RoutineDetails,
  RoutineOperationFailureCode,
} from '@/features/routine/routine-service';

type TodayContentProps = {
  readonly latest: CheckIn | null;
  readonly status: 'loading' | 'ready' | 'error';
  readonly onCheckIn: () => void;
  readonly onOpenRoutine?: (routineId: string) => void;
  readonly onRetry: () => void;
  readonly onRetryRoutine?: () => void;
  readonly routine?: RoutineDetails | null;
  readonly routineFailureCode?: RoutineOperationFailureCode | null;
  readonly routineStatus?: 'loading' | 'ready' | 'working' | 'error';
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
  onOpenRoutine = () => undefined,
  onRetry,
  onRetryRoutine = () => undefined,
  routine = null,
  routineFailureCode = null,
  routineStatus = 'ready',
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
              ? 'No focus areas selected'
              : `${latest.regions.length} ${latest.regions.length === 1 ? 'focus area' : 'focus areas'} selected`}
            {latest.readiness === null
              ? ''
              : ` · Readiness ${latest.readiness} of 5`}
          </Text>
          {latest.safetyResult === 'blocked' ? (
            <View style={styles.safetyMessage}>
              <Badge label="Routine paused" tone="danger" />
              <Text
                accessibilityRole="alert"
                style={[styles.body, { color: colors.text }]}
              >
                Restore will not build a routine from this check-in. Stop
                movement that makes what you reported worse and seek appropriate
                professional care.
              </Text>
            </View>
          ) : null}
          {latest.safetyResult === 'gentle_only' ? (
            <View style={styles.safetyMessage}>
              <Badge label="Gentle only" tone="danger" />
              <Text style={[styles.body, { color: colors.text }]}>
                Only reviewed gentle movement can continue from this check-in.
              </Text>
            </View>
          ) : null}
          {latest.captureStatus === 'captured' ? (
            <Text style={[styles.body, { color: colors.textMuted }]}>
              This older check-in was saved before the stop-sign check and is
              not ready for routine generation.
            </Text>
          ) : null}
          <Button label="Check in again" onPress={onCheckIn} />
        </Card>
      ) : null}

      {status === 'ready' && latest?.captureStatus === 'submitted' ? (
        <RoutineRecommendation
          failureCode={routineFailureCode}
          onOpen={onOpenRoutine}
          onRetry={onRetryRoutine}
          routine={routine}
          status={routineStatus}
        />
      ) : null}
    </Screen>
  );
}

type RoutineRecommendationProps = {
  readonly failureCode: RoutineOperationFailureCode | null;
  readonly onOpen: (routineId: string) => void;
  readonly onRetry: () => void;
  readonly routine: RoutineDetails | null;
  readonly status: NonNullable<TodayContentProps['routineStatus']>;
};

function RoutineRecommendation({
  failureCode,
  onOpen,
  onRetry,
  routine,
  status,
}: RoutineRecommendationProps) {
  const { colors } = useRestoreTheme();
  if (status === 'loading' || status === 'working') {
    return (
      <Card>
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Preparing your routine…
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Checking today’s time, focus, and available equipment.
        </Text>
      </Card>
    );
  }
  if (status === 'error') {
    return (
      <Card>
        <Text
          accessibilityRole="alert"
          style={[styles.cardTitle, { color: colors.text }]}
        >
          Your routine could not be prepared
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Your check-in is still saved on this iPhone.
        </Text>
        <Button
          label="Try routine again"
          onPress={onRetry}
          variant="secondary"
        />
      </Card>
    );
  }
  if (routine !== null) {
    const minutes = Math.max(
      1,
      Math.round(routine.routine.value.estimated_duration_seconds / 60),
    );
    return (
      <Card>
        <View style={styles.cardHeading}>
          <View style={styles.cardHeadingText}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Your routine is ready
            </Text>
            <Text style={[styles.body, { color: colors.textMuted }]}>
              {routine.routine.value.items.length}{' '}
              {routine.routine.value.items.length === 1
                ? 'movement'
                : 'movements'}
              {' · '}
              {minutes} min
            </Text>
          </View>
          <Badge label="Ready" tone="accent" />
        </View>
        <Button
          accessibilityHint="Opens the routine details and replacement options."
          label="Review routine"
          onPress={() => onOpen(routine.routine.value.routine_id)}
        />
      </Card>
    );
  }
  if (
    failureCode === 'catalog_not_clinically_reviewed' ||
    failureCode === 'template_unavailable'
  ) {
    return (
      <Card>
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Routine library under review
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Your check-in is saved. Your routine will appear here once the exact
          movements and guidance are approved for daily use.
        </Text>
      </Card>
    );
  }
  if (
    failureCode === 'blocked_by_safety' ||
    failureCode === 'check_in_not_submitted'
  ) {
    return null;
  }
  if (failureCode !== null) {
    return (
      <Card>
        <Text
          accessibilityRole="alert"
          style={[styles.cardTitle, { color: colors.text }]}
        >
          No routine fits this check-in yet
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Try a new check-in if your time, focus, or equipment has changed.
        </Text>
      </Card>
    );
  }
  return null;
}

export default function TodayScreen() {
  const router = useRouter();
  const checkIns = useCheckIns();
  const routines = useRoutines();

  return (
    <TodayContent
      latest={checkIns.latest}
      onCheckIn={() => router.push('/check-in')}
      onOpenRoutine={(routineId) => router.push(`/routine/${routineId}`)}
      onRetry={() => void checkIns.reload()}
      onRetryRoutine={() => void routines.generate()}
      routine={routines.details}
      routineFailureCode={routines.failureCode}
      routineStatus={routines.status}
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
  safetyMessage: {
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
});
