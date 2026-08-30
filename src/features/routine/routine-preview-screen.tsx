import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ErrorState } from '@/components/error-state';
import { Screen } from '@/components/screen';
import { stableIdSchema } from '@/content/schemas';
import { exerciseIdentityKey } from '@/db/repositories/generation-catalog-repository';
import { radius, spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';
import type { StoredRoutineItem } from '@/features/routine/routine';
import { useRoutines } from '@/features/routine/routine-context';
import type {
  RoutineDetails,
  RoutineOperationFailureCode,
} from '@/features/routine/routine-service';

const phaseLabels: Readonly<Record<string, string>> = {
  arrival: 'Arrive',
  warm_motion: 'Warm up',
  targeted_mobility: 'Focused movement',
  controlled_range: 'Build control',
  integration: 'Bring it together',
  cooldown: 'Settle',
  reassessment: 'Check in again',
};

const reasonLabels: Readonly<Record<string, string>> = {
  target_match: 'Matches an area you selected today.',
  intent_match: 'Matches the kind of session you chose.',
  profile_goal_match: 'Supports one of your movement priorities.',
  training_context_match: 'Fits around your training today.',
  favorite_history: 'You marked this as a favorite.',
  helpful_history: 'This has felt useful before.',
  phase_requirement: 'Keeps the routine balanced and well paced.',
};

function prescriptionLabel(item: StoredRoutineItem): string {
  const prescription = item.value.prescription;
  const dose = prescription.dose;
  const timedDose =
    dose >= 60
      ? `${Math.floor(dose / 60)} min${dose % 60 === 0 ? '' : ` ${dose % 60} sec`}`
      : `${dose} sec`;
  const doseLabel =
    prescription.type === 'breathing_cycles'
      ? `${dose} ${dose === 1 ? 'breath' : 'breaths'}`
      : prescription.type === 'repetitions'
        ? `${dose} ${dose === 1 ? 'rep' : 'reps'}`
        : prescription.type === 'reassessment'
          ? 'One quick check'
          : timedDose;
  const sideLabel =
    prescription.side_mode === 'bilateral_sequential'
      ? ' per side'
      : prescription.side_mode === 'unilateral'
        ? ` on ${prescription.side_sequence[0] ?? 'one side'}`
        : '';
  const setLabel = prescription.sets > 1 ? ` · ${prescription.sets} sets` : '';
  const restLabel =
    prescription.rest_seconds > 0
      ? ` · ${prescription.rest_seconds} sec rest`
      : '';
  return `${doseLabel}${sideLabel}${setLabel}${restLabel}`;
}

function failureMessage(
  code: RoutineOperationFailureCode | null,
): string | null {
  if (code === null) return null;
  if (code === 'replacement_unavailable') {
    return 'That movement cannot replace this one without breaking the routine. Nothing changed.';
  }
  if (code === 'blocked_by_safety') {
    return 'This check-in cannot be used to change the routine. Stop movement that makes what you reported worse and seek appropriate care.';
  }
  if (
    code === 'catalog_not_clinically_reviewed' ||
    code === 'template_unavailable'
  ) {
    return 'The exact movement library needed for this change is still under review. Nothing changed.';
  }
  return 'That change could not be applied. Your previous routine is unchanged.';
}

export interface RoutinePreviewContentProps {
  readonly busy: boolean;
  readonly details: RoutineDetails;
  readonly failureCode: RoutineOperationFailureCode | null;
  readonly onBack: () => void;
  readonly onRegenerate: () => void;
  readonly onStart: () => void;
  readonly onReplace: (
    itemOrder: number,
    replacementExerciseId: string,
  ) => void;
}

export function resolveRoutineRouteId(
  value: string | readonly string[] | undefined,
): string | null {
  const rawId = Array.isArray(value) ? value[0] : value;
  const parsed = stableIdSchema.safeParse(rawId);
  return parsed.success ? parsed.data : null;
}

export function RoutinePreviewContent({
  busy,
  details,
  failureCode,
  onBack,
  onRegenerate,
  onStart,
  onReplace,
}: RoutinePreviewContentProps) {
  const { colors } = useRestoreTheme();
  const [expandedItemOrder, setExpandedItemOrder] = useState<number | null>(
    null,
  );
  const routine = details.routine.value;
  const groups = useMemo(() => {
    const result: { phase: string; items: StoredRoutineItem[] }[] = [];
    for (const item of details.routine.items) {
      const current = result.at(-1);
      if (current?.phase === item.value.phase) current.items.push(item);
      else result.push({ phase: item.value.phase, items: [item] });
    }
    return result;
  }, [details.routine.items]);
  const message = failureMessage(failureCode);
  const editable = details.routine.status === 'ready' && !busy;

  return (
    <Screen testID="routine-preview-screen">
      <View style={styles.topRow}>
        <Button label="Back" onPress={onBack} variant="secondary" />
        <Badge
          label={
            details.routine.status === 'ready' ? 'Ready' : 'Previous version'
          }
          tone="accent"
        />
      </View>

      <View style={styles.heading}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          Today’s routine
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          {Math.max(1, Math.round(routine.estimated_duration_seconds / 60))} min
          {' · '}
          {routine.items.length}{' '}
          {routine.items.length === 1 ? 'movement' : 'movements'}
        </Text>
      </View>

      <View
        accessibilityLabel="Stop if a movement causes sudden, severe, spreading, or rapidly worsening symptoms."
        accessibilityRole="summary"
        style={[styles.stopGuidance, { backgroundColor: colors.dangerSurface }]}
      >
        <Text style={[styles.stopTitle, { color: colors.danger }]}>
          Pause when needed
        </Text>
        <Text style={[styles.body, { color: colors.text }]}>
          Stop if a movement causes sudden, severe, spreading, or rapidly
          worsening symptoms. Choose only a comfortable range.
        </Text>
      </View>

      {message !== null ? (
        <Text
          accessibilityRole="alert"
          style={[styles.alert, { color: colors.danger }]}
        >
          {message}
        </Text>
      ) : null}

      {groups.map((group) => (
        <View key={group.phase} style={styles.group}>
          <Text
            accessibilityRole="header"
            style={[styles.phaseTitle, { color: colors.text }]}
          >
            {phaseLabels[group.phase] ?? 'Movement'}
          </Text>
          {group.items.map((item) => {
            const presentation = details.exercises.get(
              exerciseIdentityKey(
                item.value.exercise_id,
                item.value.exercise_version,
              ),
            );
            const expanded = expandedItemOrder === item.value.order;
            const availableAlternatives = item.value.alternatives.filter(
              (alternative) =>
                details.exercises.has(
                  exerciseIdentityKey(
                    alternative.exercise_id,
                    alternative.exercise_version,
                  ),
                ),
            );
            return (
              <Card key={item.id} compact>
                <View style={styles.itemHeading}>
                  <View style={styles.itemHeadingText}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>
                      {presentation?.copy.name ??
                        'Movement details unavailable'}
                    </Text>
                    <Text style={[styles.dose, { color: colors.accent }]}>
                      {prescriptionLabel(item)}
                    </Text>
                  </View>
                  <Badge
                    label={`${Math.max(1, Math.round(item.value.prescription.estimated_duration_seconds / 60))} min`}
                  />
                </View>
                <Text style={[styles.body, { color: colors.textMuted }]}>
                  {reasonLabels[
                    item.value.selection_reason_codes[0] ?? 'phase_requirement'
                  ] ?? reasonLabels.phase_requirement}
                </Text>
                {item.value.warning_keys.length > 0 ? (
                  <Text style={[styles.warning, { color: colors.danger }]}>
                    Follow the caution shown in this movement’s instructions.
                  </Text>
                ) : null}
                {availableAlternatives.length > 0 && editable ? (
                  <Button
                    accessibilityHint="Shows reviewed movements that can fill the same place in this routine."
                    label={expanded ? 'Hide options' : 'Replace'}
                    onPress={() =>
                      setExpandedItemOrder(expanded ? null : item.value.order)
                    }
                    variant="secondary"
                  />
                ) : null}
                {expanded ? (
                  <View style={styles.options}>
                    <Text
                      style={[styles.optionHeading, { color: colors.text }]}
                    >
                      Choose another movement
                    </Text>
                    {availableAlternatives.map((alternative) => {
                      const alternativePresentation = details.exercises.get(
                        exerciseIdentityKey(
                          alternative.exercise_id,
                          alternative.exercise_version,
                        ),
                      );
                      return (
                        <Button
                          key={exerciseIdentityKey(
                            alternative.exercise_id,
                            alternative.exercise_version,
                          )}
                          disabled={busy}
                          label={`Use ${alternativePresentation?.copy.name ?? 'this movement'}`}
                          onPress={() =>
                            onReplace(item.value.order, alternative.exercise_id)
                          }
                          variant="secondary"
                        />
                      );
                    })}
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      ))}

      {details.routine.status === 'ready' ? (
        <View style={styles.finalActions}>
          <Button
            accessibilityHint="Opens the guided session using this exact routine."
            disabled={busy}
            label="Start routine"
            onPress={onStart}
          />
          <Button
            accessibilityHint="Builds another validated option and preserves this routine in history."
            disabled={busy}
            label={busy ? 'Updating…' : 'Build another option'}
            onPress={onRegenerate}
            variant="secondary"
          />
        </View>
      ) : null}
    </Screen>
  );
}

export function RoutinePreviewScreen() {
  const router = useRouter();
  const { colors } = useRestoreTheme();
  const parameters = useLocalSearchParams<{ routineId?: string | string[] }>();
  const routines = useRoutines();
  const { loadById } = routines;
  const routineId = resolveRoutineRouteId(parameters.routineId);

  useEffect(() => {
    if (routineId !== null) void loadById(routineId);
  }, [loadById, routineId]);

  if (routineId === null) {
    return (
      <Screen>
        <ErrorState
          description="Return to Today and open the routine again."
          title="This routine link is not valid"
        />
      </Screen>
    );
  }
  if (routines.status === 'loading' || routines.details === null) {
    return (
      <Screen>
        {routines.status === 'error' ? (
          <ErrorState
            description="Your saved routine is still on this iPhone."
            onRetry={() => void routines.loadById(routineId)}
            title="The routine could not be loaded"
          />
        ) : (
          <Text style={[styles.body, { color: colors.textMuted }]}>
            Loading routine…
          </Text>
        )}
      </Screen>
    );
  }
  const details = routines.details;

  const replaceRoute = (nextRoutineId: string) =>
    router.replace({
      pathname: '/routine/[routineId]',
      params: { routineId: nextRoutineId },
    });

  return (
    <RoutinePreviewContent
      busy={routines.status === 'working'}
      details={details}
      failureCode={routines.failureCode}
      onBack={() => router.back()}
      onRegenerate={() => {
        void routines
          .regenerate(details.routine.value.routine_id)
          .then((result) => {
            if (result.ok)
              replaceRoute(result.details.routine.value.routine_id);
          });
      }}
      onStart={() =>
        router.push({
          pathname: '/session/[routineId]',
          params: { routineId: details.routine.value.routine_id },
        })
      }
      onReplace={(itemOrder, replacementExerciseId) => {
        void routines
          .replace(
            details.routine.value.routine_id,
            itemOrder,
            replacementExerciseId,
          )
          .then((result) => {
            if (result.ok)
              replaceRoute(result.details.routine.value.routine_id);
          });
      }}
    />
  );
}

const styles = StyleSheet.create({
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  heading: { gap: spacing.xs },
  title: {
    fontSize: typography.display,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  body: { fontSize: typography.body, lineHeight: 25 },
  stopGuidance: {
    borderRadius: radius.md,
    gap: spacing.sm,
    padding: spacing.md,
  },
  stopTitle: { fontSize: typography.body, fontWeight: '700' },
  alert: { fontSize: typography.body, fontWeight: '700', lineHeight: 25 },
  group: { gap: spacing.sm },
  phaseTitle: { fontSize: typography.title, fontWeight: '700' },
  itemHeading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  itemHeadingText: { flex: 1, gap: spacing.xs },
  itemTitle: { fontSize: typography.body, fontWeight: '700', lineHeight: 24 },
  dose: { fontSize: typography.label, fontWeight: '700', lineHeight: 21 },
  warning: { fontSize: typography.label, fontWeight: '700', lineHeight: 21 },
  options: { gap: spacing.sm },
  finalActions: { gap: spacing.sm },
  optionHeading: { fontSize: typography.label, fontWeight: '700' },
});
