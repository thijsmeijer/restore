import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { NumericStepper } from '@/components/numeric-stepper';
import { OptionChip } from '@/components/option-chip';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';
import { BodyObservationSelector } from '@/features/check-in/body-observation-selector';
import type {
  CheckInInput,
  SaveCheckInResult,
} from '@/features/check-in/check-in';
import { normalizeOptionalNote } from '@/features/check-in/check-in';
import {
  checkInModeOptions,
  environmentOptions,
  trainingStatusOptions,
  type CheckInEnvironment,
  type CheckInTrainingStatus,
} from '@/features/check-in/check-in-options';
import type { UserProfile } from '@/features/onboarding/profile';
import {
  equipmentOptions,
  trainingTypeOptions,
  type TrainingType,
} from '@/features/onboarding/profile-options';

const durationPresets = [5, 10, 15, 20, 30, 45] as const;

const readinessOptions = [
  { value: null, label: 'Skip' },
  { value: 1, label: 'Very low' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Steady' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Great' },
] as const;

const stressOptions = [
  { value: null, label: 'Skip' },
  { value: 1, label: 'Easy' },
  { value: 2, label: 'Light' },
  { value: 3, label: 'Moderate' },
  { value: 4, label: 'Hard' },
  { value: 5, label: 'Very hard' },
] as const;

type CheckInFormScreenProps = {
  readonly profile: UserProfile | null;
  readonly onSave: (input: CheckInInput) => Promise<SaveCheckInResult>;
  readonly onComplete?: () => void;
  readonly onCancel?: () => void;
};

function initialInput(profile: UserProfile | null): CheckInInput {
  return {
    mode: 'daily_restore',
    availableMinutes: profile?.preferredDurations.normal ?? 15,
    readiness: null,
    environment: 'home',
    equipmentIds: profile?.equipmentIds ?? [],
    regions: [],
    training: null,
    note: null,
  };
}

function orderedTrainingTypes(profile: UserProfile | null) {
  const preferred = profile?.trainingTypes ?? [];
  return [...trainingTypeOptions].sort((left, right) => {
    const leftIndex = preferred.indexOf(left.value);
    const rightIndex = preferred.indexOf(right.value);
    if (leftIndex === -1 && rightIndex === -1) return 0;
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  });
}

function toggleValue(values: readonly string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value];
}

export function CheckInFormScreen({
  profile,
  onSave,
  onComplete,
  onCancel,
}: CheckInFormScreenProps) {
  const { colors } = useRestoreTheme();
  const [input, setInput] = useState(() => initialInput(profile));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [equipmentSheetVisible, setEquipmentSheetVisible] = useState(false);
  const [noteVisible, setNoteVisible] = useState(false);
  const headingRef = useRef<Text>(null);
  const orderedTraining = useMemo(
    () => orderedTrainingTypes(profile),
    [profile],
  );

  useEffect(() => {
    const node = findNodeHandle(headingRef.current);
    if (node !== null) AccessibilityInfo.setAccessibilityFocus(node);
  }, []);

  const update = (change: Partial<CheckInInput>) => {
    setInput((current) => ({ ...current, ...change }));
    setErrorMessage(null);
  };

  const updateEnvironment = (environment: CheckInEnvironment) => {
    if (environment === input.environment) return;
    update({
      environment,
      equipmentIds: environment === 'home' ? (profile?.equipmentIds ?? []) : [],
    });
  };

  const updateTrainingStatus = (status: CheckInTrainingStatus | null) => {
    if (status === null) {
      update({ training: null });
      return;
    }
    update({
      training: {
        type:
          input.training?.type ??
          profile?.trainingTypes[0] ??
          trainingTypeOptions[0].value,
        status,
        stress: input.training?.stress ?? null,
      },
    });
  };

  const updateTrainingType = (type: TrainingType) => {
    if (input.training === null) return;
    update({ training: { ...input.training, type } });
  };

  const save = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      const result = await onSave({
        ...input,
        note: normalizeOptionalNote(note),
      });
      if (!result.ok) {
        setErrorMessage('Review the check-in values and try again.');
        return;
      }
      AccessibilityInfo.announceForAccessibility('Check-in saved.');
      onComplete?.();
    } catch {
      setErrorMessage(
        'Restore could not save this check-in. Your previous information was not changed.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen testID="check-in-screen">
      <View style={styles.heading}>
        <Badge label="Private and offline" tone="accent" />
        <Text
          accessibilityRole="header"
          ref={headingRef}
          style={[styles.title, { color: colors.text }]}
        >
          How are you feeling?
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          A few quick details shape what fits today. Skip anything you did not
          assess.
        </Text>
      </View>

      <Card>
        <Text
          accessibilityRole="header"
          style={[styles.cardTitle, { color: colors.text }]}
        >
          Your routine
        </Text>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Focus</Text>
        <View
          accessibilityLabel="Routine focus"
          accessibilityRole="radiogroup"
          style={styles.chips}
        >
          {checkInModeOptions.map((option) => (
            <OptionChip
              key={option.value}
              label={option.label}
              onPress={() => update({ mode: option.value })}
              role="radio"
              selected={input.mode === option.value}
            />
          ))}
        </View>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Time</Text>
        <View
          accessibilityLabel="Common time choices"
          accessibilityRole="radiogroup"
          style={styles.chips}
        >
          {durationPresets.map((minutes) => (
            <OptionChip
              key={minutes}
              label={`${minutes} min`}
              onPress={() => update({ availableMinutes: minutes })}
              role="radio"
              selected={input.availableMinutes === minutes}
            />
          ))}
        </View>
        <NumericStepper
          allowClear={false}
          label="Available minutes"
          maximum={90}
          minimum={2}
          onChange={(availableMinutes) => {
            if (availableMinutes !== null) update({ availableMinutes });
          }}
          value={input.availableMinutes}
          valueSuffix=" min"
        />
        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          Readiness
        </Text>
        <View
          accessibilityLabel="Readiness"
          accessibilityRole="radiogroup"
          style={styles.chips}
        >
          {readinessOptions.map((option) => (
            <OptionChip
              key={option.label}
              label={option.label}
              onPress={() => update({ readiness: option.value })}
              role="radio"
              selected={input.readiness === option.value}
            />
          ))}
        </View>
      </Card>

      <Card>
        <Text
          accessibilityRole="header"
          style={[styles.cardTitle, { color: colors.text }]}
        >
          Body today
        </Text>
        <BodyObservationSelector
          baselineRegionSlugs={
            profile?.bodyBaseline.map((selection) => selection.regionSlug) ?? []
          }
          onChange={(regions) => update({ regions })}
          value={input.regions}
        />
      </Card>

      <Card>
        <Text
          accessibilityRole="header"
          style={[styles.cardTitle, { color: colors.text }]}
        >
          Where are you?
        </Text>
        <View
          accessibilityLabel="Environment"
          accessibilityRole="radiogroup"
          style={styles.chips}
        >
          {environmentOptions.map((option) => (
            <OptionChip
              key={option.value}
              label={option.label}
              onPress={() => updateEnvironment(option.value)}
              role="radio"
              selected={input.environment === option.value}
            />
          ))}
        </View>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          Equipment available now
        </Text>
        {input.equipmentIds.length === 0 ? (
          <Text style={[styles.body, { color: colors.textMuted }]}>
            None selected
          </Text>
        ) : (
          <View style={styles.chips}>
            {input.equipmentIds.map((equipmentId) => (
              <Badge
                key={equipmentId}
                label={
                  equipmentOptions.find((option) => option.id === equipmentId)
                    ?.label ?? 'Equipment'
                }
              />
            ))}
          </View>
        )}
        <Button
          label={
            input.equipmentIds.length === 0
              ? 'Choose equipment'
              : 'Change equipment'
          }
          onPress={() => setEquipmentSheetVisible(true)}
          variant="secondary"
        />
      </Card>

      <Sheet
        onRequestClose={() => setEquipmentSheetVisible(false)}
        title="Equipment available now"
        visible={equipmentSheetVisible}
      >
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Select only what you can use in this location right now.
        </Text>
        <View style={styles.chips}>
          {equipmentOptions.map((option) => (
            <OptionChip
              key={option.id}
              label={option.label}
              onPress={() =>
                update({
                  equipmentIds: toggleValue(input.equipmentIds, option.id),
                })
              }
              selected={input.equipmentIds.includes(option.id)}
            />
          ))}
        </View>
        <Button label="Done" onPress={() => setEquipmentSheetVisible(false)} />
      </Sheet>

      <Card>
        <Text
          accessibilityRole="header"
          style={[styles.cardTitle, { color: colors.text }]}
        >
          Training today
        </Text>
        <View
          accessibilityLabel="Training timing"
          accessibilityRole="radiogroup"
          style={styles.chips}
        >
          <OptionChip
            label="None"
            onPress={() => updateTrainingStatus(null)}
            role="radio"
            selected={input.training === null}
          />
          {trainingStatusOptions.map((option) => (
            <OptionChip
              key={option.value}
              label={option.label}
              onPress={() => updateTrainingStatus(option.value)}
              role="radio"
              selected={input.training?.status === option.value}
            />
          ))}
        </View>
        {input.training !== null ? (
          <>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>
              Training type
            </Text>
            <View
              accessibilityLabel="Training type"
              accessibilityRole="radiogroup"
              style={styles.chips}
            >
              {orderedTraining.map((option) => (
                <OptionChip
                  key={option.value}
                  label={option.label}
                  onPress={() => updateTrainingType(option.value)}
                  role="radio"
                  selected={input.training?.type === option.value}
                />
              ))}
            </View>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>
              {input.training.status === 'completed'
                ? 'How hard was it?'
                : 'How hard do you expect it to be?'}
            </Text>
            <View
              accessibilityLabel="Training effort"
              accessibilityRole="radiogroup"
              style={styles.chips}
            >
              {stressOptions.map((option) => (
                <OptionChip
                  key={option.label}
                  label={option.label}
                  onPress={() => {
                    if (input.training !== null) {
                      update({
                        training: {
                          ...input.training,
                          stress: option.value,
                        },
                      });
                    }
                  }}
                  role="radio"
                  selected={input.training?.stress === option.value}
                />
              ))}
            </View>
          </>
        ) : null}
      </Card>

      <Card>
        <Text
          accessibilityRole="header"
          style={[styles.cardTitle, { color: colors.text }]}
        >
          Note
        </Text>
        {noteVisible ? (
          <>
            <TextInput
              accessibilityLabel="Check-in note"
              maxLength={1000}
              multiline
              onChangeText={setNote}
              placeholder="Add context you want to remember"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.noteInput,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              textAlignVertical="top"
              value={note}
            />
            <Text style={[styles.characterCount, { color: colors.textMuted }]}>
              {note.length} of 1000 characters
            </Text>
            <Button
              label="Remove note"
              onPress={() => {
                setNote('');
                setNoteVisible(false);
              }}
              variant="secondary"
            />
          </>
        ) : (
          <Button
            label="Add a note"
            onPress={() => setNoteVisible(true)}
            variant="secondary"
          />
        )}
      </Card>

      {errorMessage ? (
        <Text
          accessibilityRole="alert"
          style={[styles.error, { color: colors.danger }]}
        >
          {errorMessage}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button
          disabled={saving}
          label={saving ? 'Saving…' : 'Save check-in'}
          onPress={() => void save()}
        />
        {onCancel ? (
          <Button label="Cancel" onPress={onCancel} variant="secondary" />
        ) : null}
      </View>
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
  sectionLabel: {
    fontSize: typography.label,
    fontWeight: '700',
    paddingTop: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  noteInput: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: typography.body,
    lineHeight: 25,
    minHeight: 120,
    padding: spacing.md,
  },
  characterCount: {
    fontSize: typography.caption,
    textAlign: 'right',
  },
  error: {
    fontSize: typography.body,
    fontWeight: '700',
    lineHeight: 25,
  },
  actions: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
});
