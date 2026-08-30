import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { ErrorState } from '@/components/error-state';
import { OptionChip } from '@/components/option-chip';
import { Screen } from '@/components/screen';
import { radius, spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';
import {
  difficultyLabels,
  equipmentLabels,
  exerciseEquipment,
  intentLabels,
  prescriptionLabel,
  primaryIntent,
  primaryRegion,
  regionLabels,
  type LibraryExercise,
} from '@/features/library/library';
import { useLibrary } from '@/features/library/library-context';

type DetailSectionProps = {
  readonly title: string;
  readonly children: React.ReactNode;
  readonly danger?: boolean;
};

function DetailSection({
  title,
  children,
  danger = false,
}: DetailSectionProps) {
  const { colors } = useRestoreTheme();
  return (
    <View
      style={[
        styles.section,
        {
          backgroundColor: danger ? colors.dangerSurface : colors.surface,
          borderColor: danger ? colors.danger : colors.border,
        },
      ]}
    >
      <Text
        accessibilityRole="header"
        style={[styles.sectionTitle, { color: colors.text }]}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function BulletList({ values }: { readonly values: readonly string[] }) {
  const { colors } = useRestoreTheme();
  return (
    <View style={styles.bulletList}>
      {values.map((value) => (
        <View key={value} style={styles.bulletRow}>
          <Text
            accessibilityElementsHidden
            style={[styles.bullet, { color: colors.accent }]}
          >
            •
          </Text>
          <Text
            style={[styles.body, styles.bulletText, { color: colors.text }]}
          >
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}

type DetailContentProps = {
  readonly item: LibraryExercise;
  readonly saving: boolean;
  readonly saveError: boolean;
  readonly onFavorite: (favorite: boolean) => void;
  readonly onAvoided: (avoided: boolean) => void;
  readonly onBack: () => void;
};

export function ExerciseDetailContent({
  item,
  saving,
  saveError,
  onFavorite,
  onAvoided,
  onBack,
}: DetailContentProps) {
  const { colors } = useRestoreTheme();
  const equipment = exerciseEquipment(item.exercise)
    .map((slug) => equipmentLabels[slug] ?? slug)
    .join(', ');
  const toggleFavorite = () => onFavorite(!item.preference.favorite);
  const toggleAvoid = () => onAvoided(item.preference.avoidState === 'none');

  return (
    <Screen testID="exercise-detail-screen">
      <Pressable
        accessibilityHint="Returns to the movement library."
        accessibilityLabel="Back to library"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [
          styles.backButton,
          { backgroundColor: pressed ? colors.surfaceMuted : 'transparent' },
        ]}
      >
        <Text style={[styles.backLabel, { color: colors.accent }]}>
          ‹ Library
        </Text>
      </Pressable>

      <View style={styles.heading}>
        <View style={styles.badges}>
          <Badge label="Draft" tone="accent" />
          <Badge label={difficultyLabels[item.exercise.intensity]} />
        </View>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          {item.copy.name}
        </Text>
        <Text style={[styles.lead, { color: colors.textMuted }]}>
          {item.copy.summary}
        </Text>
      </View>

      <View
        style={[
          styles.reviewNotice,
          { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.reviewTitle, { color: colors.text }]}>
          Clinical review pending
        </Text>
        <Text style={[styles.caption, { color: colors.textMuted }]}>
          Review this draft guidance before it is approved for daily-use builds.
        </Text>
      </View>

      <Card compact>
        <Text style={[styles.metaTitle, { color: colors.text }]}>
          At a glance
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          {regionLabels[primaryRegion(item.exercise)] ??
            primaryRegion(item.exercise)}{' '}
          · {intentLabels[primaryIntent(item.exercise)]}
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          {prescriptionLabel(item.exercise)} · {equipment}
        </Text>
      </Card>

      <View style={styles.preferenceBlock}>
        <Text
          accessibilityRole="header"
          style={[styles.sectionTitle, { color: colors.text }]}
        >
          Your preference
        </Text>
        <View style={styles.preferenceActions}>
          <OptionChip
            accessibilityHint="Favorites may rank higher after all safety and compatibility checks."
            label={item.preference.favorite ? 'Favorited' : 'Favorite'}
            onPress={toggleFavorite}
            selected={item.preference.favorite}
          />
          <OptionChip
            accessibilityHint="Avoided movements stay out of generated routines until restored."
            label={item.preference.avoidState !== 'none' ? 'Avoided' : 'Avoid'}
            onPress={toggleAvoid}
            selected={item.preference.avoidState !== 'none'}
          />
        </View>
        <Text style={[styles.caption, { color: colors.textMuted }]}>
          {item.preference.avoidState !== 'none'
            ? 'This movement will stay out of generated routines until you restore it.'
            : 'Favorites can be prioritized only after safety and compatibility checks.'}
        </Text>
        {saving ? (
          <Text
            accessibilityRole="alert"
            style={[styles.caption, { color: colors.textMuted }]}
          >
            Saving preference…
          </Text>
        ) : null}
        {saveError ? (
          <Text
            accessibilityRole="alert"
            style={[styles.caption, { color: colors.danger }]}
          >
            The preference could not be saved. Try again.
          </Text>
        ) : null}
      </View>

      <DetailSection title="Set up">
        <Text style={[styles.body, { color: colors.text }]}>
          {item.copy.setup}
        </Text>
      </DetailSection>
      <DetailSection title="Move">
        <Text style={[styles.body, { color: colors.text }]}>
          {item.copy.execution}
        </Text>
      </DetailSection>
      <DetailSection title="Breathe">
        <Text style={[styles.body, { color: colors.text }]}>
          {item.copy.breathing}
        </Text>
      </DetailSection>
      <DetailSection title="Common mistakes">
        <BulletList values={item.copy.commonErrors} />
      </DetailSection>
      <DetailSection danger title="When to stop">
        <BulletList values={item.copy.stopRules} />
      </DetailSection>
    </Screen>
  );
}

export function ExerciseDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ exerciseId?: string | string[] }>();
  const library = useLibrary();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const exerciseId =
    typeof params.exerciseId === 'string' ? params.exerciseId : null;
  const item =
    library.status === 'ready'
      ? (library.exercises.find(
          (candidate) => candidate.exercise.id === exerciseId,
        ) ?? null)
      : null;
  const onBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/library');
  };
  const savePreference = async (save: () => Promise<boolean>) => {
    if (item === null || saving) return;
    setSaving(true);
    setSaveError(false);
    const saved = await save();
    setSaving(false);
    setSaveError(!saved);
  };

  if (library.status === 'loading') {
    return (
      <Screen testID="exercise-detail-loading">
        <Text accessibilityRole="alert">Loading movement…</Text>
      </Screen>
    );
  }

  if (library.status === 'error') {
    return (
      <Screen testID="exercise-detail-error">
        <ErrorState
          description="Your saved information is still on this iPhone."
          onRetry={() => void library.reload()}
          title="The movement could not be loaded"
        />
      </Screen>
    );
  }

  if (item === null) {
    return (
      <Screen testID="exercise-detail-missing">
        <ErrorState
          description="Return to the library and choose an available movement."
          onRetry={onBack}
          retryLabel="Back to library"
          title="Movement not found"
        />
      </Screen>
    );
  }

  return (
    <ExerciseDetailContent
      item={item}
      onBack={onBack}
      onAvoided={(avoided) =>
        void savePreference(() => library.setAvoided(item.exercise.id, avoided))
      }
      onFavorite={(favorite) =>
        void savePreference(() =>
          library.setFavorite(item.exercise.id, favorite),
        )
      }
      saveError={saveError}
      saving={saving}
    />
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.sm,
  },
  backLabel: {
    fontSize: typography.body,
    fontWeight: '700',
  },
  heading: {
    gap: spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.display,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  lead: {
    fontSize: typography.body,
    lineHeight: 25,
  },
  reviewNotice: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    padding: spacing.md,
  },
  reviewTitle: {
    fontSize: typography.label,
    fontWeight: '700',
  },
  caption: {
    fontSize: typography.caption,
    lineHeight: 19,
  },
  metaTitle: {
    fontSize: typography.label,
    fontWeight: '700',
  },
  body: {
    fontSize: typography.body,
    lineHeight: 25,
  },
  preferenceBlock: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  preferenceActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  section: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.title,
    fontWeight: '700',
  },
  bulletList: {
    gap: spacing.sm,
  },
  bulletRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bullet: {
    fontSize: typography.body,
    lineHeight: 25,
  },
  bulletText: {
    flex: 1,
  },
});
