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
import { SegmentedControl } from '@/components/segmented-control';
import { Slider } from '@/components/slider';
import { radius, spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';
import type {
  OnboardingProfileInput,
  SaveProfileResult,
  UserProfile,
} from '@/features/onboarding/profile';
import {
  bodyRegionOptions,
  currentSafetyRulesVersion,
  equipmentOptions,
  goalOptions,
  trainingTypeOptions,
} from '@/features/onboarding/profile-options';

const stepCount = 7;
const bodySurfaceGroups = [
  { surface: 'front', label: 'Front' },
  { surface: 'back', label: 'Back' },
  { surface: 'both', label: 'Front and back' },
  { surface: 'detail', label: 'Hands and feet' },
] as const;

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

type ReorderControlsProps = {
  label: string;
  index: number;
  count: number;
  onMove: (direction: -1 | 1) => void;
};

function ReorderControls({
  label,
  index,
  count,
  onMove,
}: ReorderControlsProps) {
  const { colors } = useRestoreTheme();

  const control = (direction: -1 | 1, text: string, disabled: boolean) => (
    <Pressable
      accessibilityLabel={`Move ${label} ${text.toLowerCase()}`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onMove(direction)}
      style={({ pressed }) => [
        styles.reorderButton,
        {
          borderColor: colors.border,
          opacity: disabled ? 0.45 : pressed ? 0.72 : 1,
        },
      ]}
    >
      <Text style={[styles.reorderLabel, { color: colors.text }]}>{text}</Text>
    </Pressable>
  );

  return (
    <View style={styles.reorderItem}>
      <Text style={[styles.orderText, { color: colors.text }]}>
        {index + 1}. {label}
      </Text>
      <View style={styles.reorderRow}>
        {control(-1, 'Earlier', index === 0)}
        {control(1, 'Later', index === count - 1)}
      </View>
    </View>
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

function move<Value>(
  values: readonly Value[],
  index: number,
  direction: -1 | 1,
) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= values.length) return [...values];

  const result = [...values];
  const current = result[index];
  const target = result[nextIndex];
  if (current === undefined || target === undefined) return result;
  result[index] = target;
  result[nextIndex] = current;
  return result;
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
    editing ? 'Review your profile' : 'Welcome to Restore',
    'What should Restore support?',
    'Any commonly sensitive areas?',
    'What equipment is usually available?',
    'What does your training usually include?',
    'Choose useful routine lengths',
    'Understand the safety boundary',
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
              A short setup for relevant routines
            </Text>
            <Text style={[styles.body, { color: colors.textMuted }]}>
              Everything stays in Restore’s local database on this iPhone.
              Goals, body areas, equipment, training, and preferred times are
              optional and can be changed later.
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
            Select any goals. Their order becomes their priority order.
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
                Priority order
              </Text>
              {input.goalSlugs.map((slug, index) => (
                <ReorderControls
                  count={input.goalSlugs.length}
                  index={index}
                  key={slug}
                  label={
                    goalOptions.find((option) => option.value === slug)
                      ?.label ?? slug
                  }
                  onMove={(direction) =>
                    update({
                      goalSlugs: move(input.goalSlugs, index, direction),
                    })
                  }
                />
              ))}
            </Card>
          ) : null}
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            This text list is the accessible baseline selector. The interactive
            front/back map arrives in MAP-001. Selecting an area does not imply
            a diagnosis.
          </Text>
          <View style={styles.choiceList}>
            {bodySurfaceGroups.map((group) => (
              <View key={group.surface} style={styles.regionGroup}>
                <Text
                  accessibilityRole="header"
                  style={[styles.sectionTitle, { color: colors.text }]}
                >
                  {group.label}
                </Text>
                {bodyRegionOptions
                  .filter((option) => option.surface === group.surface)
                  .map((option) => {
                    const selected = input.bodyBaseline.find(
                      (entry) => entry.regionSlug === option.slug,
                    );
                    return (
                      <View key={option.slug}>
                        <Choice
                          accessibilityHint="Adds or removes this area from your optional baseline."
                          label={option.label}
                          onPress={() => {
                            update({
                              bodyBaseline: selected
                                ? input.bodyBaseline.filter(
                                    (entry) => entry.regionSlug !== option.slug,
                                  )
                                : [
                                    ...input.bodyBaseline,
                                    {
                                      regionSlug: option.slug,
                                      side:
                                        option.laterality === 'central'
                                          ? 'central'
                                          : 'bilateral',
                                    },
                                  ],
                            });
                          }}
                          selected={selected !== undefined}
                        />
                        {selected && option.laterality !== 'central' ? (
                          <View style={styles.sideControl}>
                            <SegmentedControl
                              label={`${option.label} side`}
                              onChange={(side) =>
                                update({
                                  bodyBaseline: input.bodyBaseline.map(
                                    (entry) =>
                                      entry.regionSlug === option.slug
                                        ? { ...entry, side }
                                        : entry,
                                  ),
                                })
                              }
                              options={
                                option.laterality === 'hybrid'
                                  ? [
                                      { label: 'Center', value: 'central' },
                                      { label: 'Left', value: 'left' },
                                      { label: 'Right', value: 'right' },
                                      { label: 'Both', value: 'bilateral' },
                                    ]
                                  : [
                                      { label: 'Left', value: 'left' },
                                      { label: 'Right', value: 'right' },
                                      { label: 'Both', value: 'bilateral' },
                                    ]
                              }
                              value={selected.side}
                            />
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
              </View>
            ))}
          </View>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            Select what is normally available at home. A routine may only use
            equipment available in its current context.
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
            Choose the training types that commonly appear in your week. Restore
            does not create strength programming.
          </Text>
          <View style={styles.choiceList}>
            {trainingTypeOptions.map((option) => (
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
            ))}
          </View>
        </>
      ) : null}

      {step === 5 ? (
        <Card>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            Suggested values are ready to use. Each duration stays between 2 and
            90 minutes.
          </Text>
          <Slider
            formatValue={(value) => `${value} minutes`}
            label="Quick routine"
            max={30}
            min={2}
            onChange={(quick) =>
              update({
                preferredDurations: {
                  quick,
                  normal: Math.max(
                    input.preferredDurations.normal ?? 15,
                    quick,
                  ),
                  deep: Math.max(input.preferredDurations.deep ?? 30, quick),
                },
              })
            }
            value={input.preferredDurations.quick ?? 5}
          />
          <Slider
            formatValue={(value) => `${value} minutes`}
            label="Normal routine"
            max={60}
            min={2}
            onChange={(normal) =>
              update({
                preferredDurations: {
                  quick: Math.min(input.preferredDurations.quick ?? 5, normal),
                  normal,
                  deep: Math.max(input.preferredDurations.deep ?? 30, normal),
                },
              })
            }
            value={input.preferredDurations.normal ?? 15}
          />
          <Slider
            formatValue={(value) => `${value} minutes`}
            label="Deep routine"
            max={90}
            min={2}
            onChange={(deep) =>
              update({
                preferredDurations: {
                  quick: Math.min(input.preferredDurations.quick ?? 5, deep),
                  normal: Math.min(input.preferredDurations.normal ?? 15, deep),
                  deep,
                },
              })
            }
            value={input.preferredDurations.deep ?? 30}
          />
        </Card>
      ) : null}

      {step === 6 ? (
        <>
          <Card>
            <Badge label="Engineering baseline" />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Restore has limits
            </Text>
            <Text style={[styles.body, { color: colors.text }]}>
              Restore supports self-guided mobility and recovery. It does not
              diagnose a condition, decide that movement is medically safe, or
              replace professional or urgent care.
            </Text>
            <Text style={[styles.body, { color: colors.text }]}>
              Do not start or continue a Restore routine when you report sudden
              severe pain, recent major trauma, new numbness or tingling,
              unexplained weakness or loss of control, radiating symptoms,
              significant swelling or visible deformity, dizziness, fainting,
              chest or breathing symptoms, or a rapidly worsening problem. The
              check-in will block routine generation for these reports.
            </Text>
            <Text style={[styles.body, { color: colors.text }]}>
              Stop aggravating movement and use appropriate professional or
              urgent care when needed. Acknowledging this message never bypasses
              the structured safety check that runs before routine generation.
            </Text>
          </Card>
          <Pressable
            accessibilityHint="Required to complete onboarding. This does not bypass safety checks."
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
              Reminders come later
            </Text>
            <Text style={[styles.body, { color: colors.textMuted }]}>
              Restore will not request notification permission during
              onboarding. Reminder controls arrive with the local scheduling
              milestone.
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
  regionGroup: {
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
  reorderItem: {
    gap: spacing.xs,
  },
  reorderRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  orderText: {
    fontSize: typography.label,
  },
  reorderButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    flex: 1,
    minHeight: 48,
    minWidth: 72,
    paddingHorizontal: spacing.sm,
  },
  reorderLabel: {
    fontSize: typography.caption,
    fontWeight: '700',
  },
  sideControl: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
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
