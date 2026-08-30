import {
  AccessibilityInfo,
  findNodeHandle,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { radius, spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';
import { BodyBaselineSelector } from '@/features/onboarding/body-baseline-selector';
import { DraggableGoalList } from '@/features/onboarding/draggable-goal-list';
import { DurationSelector } from '@/features/onboarding/duration-selector';
import type {
  OnboardingProfileInput,
  SaveProfileResult,
  UserProfile,
} from '@/features/onboarding/profile';
import {
  currentSafetyRulesVersion,
  equipmentOptions,
  goalOptions,
  trainingTypeGroups,
  trainingTypeOptions,
} from '@/features/onboarding/profile-options';

const stepCount = 7;

type OnboardingProfileScreenProps = {
  initialProfile: UserProfile | null;
  onSave: (input: OnboardingProfileInput) => Promise<SaveProfileResult>;
  onComplete?: () => void;
};

type ChoiceProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityHint?: string;
};

function Choice({ label, selected, onPress, accessibilityHint }: ChoiceProps) {
  const { colors } = useRestoreTheme();

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        {
          backgroundColor: selected ? colors.accentMuted : colors.surface,
          borderColor: selected ? colors.accent : colors.border,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <Text style={[styles.choiceLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.choiceStatus, { color: colors.textMuted }]}>
        {selected ? 'Selected' : 'Not selected'}
      </Text>
    </Pressable>
  );
}

function initialInput(profile: UserProfile | null): OnboardingProfileInput {
  if (profile !== null) {
    return {
      goalSlugs: profile.goalSlugs,
      bodyBaseline: profile.bodyBaseline,
      equipmentIds: profile.equipmentIds,
      trainingTypes: profile.trainingTypes,
      preferredDurations: profile.preferredDurations,
      safetyAcknowledged:
        profile.safetyRulesVersion === currentSafetyRulesVersion,
    };
  }

  return {
    goalSlugs: [],
    bodyBaseline: [],
    equipmentIds: [],
    trainingTypes: [],
    preferredDurations: { quick: 5, normal: 15, deep: 30 },
    safetyAcknowledged: false,
  };
}

function toggleOrdered<Value extends string>(
  values: readonly Value[],
  value: Value,
): Value[] {
  return values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value];
}

export function OnboardingProfileScreen({
  initialProfile,
  onSave,
  onComplete,
}: OnboardingProfileScreenProps) {
  const { colors } = useRestoreTheme();
  const [step, setStep] = useState(0);
  const [input, setInput] = useState(() => initialInput(initialProfile));
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const headingRef = useRef<Text>(null);
  const editing = initialProfile !== null;

  useEffect(() => {
    const node = findNodeHandle(headingRef.current);
    if (node !== null) AccessibilityInfo.setAccessibilityFocus(node);
  }, [step]);

  const update = (change: Partial<OnboardingProfileInput>) => {
    setInput((current) => ({ ...current, ...change }));
    setErrorMessage(null);
  };

  const advance = () =>
    setStep((current) => Math.min(current + 1, stepCount - 1));
  const back = () => setStep((current) => Math.max(current - 1, 0));

  const skip = () => {
    if (step === 1) update({ goalSlugs: [] });
    if (step === 2) update({ bodyBaseline: [] });
    if (step === 3) update({ equipmentIds: [] });
    if (step === 4) update({ trainingTypes: [] });
    if (step === 5) {
      update({ preferredDurations: { quick: null, normal: null, deep: null } });
    }
    advance();
  };

  const save = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      const result = await onSave(input);
      if (!result.ok) {
        setErrorMessage(
          result.issues.some(
            (issue) => issue.code === 'profile_safety_acknowledgement_required',
          )
            ? 'Read and acknowledge the safety boundary before continuing.'
            : 'Review the selected profile values and try again.',
        );
        return;
      }
      onComplete?.();
    } catch {
      setErrorMessage(
        'Restore could not save your profile. Your existing information was not changed.',
      );
    } finally {
      setSaving(false);
    }
  };

  const title = [
    editing ? 'Review your profile' : 'Make Restore yours',
    'What would you like to work on?',
    'Where would you like extra attention?',
    'What do you have available?',
    'How does movement fit your week?',
    'How much time feels useful?',
    'Before you begin',
  ][step];

  return (
    <Screen testID={editing ? 'profile-edit-screen' : 'onboarding-screen'}>
      <View style={styles.heading}>
        <Badge
          label={step === 0 ? 'Private and offline' : `Step ${step} of 6`}
          tone="accent"
        />
        <Text
          accessibilityRole="header"
          ref={headingRef}
          style={[styles.title, { color: colors.text }]}
        >
          {title}
        </Text>
      </View>

      {step === 0 ? (
        <>
          <Card>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              A few choices, shaped around you
            </Text>
            <Text style={[styles.body, { color: colors.textMuted }]}>
              Tell Restore what matters to you and what you usually have
              available. Your goals and preferences are optional, stay on this
              iPhone, and can be changed later.
            </Text>
          </Card>
          <Button
            accessibilityHint="Opens the optional profile questions."
            label={editing ? 'Review profile' : 'Get started'}
            onPress={advance}
          />
          {editing && onComplete ? (
            <Button label="Cancel" onPress={onComplete} variant="secondary" />
          ) : null}
        </>
      ) : null}

      {step === 1 ? (
        <>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            Choose as many as you like. Your first goal gets the most emphasis.
          </Text>
          <View style={styles.choiceList}>
            {goalOptions.map((option) => (
              <Choice
                key={option.value}
                label={option.label}
                onPress={() =>
                  update({
                    goalSlugs: toggleOrdered(input.goalSlugs, option.value),
                  })
                }
                selected={input.goalSlugs.includes(option.value)}
              />
            ))}
          </View>
          {input.goalSlugs.length > 0 ? (
            <Card>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Your priorities
              </Text>
              <Text style={[styles.note, { color: colors.textMuted }]}>
                Drag the handle to change the order.
              </Text>
              <DraggableGoalList
                goals={input.goalSlugs}
                labelForGoal={(slug) =>
                  goalOptions.find((option) => option.value === slug)?.label ??
                  slug
                }
                onChange={(goalSlugs) => update({ goalSlugs })}
              />
            </Card>
          ) : null}
        </>
      ) : null}

      {step === 2 ? (
        <BodyBaselineSelector
          onChange={(bodyBaseline) => update({ bodyBaseline })}
          value={input.bodyBaseline}
        />
      ) : null}

      {step === 3 ? (
        <>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            Select what you can usually use at home. Restore will keep these
            choices in mind when preparing a routine.
          </Text>
          <View style={styles.choiceList}>
            {equipmentOptions.map((option) => (
              <Choice
                key={option.id}
                label={option.label}
                onPress={() =>
                  update({
                    equipmentIds: toggleOrdered(input.equipmentIds, option.id),
                  })
                }
                selected={input.equipmentIds.includes(option.id)}
              />
            ))}
          </View>
        </>
      ) : null}

      {step === 4 ? (
        <>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            Choose anything that regularly appears in your week. This helps
            Restore complement what you already do.
          </Text>
          <View style={styles.trainingGroups}>
            {trainingTypeGroups.map((group) => (
              <View key={group.label} style={styles.trainingGroup}>
                <Text
                  accessibilityRole="header"
                  style={[styles.sectionTitle, { color: colors.text }]}
                >
                  {group.label}
                </Text>
                <View style={styles.choiceList}>
                  {group.values.map((value) => {
                    const option = trainingTypeOptions.find(
                      (entry) => entry.value === value,
                    );
                    if (option === undefined) return null;
                    return (
                      <Choice
                        key={option.value}
                        label={option.label}
                        onPress={() =>
                          update({
                            trainingTypes: toggleOrdered(
                              input.trainingTypes,
                              option.value,
                            ),
                          })
                        }
                        selected={input.trainingTypes.includes(option.value)}
                      />
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {step === 5 ? (
        <Card>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            Pick the lengths you are most likely to use. Practical defaults are
            already selected, and every option can be left open.
          </Text>
          <DurationSelector
            onChange={(preferredDurations) => update({ preferredDurations })}
            value={input.preferredDurations}
          />
        </Card>
      ) : null}

      {step === 6 ? (
        <>
          <Card>
            <Badge label="Please read" tone="accent" />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Restore has limits
            </Text>
            <Text style={[styles.body, { color: colors.text }]}>
              Restore offers self-guided mobility and recovery. It cannot tell
              whether a symptom or movement is medically safe, and it does not
              replace professional or urgent care.
            </Text>
            <Text style={[styles.body, { color: colors.text }]}>
              Do not begin or continue a routine if you have sudden severe pain,
              recent major trauma, new numbness or tingling, unexplained
              weakness or loss of control, radiating symptoms, significant
              swelling or visible deformity, dizziness or fainting, chest or
              breathing symptoms, or a rapidly worsening problem.
            </Text>
            <Text style={[styles.body, { color: colors.text }]}>
              Stop any movement that makes symptoms worse and seek appropriate
              care when needed. Restore will still check your current symptoms
              before preparing a routine.
            </Text>
          </Card>
          <Pressable
            accessibilityHint="Required to finish setup. This does not bypass safety checks."
            accessibilityLabel="I understand Restore’s safety boundary"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: input.safetyAcknowledged }}
            onPress={() =>
              update({ safetyAcknowledged: !input.safetyAcknowledged })
            }
            style={({ pressed }) => [
              styles.acknowledgement,
              {
                backgroundColor: input.safetyAcknowledged
                  ? colors.accentMuted
                  : colors.surface,
                borderColor: input.safetyAcknowledged
                  ? colors.accent
                  : colors.border,
                opacity: pressed ? 0.82 : 1,
              },
            ]}
          >
            <Text style={[styles.choiceLabel, { color: colors.text }]}>
              I understand Restore’s safety boundary
            </Text>
            <Text style={[styles.body, { color: colors.textMuted }]}>
              {input.safetyAcknowledged ? 'Acknowledged' : 'Required'}
            </Text>
          </Pressable>
          <Card>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Reminders are optional
            </Text>
            <Text style={[styles.body, { color: colors.textMuted }]}>
              Restore will only ask for notification access when you choose to
              set a reminder. Nothing is requested during setup.
            </Text>
          </Card>
          {errorMessage ? (
            <Text
              accessibilityRole="alert"
              style={[styles.error, { color: colors.danger }]}
            >
              {errorMessage}
            </Text>
          ) : null}
        </>
      ) : null}

      {step > 0 ? (
        <View style={styles.navigation}>
          {step < stepCount - 1 ? (
            <>
              <Button label="Continue" onPress={advance} />
              <Button
                label="Skip this step"
                onPress={skip}
                variant="secondary"
              />
            </>
          ) : (
            <Button
              disabled={!input.safetyAcknowledged || saving}
              label={
                saving ? 'Saving…' : editing ? 'Save profile' : 'Finish setup'
              }
              onPress={() => void save()}
            />
          )}
          <Button label="Back" onPress={back} variant="secondary" />
        </View>
      ) : null}
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
  choiceList: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.title,
    fontWeight: '700',
    paddingTop: spacing.sm,
  },
  choice: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  choiceLabel: {
    fontSize: typography.body,
    fontWeight: '700',
  },
  choiceStatus: {
    fontSize: typography.caption,
  },
  note: {
    fontSize: typography.label,
    lineHeight: 21,
  },
  trainingGroups: {
    gap: spacing.lg,
  },
  trainingGroup: {
    gap: spacing.sm,
  },
  acknowledgement: {
    borderRadius: radius.md,
    borderWidth: 2,
    gap: spacing.xs,
    minHeight: 64,
    padding: spacing.md,
  },
  error: {
    fontSize: typography.body,
    fontWeight: '700',
    lineHeight: 25,
  },
  navigation: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
});
