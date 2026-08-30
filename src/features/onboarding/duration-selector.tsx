import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';
import type { PreferredDurations } from '@/features/onboarding/profile';

type DurationKey = keyof PreferredDurations;

const durationGroups: readonly {
  key: DurationKey;
  label: string;
  hint: string;
  options: readonly (number | null)[];
}[] = [
  {
    key: 'quick',
    label: 'Quick',
    hint: 'For a small reset when time is tight.',
    options: [null, 2, 5, 10, 15],
  },
  {
    key: 'normal',
    label: 'Standard',
    hint: 'For your usual mobility session.',
    options: [null, 10, 15, 20, 30, 45],
  },
  {
    key: 'deep',
    label: 'Longer',
    hint: 'For days when you want more time.',
    options: [null, 20, 30, 45, 60, 90],
  },
];

export function adjustDurations(
  current: PreferredDurations,
  key: DurationKey,
  value: number | null,
): PreferredDurations {
  const next = { ...current, [key]: value };
  if (value === null) return next;

  if (key === 'quick') {
    if (next.normal !== null && next.normal < value) next.normal = value;
    if (next.deep !== null && next.deep < (next.normal ?? value)) {
      next.deep = next.normal ?? value;
    }
  }
  if (key === 'normal') {
    if (next.quick !== null && next.quick > value) next.quick = value;
    if (next.deep !== null && next.deep < value) next.deep = value;
  }
  if (key === 'deep') {
    if (next.normal !== null && next.normal > value) next.normal = value;
    if (next.quick !== null && next.quick > (next.normal ?? value)) {
      next.quick = next.normal ?? value;
    }
  }

  return next;
}

type DurationSelectorProps = {
  value: PreferredDurations;
  onChange: (value: PreferredDurations) => void;
};

export function DurationSelector({ value, onChange }: DurationSelectorProps) {
  const { colors } = useRestoreTheme();

  return (
    <View style={styles.groups}>
      {durationGroups.map((group) => (
        <View key={group.key} style={styles.group}>
          <View style={styles.heading}>
            <Text style={[styles.label, { color: colors.text }]}>
              {group.label}
            </Text>
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              {group.hint}
            </Text>
          </View>
          <View
            accessibilityLabel={`${group.label} routine length`}
            accessibilityRole="radiogroup"
            style={styles.options}
          >
            {group.options.map((option) => {
              const selected = value[group.key] === option;
              const label = option === null ? 'No preference' : `${option} min`;
              return (
                <Pressable
                  accessibilityLabel={`${group.label}: ${label}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  key={label}
                  onPress={() =>
                    onChange(adjustDurations(value, group.key, option))
                  }
                  style={({ pressed }) => [
                    styles.option,
                    {
                      backgroundColor: selected
                        ? colors.accent
                        : colors.surface,
                      borderColor: selected ? colors.accent : colors.border,
                      opacity: pressed ? 0.78 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      {
                        color: selected ? colors.accentText : colors.text,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  groups: {
    gap: spacing.lg,
  },
  group: {
    gap: spacing.sm,
  },
  heading: {
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.title,
    fontWeight: '700',
  },
  hint: {
    fontSize: typography.label,
    lineHeight: 21,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionLabel: {
    fontSize: typography.label,
    fontWeight: '700',
  },
});
