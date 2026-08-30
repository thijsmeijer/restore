import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { NumericStepper } from '@/components/numeric-stepper';
import { OptionChip } from '@/components/option-chip';
import {
  SegmentedControl,
  type SegmentOption,
} from '@/components/segmented-control';
import { Sheet } from '@/components/sheet';
import { radius, spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';
import type { CheckInRegionInput } from '@/features/check-in/check-in';
import {
  bodyRegionOptions,
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

type BodyObservationSelectorProps = {
  readonly value: readonly CheckInRegionInput[];
  readonly onChange: (value: readonly CheckInRegionInput[]) => void;
  readonly baselineRegionSlugs?: readonly BodyRegionSlug[];
};

function sideLabel(side: BodySide): string {
  return {
    central: 'Center',
    left: 'Left',
    right: 'Right',
    bilateral: 'Both sides',
  }[side];
}

function ratingsLabel(region: CheckInRegionInput): string {
  return [
    region.stiffness === null ? null : `Stiffness ${region.stiffness}`,
    region.soreness === null ? null : `Soreness ${region.soreness}`,
    region.discomfort === null ? null : `Discomfort ${region.discomfort}`,
  ]
    .filter((entry) => entry !== null)
    .join(' · ');
}

export function BodyObservationSelector({
  value,
  onChange,
  baselineRegionSlugs = [],
}: BodyObservationSelectorProps) {
  const { colors } = useRestoreTheme();
  const [visible, setVisible] = useState(false);
  const [bodyView, setBodyView] = useState<BodyView>('front');
  const [editingSlug, setEditingSlug] = useState<BodyRegionSlug | null>(null);
  const [draft, setDraft] = useState<CheckInRegionInput | null>(null);
  const editingRegion = bodyRegionOptions.find(
    (option) => option.slug === editingSlug,
  );
  const visibleRegions = [...bodyRegionOptions]
    .filter(
      (option) =>
        option.surface === bodyView ||
        option.surface === 'both' ||
        option.surface === 'detail',
    )
    .sort((left, right) => {
      const leftBaseline = baselineRegionSlugs.includes(left.slug) ? 0 : 1;
      const rightBaseline = baselineRegionSlugs.includes(right.slug) ? 0 : 1;
      return leftBaseline - rightBaseline;
    });

  const close = () => {
    setVisible(false);
    setEditingSlug(null);
    setDraft(null);
  };

  const chooseRegion = (slug: BodyRegionSlug) => {
    const region = bodyRegionOptions.find((option) => option.slug === slug);
    if (region === undefined) return;
    const existing = value.find((entry) => entry.regionSlug === slug);
    setEditingSlug(slug);
    setDraft(
      existing ?? {
        regionSlug: slug,
        side: region.laterality === 'central' ? 'central' : 'bilateral',
        stiffness: null,
        soreness: null,
        discomfort: null,
      },
    );
  };

  const saveDraft = () => {
    if (draft === null) return;
    const withoutCurrent = value.filter(
      (entry) => entry.regionSlug !== draft.regionSlug,
    );
    onChange([...withoutCurrent, draft]);
    close();
  };

  const removeDraft = () => {
    if (draft !== null) {
      onChange(value.filter((entry) => entry.regionSlug !== draft.regionSlug));
    }
    close();
  };

  const hasObservation =
    draft !== null &&
    [draft.stiffness, draft.soreness, draft.discomfort].some(
      (rating) => rating !== null,
    );

  return (
    <>
      <View style={styles.summaryRow}>
        <Text style={[styles.helper, { color: colors.textMuted }]}>
          Add only the areas you want to rate today. Each rating is optional.
        </Text>
        <Badge
          accessibilityLabel={`${value.length} body areas rated`}
          label={`${value.length} rated`}
          tone={value.length > 0 ? 'accent' : 'neutral'}
        />
      </View>

      {value.length > 0 ? (
        <View style={styles.selectedList}>
          {value.map((selection) => {
            const region = bodyRegionOptions.find(
              (option) => option.slug === selection.regionSlug,
            );
            return (
              <Pressable
                accessibilityHint="Opens this area's ratings for editing."
                accessibilityLabel={`${region?.label ?? selection.regionSlug}, ${sideLabel(selection.side)}, ${ratingsLabel(selection)}`}
                accessibilityRole="button"
                key={`${selection.regionSlug}:${selection.side}`}
                onPress={() => {
                  chooseRegion(selection.regionSlug);
                  setVisible(true);
                }}
                style={({ pressed }) => [
                  styles.selectedArea,
                  {
                    backgroundColor: colors.accentMuted,
                    borderColor: colors.accent,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={[styles.areaTitle, { color: colors.text }]}>
                  {region?.label ?? selection.regionSlug} ·{' '}
                  {sideLabel(selection.side)}
                </Text>
                <Text style={[styles.areaRatings, { color: colors.textMuted }]}>
                  {ratingsLabel(selection)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Button
        label={value.length === 0 ? 'Add a body area' : 'Add another area'}
        onPress={() => setVisible(true)}
        variant="secondary"
      />

      <Sheet
        closeLabel="Cancel"
        onRequestClose={close}
        title={
          editingRegion ? `Rate ${editingRegion.label}` : 'Choose a body area'
        }
        visible={visible}
      >
        {editingRegion === undefined || draft === null ? (
          <>
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
                  <OptionChip
                    accessibilityHint={
                      selected
                        ? 'Opens the saved ratings for this area.'
                        : 'Opens side and rating choices for this area.'
                    }
                    key={region.slug}
                    label={region.label}
                    onPress={() => chooseRegion(region.slug)}
                    selected={selected}
                  />
                );
              })}
            </View>
          </>
        ) : (
          <>
            {editingRegion.laterality !== 'central' ? (
              <SegmentedControl
                label="Side"
                onChange={(side) => setDraft({ ...draft, side })}
                options={
                  editingRegion.laterality === 'hybrid'
                    ? hybridSideOptions
                    : pairedSideOptions
                }
                value={draft.side}
              />
            ) : null}
            <Text style={[styles.helper, { color: colors.textMuted }]}>
              Use 0 when you checked an area and noticed none. Leave a rating
              unset when you did not assess it.
            </Text>
            <NumericStepper
              label="Stiffness"
              maximum={10}
              minimum={0}
              onChange={(stiffness) => setDraft({ ...draft, stiffness })}
              value={draft.stiffness}
              valueSuffix=" of 10"
            />
            <NumericStepper
              label="Soreness"
              maximum={10}
              minimum={0}
              onChange={(soreness) => setDraft({ ...draft, soreness })}
              value={draft.soreness}
              valueSuffix=" of 10"
            />
            <NumericStepper
              label="Discomfort"
              maximum={10}
              minimum={0}
              onChange={(discomfort) => setDraft({ ...draft, discomfort })}
              value={draft.discomfort}
              valueSuffix=" of 10"
            />
            <Button
              disabled={!hasObservation}
              label={
                value.some((entry) => entry.regionSlug === draft.regionSlug)
                  ? 'Update area'
                  : 'Add area'
              }
              onPress={saveDraft}
            />
            {value.some((entry) => entry.regionSlug === draft.regionSlug) ? (
              <Button
                label="Remove area"
                onPress={removeDraft}
                variant="destructive"
              />
            ) : null}
            <Button
              label="Choose a different area"
              onPress={() => {
                setEditingSlug(null);
                setDraft(null);
              }}
              variant="secondary"
            />
          </>
        )}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  helper: {
    fontSize: typography.body,
    lineHeight: 25,
  },
  selectedList: {
    gap: spacing.sm,
  },
  selectedArea: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    minHeight: 64,
    padding: spacing.md,
  },
  areaTitle: {
    fontSize: typography.body,
    fontWeight: '700',
  },
  areaRatings: {
    fontSize: typography.caption,
    lineHeight: 19,
  },
  regionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
