import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  findNodeHandle,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { NumericStepper } from '@/components/numeric-stepper';
import { OptionChip } from '@/components/option-chip';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { radius, spacing, typography } from '@/design-system/tokens';
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
  type CheckInMode,
  type CheckInTrainingStatus,
} from '@/features/check-in/check-in-options';
import type { UserProfile } from '@/features/onboarding/profile';
import {
  equipmentOptions,
  trainingTypeOptions,
  type TrainingType,
} from '@/features/onboarding/profile-options';

const stepCount = 4;
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

const stepCopy = [
  {
    title: 'What do you need today?',
    description: 'Choose the focus and time for this routine.',
  },
  {
    title: 'How are you moving?',
    description: 'Only add what should change the routine today.',
  },
  {
    title: 'What can you use?',
    description: 'Confirm where you are and what is available now.',
  },
  {
    title: 'Any training today?',
    description: 'Add training context if it matters, then you are done.',
  },
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

function equipmentSummary(equipmentIds: readonly string[]): string {
  if (equipmentIds.length === 0) return 'No equipment selected';
  const labels = equipmentIds
    .slice(0, 2)
    .map(
      (equipmentId) =>
        equipmentOptions.find((option) => option.id === equipmentId)?.label ??
        'Equipment',
    );
  const remaining = equipmentIds.length - labels.length;
  return remaining > 0
    ? `${labels.join(', ')} +${remaining}`
    : labels.join(', ');
}

export function checkInNeedsScrolling(fontScale: number): boolean {
  return fontScale > 1.2;
}

export function CheckInFormScreen({
  profile,
  onSave,
  onComplete,
  onCancel,
}: CheckInFormScreenProps) {
  const { colors } = useRestoreTheme();
  const { fontScale } = useWindowDimensions();
  const [input, setInput] = useState(() => initialInput(profile));
  const [note, setNote] = useState('');
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timeSheetVisible, setTimeSheetVisible] = useState(false);
  const [equipmentSheetVisible, setEquipmentSheetVisible] = useState(false);
  const [trainingSheetVisible, setTrainingSheetVisible] = useState(false);
  const [noteSheetVisible, setNoteSheetVisible] = useState(false);
  const [transition] = useState(() => new Animated.Value(1));
  const headingRef = useRef<Text>(null);
  const orderedTraining = useMemo(
    () => orderedTrainingTypes(profile),
    [profile],
  );
  const currentStep = stepCopy[step] ?? stepCopy[0];

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const node = findNodeHandle(headingRef.current);
    if (node !== null) AccessibilityInfo.setAccessibilityFocus(node);

    if (reduceMotion) {
      transition.setValue(1);
      return;
    }
    const animation = Animated.timing(transition, {
      duration: 180,
      toValue: 1,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [reduceMotion, step, transition]);

  const update = (change: Partial<CheckInInput>) => {
    setInput((current) => ({ ...current, ...change }));
    setErrorMessage(null);
  };

  const moveTo = (nextStep: number) => {
    const boundedStep = Math.max(0, Math.min(stepCount - 1, nextStep));
    if (boundedStep === step) return;
    setDirection(boundedStep > step ? 1 : -1);
    transition.setValue(reduceMotion ? 1 : 0);
    setStep(boundedStep);
  };

  const updateEnvironment = (environment: CheckInEnvironment) => {
    if (environment === input.environment) return;
    update({
      environment,
      equipmentIds: environment === 'home' ? (profile?.equipmentIds ?? []) : [],
    });
  };

  const updateMode = (mode: CheckInMode) => {
    if (mode === input.mode) return;
    const trainingType =
      input.training?.type ??
      profile?.trainingTypes[0] ??
      trainingTypeOptions[0].value;
    update({
      mode,
      training:
        mode === 'pre_workout_prep'
          ? { type: trainingType, status: 'planned', stress: null }
          : mode === 'post_workout_reset'
            ? { type: trainingType, status: 'completed', stress: null }
            : null,
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
    setTrainingSheetVisible(false);
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
    <Screen
      bottomSafeArea
      compact
      scrollEnabled={checkInNeedsScrolling(fontScale)}
      testID="check-in-screen"
    >
      <View style={styles.topBar}>
        <Badge label="Check-in" tone="accent" />
        <View
          accessibilityLabel={`Step ${step + 1} of ${stepCount}`}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 1, max: stepCount, now: step + 1 }}
          style={styles.progress}
        >
          {Array.from({ length: stepCount }, (_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                {
                  backgroundColor:
                    index <= step ? colors.accent : colors.surfaceMuted,
                  borderColor: index <= step ? colors.accent : colors.border,
                  width: index === step ? 24 : 10,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.heading}>
        <Text
          accessibilityRole="header"
          ref={headingRef}
          style={[styles.title, { color: colors.text }]}
        >
          {currentStep.title}
        </Text>
        <Text style={[styles.description, { color: colors.textMuted }]}>
          {currentStep.description}
        </Text>
      </View>

      <Animated.View
        style={[
          styles.step,
          {
            opacity: transition,
            transform: [
              {
                translateX: transition.interpolate({
                  inputRange: [0, 1],
                  outputRange: [direction * 20, 0],
                }),
              },
            ],
          },
        ]}
      >
        {step === 0 ? (
          <Card compact>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>
              Routine focus
            </Text>
            <View
              accessibilityLabel="Routine focus"
              accessibilityRole="radiogroup"
              style={styles.chips}
            >
              {checkInModeOptions.map((option) => (
                <OptionChip
                  key={option.value}
                  label={option.label}
                  onPress={() => updateMode(option.value)}
                  role="radio"
                  selected={input.mode === option.value}
                />
              ))}
            </View>
            <View style={styles.sectionHeading}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                Time
              </Text>
              <Badge label={`${input.availableMinutes} min`} />
            </View>
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
            <Button
              label="Choose another time"
              onPress={() => setTimeSheetVisible(true)}
              variant="secondary"
            />
          </Card>
        ) : null}

        {step === 1 ? (
          <Card compact>
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
            <Text style={[styles.sectionLabel, { color: colors.text }]}>
              Body focus
            </Text>
            <BodyObservationSelector
              baselineRegionSlugs={
                profile?.bodyBaseline.map(
                  (selection) => selection.regionSlug,
                ) ?? []
              }
              compact
              onChange={(regions) => update({ regions })}
              value={input.regions}
            />
          </Card>
        ) : null}

        {step === 2 ? (
          <Card compact>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>
              Location
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
            <View style={styles.sectionHeading}>
              <View style={styles.sectionHeadingText}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>
                  Equipment
                </Text>
                <Text style={[styles.summary, { color: colors.textMuted }]}>
                  {equipmentSummary(input.equipmentIds)}
                </Text>
              </View>
              <Badge label={`${input.equipmentIds.length} selected`} />
            </View>
            <Button
              label="Adjust equipment"
              onPress={() => setEquipmentSheetVisible(true)}
              variant="secondary"
            />
          </Card>
        ) : null}

        {step === 3 ? (
          <Card compact>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>
              Training
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
                <View style={styles.sectionHeading}>
                  <View style={styles.sectionHeadingText}>
                    <Text style={[styles.sectionLabel, { color: colors.text }]}>
                      Type
                    </Text>
                    <Text style={[styles.summary, { color: colors.textMuted }]}>
                      {trainingTypeOptions.find(
                        (option) => option.value === input.training?.type,
                      )?.label ?? 'Training'}
                    </Text>
                  </View>
                  <Button
                    label="Change"
                    onPress={() => setTrainingSheetVisible(true)}
                    variant="secondary"
                  />
                </View>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>
                  Effort
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
            ) : (
              <Text style={[styles.summary, { color: colors.textMuted }]}>
                No training context will be added.
              </Text>
            )}
            <Button
              label={note.length > 0 ? 'Edit note' : 'Add a note'}
              onPress={() => setNoteSheetVisible(true)}
              variant="secondary"
            />
          </Card>
        ) : null}
      </Animated.View>

      {errorMessage ? (
        <Text
          accessibilityRole="alert"
          style={[styles.error, { color: colors.danger }]}
        >
          {errorMessage}
        </Text>
      ) : null}

      <View style={styles.actions}>
        {step > 0 ? (
          <Button
            containerStyle={styles.actionButton}
            disabled={saving}
            label="Back"
            onPress={() => moveTo(step - 1)}
            variant="secondary"
          />
        ) : onCancel ? (
          <Button
            containerStyle={styles.actionButton}
            label="Cancel"
            onPress={onCancel}
            variant="secondary"
          />
        ) : null}
        <Button
          containerStyle={styles.actionButton}
          disabled={saving}
          label={
            step === stepCount - 1
              ? saving
                ? 'Saving…'
                : 'Save check-in'
              : 'Continue'
          }
          onPress={() =>
            step === stepCount - 1 ? void save() : moveTo(step + 1)
          }
        />
      </View>

      <Sheet
        onRequestClose={() => setTimeSheetVisible(false)}
        title="Choose your time"
        visible={timeSheetVisible}
      >
        <NumericStepper
          allowClear={false}
          label="Available minutes"
          maximum={90}
          minimum={2}
          onChange={(availableMinutes) => {
            if (availableMinutes !== null) update({ availableMinutes });
          }}
          quickValues={[2, 15, 30, 60, 90]}
          value={input.availableMinutes}
          valueSuffix=" min"
        />
        <Button label="Done" onPress={() => setTimeSheetVisible(false)} />
      </Sheet>

      <Sheet
        onRequestClose={() => setEquipmentSheetVisible(false)}
        title="Equipment available now"
        visible={equipmentSheetVisible}
      >
        <Text style={[styles.description, { color: colors.textMuted }]}>
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

      <Sheet
        onRequestClose={() => setTrainingSheetVisible(false)}
        title="Training type"
        visible={trainingSheetVisible}
      >
        <View accessibilityRole="radiogroup" style={styles.chips}>
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
      </Sheet>

      <Sheet
        onRequestClose={() => setNoteSheetVisible(false)}
        title="Check-in note"
        visible={noteSheetVisible}
      >
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
        <Button label="Done" onPress={() => setNoteSheetVisible(false)} />
        {note.length > 0 ? (
          <Button
            label="Remove note"
            onPress={() => {
              setNote('');
              setNoteSheetVisible(false);
            }}
            variant="secondary"
          />
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  progress: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
  },
  progressDot: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 10,
  },
  heading: {
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  description: {
    fontSize: typography.body,
    lineHeight: 24,
  },
  step: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: typography.label,
    fontWeight: '700',
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  sectionHeadingText: {
    flex: 1,
    gap: spacing.xs,
  },
  summary: {
    fontSize: typography.label,
    lineHeight: 21,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  noteInput: {
    borderRadius: radius.md,
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
    fontSize: typography.label,
    fontWeight: '700',
    lineHeight: 21,
  },
});
