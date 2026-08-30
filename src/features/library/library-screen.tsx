import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { radius, spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';
import {
  activeFilterCount,
  difficultyLabels,
  emptyLibraryFilters,
  filterLibraryExercises,
  intentLabels,
  libraryFilterOptions,
  libraryViewOptions,
  primaryIntent,
  primaryRegion,
  regionLabels,
  type LibraryExercise,
  type LibraryFilters,
  type LibraryView,
} from '@/features/library/library';
import { useLibrary } from '@/features/library/library-context';
import { LibraryFilterSheet } from '@/features/library/library-filter-sheet';

type MovementCardProps = {
  readonly item: LibraryExercise;
  readonly onPress: () => void;
};

function MovementCard({ item, onPress }: MovementCardProps) {
  const { colors } = useRestoreTheme();
  return (
    <Pressable
      accessibilityHint="Opens movement instructions and preferences."
      accessibilityLabel={`${item.copy.name}. ${item.copy.summary}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.cardHeading}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          {item.copy.name}
        </Text>
        <View style={styles.cardBadges}>
          {item.preference.favorite ? (
            <Badge label="Favorite" tone="accent" />
          ) : null}
          {item.preference.avoidState !== 'none' ? (
            <Badge label="Avoided" tone="danger" />
          ) : null}
        </View>
      </View>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        {item.copy.summary}
      </Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>
        {regionLabels[primaryRegion(item.exercise)] ??
          primaryRegion(item.exercise)}{' '}
        · {intentLabels[primaryIntent(item.exercise)]} ·{' '}
        {difficultyLabels[item.exercise.intensity]}
      </Text>
    </Pressable>
  );
}

export function LibraryScreen() {
  const { colors } = useRestoreTheme();
  const router = useRouter();
  const library = useLibrary();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<LibraryView>('all');
  const [filters, setFilters] = useState<LibraryFilters>(emptyLibraryFilters);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const exercises = useMemo(
    () => (library.status === 'ready' ? library.exercises : []),
    [library.exercises, library.status],
  );
  const filterOptions = useMemo(
    () => libraryFilterOptions(exercises),
    [exercises],
  );
  const visibleExercises = useMemo(
    () => filterLibraryExercises(exercises, search, view, filters),
    [exercises, filters, search, view],
  );
  const filterCount = activeFilterCount(filters);
  const resetBrowse = () => {
    setSearch('');
    setView('all');
    setFilters(emptyLibraryFilters);
  };

  return (
    <>
      <Screen testID="library-screen">
        <View style={styles.heading}>
          <Badge label="Library" tone="accent" />
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.text }]}
          >
            Find your movement
          </Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            Browse by body area, goal, equipment, or difficulty.
          </Text>
        </View>

        <View
          style={[
            styles.reviewNotice,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.reviewTitle, { color: colors.text }]}>
            Draft movement guidance
          </Text>
          <Text style={[styles.reviewText, { color: colors.textMuted }]}>
            Available for product review; clinical review is still pending.
          </Text>
        </View>

        <TextInput
          accessibilityLabel="Search movements"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          onChangeText={setSearch}
          placeholder="Search movements"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          style={[
            styles.search,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          value={search}
        />

        <SegmentedControl
          label="Library view"
          onChange={setView}
          options={libraryViewOptions}
          value={view}
        />

        <View style={styles.resultsHeader}>
          <Text style={[styles.resultCount, { color: colors.text }]}>
            {library.status === 'ready'
              ? `${visibleExercises.length} ${visibleExercises.length === 1 ? 'movement' : 'movements'}`
              : 'Movements'}
          </Text>
          <Button
            containerStyle={styles.filterButton}
            label={filterCount === 0 ? 'Filters' : `Filters · ${filterCount}`}
            onPress={() => setFiltersVisible(true)}
            variant="secondary"
          />
        </View>

        {library.status === 'loading' ? (
          <Text
            accessibilityRole="alert"
            style={[styles.body, { color: colors.textMuted }]}
          >
            Loading movements…
          </Text>
        ) : null}

        {library.status === 'error' ? (
          <ErrorState
            description="Your saved preferences are still on this iPhone."
            onRetry={() => void library.reload()}
            title="The library could not be loaded"
          />
        ) : null}

        {library.status === 'ready' && visibleExercises.length === 0 ? (
          <EmptyState
            actionLabel="Show all movements"
            description="Try a different search, view, or filter."
            onAction={resetBrowse}
            title="No movements match"
          />
        ) : null}

        {visibleExercises.map((item) => (
          <MovementCard
            item={item}
            key={`${item.exercise.id}@${item.exercise.version}`}
            onPress={() =>
              router.push({
                pathname: '/exercise/[exerciseId]',
                params: { exerciseId: item.exercise.id },
              })
            }
          />
        ))}
      </Screen>

      <LibraryFilterSheet
        filters={filters}
        onChange={setFilters}
        onClose={() => setFiltersVisible(false)}
        options={filterOptions}
        visible={filtersVisible}
      />
    </>
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
  reviewText: {
    fontSize: typography.caption,
    lineHeight: 19,
  },
  search: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: typography.body,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  resultsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  resultCount: {
    flex: 1,
    fontSize: typography.title,
    fontWeight: '700',
  },
  filterButton: {
    minWidth: 112,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    minHeight: 48,
    padding: spacing.lg,
  },
  cardHeading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  cardBadges: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  cardTitle: {
    flex: 1,
    fontSize: typography.title,
    fontWeight: '700',
  },
  meta: {
    fontSize: typography.caption,
    fontWeight: '600',
    lineHeight: 19,
  },
});
