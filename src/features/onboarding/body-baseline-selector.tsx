import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import {
  SegmentedControl,
  type SegmentOption,
} from '@/components/segmented-control';
import { Sheet } from '@/components/sheet';
import { radius, spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';
import type { BodyBaselineSelection } from '@/features/onboarding/profile';
import {
  bodyRegionOptions,
  selectableBodyRegionOptions,
  type BodyRegionSlug,
  type BodySide,
} from '@/features/onboarding/profile-options';

type BodyView = 'front' | 'back';

const bodyViewOptions: readonly SegmentOption<BodyView>[] = [
  { label: 'Front', value: 'front' },
  { label: 'Back', value: 'back' },
];

const pairedSideOptions: readonly SegmentOption<BodySide>[] = [
  { label: 'Left', value: 'left' },
  { label: 'Right', value: 'right' },
  { label: 'Both', value: 'bilateral' },
];

const hybridSideOptions: readonly SegmentOption<BodySide>[] = [
  { label: 'Center', value: 'central' },
  ...pairedSideOptions,
];

type BodyBaselineSelectorProps = {
  value: readonly BodyBaselineSelection[];
  onChange: (value: readonly BodyBaselineSelection[]) => void;
};

export function BodyBaselineSelector({
  value,
  onChange,
}: BodyBaselineSelectorProps) {
  const { colors } = useRestoreTheme();
  const [bodyView, setBodyView] = useState<BodyView>('front');
  const [editingSlug, setEditingSlug] = useState<BodyRegionSlug | null>(null);
  const [draftSide, setDraftSide] = useState<BodySide>('bilateral');
  const editingRegion = bodyRegionOptions.find(
    (option) => option.slug === editingSlug,
  );
  const editingSelection = value.find(
    (selection) => selection.regionSlug === editingSlug,
  );
  const availableRegions = bodyRegionOptions.filter(
    (option) =>
      selectableBodyRegionOptions.some(
        (selectable) => selectable.slug === option.slug,
      ) || value.some((selection) => selection.regionSlug === option.slug),
  );
  const visibleRegions = availableRegions.filter(
    (option) =>
      option.surface === bodyView ||
      option.surface === 'both' ||
      option.surface === 'detail',
  );

  const chooseRegion = (slug: BodyRegionSlug) => {
    const region = bodyRegionOptions.find((option) => option.slug === slug);
    if (region === undefined) return;
    const selected = value.find((entry) => entry.regionSlug === slug);

    if (region.laterality === 'central') {
      onChange(
        selected
          ? value.filter((entry) => entry.regionSlug !== slug)
          : [...value, { regionSlug: slug, side: 'central' }],
      );
      return;
    }

    setDraftSide(selected?.side ?? 'bilateral');
    setEditingSlug(slug);
  };

  const applySide = () => {
    if (editingSlug === null) return;
    const existingIndex = value.findIndex(
      (entry) => entry.regionSlug === editingSlug,
    );
    if (existingIndex === -1) {
      onChange([...value, { regionSlug: editingSlug, side: draftSide }]);
    } else {
      onChange(
        value.map((entry) =>
          entry.regionSlug === editingSlug
            ? { ...entry, side: draftSide }
            : entry,
        ),
      );
    }
    setEditingSlug(null);
  };

  const removeEditingRegion = () => {
    if (editingSlug !== null) {
      onChange(value.filter((entry) => entry.regionSlug !== editingSlug));
    }
    setEditingSlug(null);
  };

  return (
    <>
      <View style={styles.summary}>
        <Text style={[styles.helper, { color: colors.textMuted }]}>
          Choose any areas you regularly want Restore to consider. You can leave
          this blank.
        </Text>
        <Badge
          accessibilityLabel={`${value.length} body areas selected`}
          label={`${value.length} selected`}
          tone={value.length > 0 ? 'accent' : 'neutral'}
        />
      </View>

      <SegmentedControl
        label="Body view"
        onChange={setBodyView}
        options={bodyViewOptions}
        value={bodyView}
      />

      <View style={styles.regionGrid}>
        {visibleRegions.map((region) => {
          const selected = value.some(
            (entry) => entry.regionSlug === region.slug,
          );
          return (
            <Pressable
              accessibilityHint={
                selected && region.laterality !== 'central'
                  ? 'Opens side selection for this area.'
                  : selected
                    ? 'Removes this area.'
                    : region.laterality === 'central'
                      ? 'Adds this area.'
                      : 'Opens side selection before adding this area.'
              }
              accessibilityLabel={region.label}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              key={region.slug}
              onPress={() => chooseRegion(region.slug)}
              style={({ pressed }) => [
                styles.region,
                {
                  backgroundColor: selected
                    ? colors.accentMuted
                    : colors.surface,
                  borderColor: selected ? colors.accent : colors.border,
                  opacity: pressed ? 0.78 : 1,
                },
              ]}
            >
              <Text style={[styles.regionLabel, { color: colors.text }]}>
                {selected ? '✓ ' : ''}
                {region.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.note, { color: colors.textMuted }]}>
        Selecting an area describes your preference only; it is not a medical
        assessment.
      </Text>

      <Sheet
        closeLabel="Cancel"
        onRequestClose={() => setEditingSlug(null)}
        title={
          editingRegion
            ? `${editingRegion.label}: choose a side`
            : 'Choose a side'
        }
        visible={editingRegion !== undefined}
      >
        {editingRegion ? (
          <>
            <SegmentedControl
              label="Side"
              onChange={setDraftSide}
              options={
                editingRegion.laterality === 'hybrid'
                  ? hybridSideOptions
                  : pairedSideOptions
              }
              value={draftSide}
            />
            <Button
              label={editingSelection ? 'Update area' : 'Add area'}
              onPress={applySide}
            />
            {editingSelection ? (
              <Button
                label="Remove area"
                onPress={removeEditingRegion}
                variant="secondary"
              />
            ) : null}
          </>
        ) : null}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  summary: {
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  helper: {
    fontSize: typography.body,
    lineHeight: 25,
  },
  regionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  region: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 52,
    minWidth: '45%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  regionLabel: {
    fontSize: typography.label,
    fontWeight: '700',
    textAlign: 'center',
  },
  note: {
    fontSize: typography.caption,
    lineHeight: 19,
  },
});
