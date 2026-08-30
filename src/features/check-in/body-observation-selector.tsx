import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { OptionChip } from '@/components/option-chip';
import {
  SegmentedControl,
  type SegmentOption,
} from '@/components/segmented-control';
import { Sheet } from '@/components/sheet';
import { radius, spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';
import {
  AccessibleBodyMap,
  type BodyMapTarget,
  type BodyMapView,
} from '@/features/check-in/accessible-body-map';
import type { CheckInRegionInput } from '@/features/check-in/check-in';
import {
  bodyRegionOptions,
  selectableBodyRegionOptions,
  type BodyRegionSlug,
  type BodySide,
} from '@/features/onboarding/profile-options';

const bodyViewOptions: readonly SegmentOption<BodyMapView>[] = [
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
  readonly compact?: boolean;
};

function sideLabel(side: BodySide): string {
  return {
    central: 'Center',
    left: 'Left',
    right: 'Right',
    bilateral: 'Both sides',
  }[side];
}

function focusSelection(
  regionSlug: BodyRegionSlug,
  side: BodySide,
): CheckInRegionInput {
  return {
    regionSlug,
    side,
    stiffness: null,
    soreness: null,
    discomfort: null,
  };
}

function toggledMapSide(
  current: BodySide | undefined,
  tapped: BodyMapTarget['side'],
): BodySide | null {
  if (tapped === 'central') return current === 'central' ? null : 'central';
  if (current === undefined || current === 'central') return tapped;
  if (current === tapped) return null;
  if (current === 'bilateral') return tapped === 'left' ? 'right' : 'left';
  return 'bilateral';
}

export function BodyObservationSelector({
  value,
  onChange,
  baselineRegionSlugs = [],
  compact = false,
}: BodyObservationSelectorProps) {
  const { colors } = useRestoreTheme();
  const [visible, setVisible] = useState(false);
  const [bodyView, setBodyView] = useState<BodyMapView>('front');
  const [useRegionList, setUseRegionList] = useState(false);
  const [candidateTarget, setCandidateTarget] = useState<BodyMapTarget | null>(
    null,
  );
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
  const visibleRegions = [...availableRegions]
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
    setCandidateTarget(null);
    setEditingSlug(null);
  };

  const replaceRegion = (selection: CheckInRegionInput | null) => {
    const slug = selection?.regionSlug ?? editingSlug;
    if (slug === null) return;
    const remaining = value.filter((entry) => entry.regionSlug !== slug);
    onChange(selection === null ? remaining : [...remaining, selection]);
  };

  const toggleMappedRegion = (
    slug: BodyRegionSlug,
    tappedSide: BodyMapTarget['side'],
  ) => {
    const current = value.find((entry) => entry.regionSlug === slug);
    const nextSide = toggledMapSide(current?.side, tappedSide);
    const remaining = value.filter((entry) => entry.regionSlug !== slug);
    onChange(
      nextSide === null
        ? remaining
        : [...remaining, focusSelection(slug, nextSide)],
    );
    setCandidateTarget(null);
  };

  const chooseMapTarget = (target: BodyMapTarget) => {
    const [slug] = target.regionSlugs;
    if (target.regionSlugs.length === 1 && slug !== undefined) {
      toggleMappedRegion(slug, target.side);
      return;
    }
    setCandidateTarget(target);
  };

  const editRegion = (slug: BodyRegionSlug) => {
    const region = bodyRegionOptions.find((option) => option.slug === slug);
    if (region === undefined) return;
    const existing = value.find((entry) => entry.regionSlug === slug);
    setDraftSide(
      existing?.side ??
        (region.laterality === 'central' ? 'central' : 'bilateral'),
    );
    setCandidateTarget(null);
    setEditingSlug(slug);
  };

  const chooseListedRegion = (slug: BodyRegionSlug) => {
    const region = bodyRegionOptions.find((option) => option.slug === slug);
    if (region === undefined) return;
    if (region.laterality === 'central') {
      const selected = value.some((entry) => entry.regionSlug === slug);
      const remaining = value.filter((entry) => entry.regionSlug !== slug);
      onChange(
        selected ? remaining : [...remaining, focusSelection(slug, 'central')],
      );
      return;
    }
    editRegion(slug);
  };

  const applySide = () => {
    if (editingSlug === null) return;
    replaceRegion(focusSelection(editingSlug, draftSide));
    setEditingSlug(null);
  };

  const removeEditingRegion = () => {
    replaceRegion(null);
    setEditingSlug(null);
  };

  return (
    <>
      <View style={styles.summaryRow}>
        {!compact ? (
          <Text style={[styles.helper, { color: colors.textMuted }]}>
            Choose the areas you want today&apos;s routine to focus on.
          </Text>
        ) : null}
        <Badge
          accessibilityLabel={
            compact && value.length === 0
              ? 'No body focus areas'
              : `${value.length} body focus areas selected`
          }
          label={
            compact
              ? value.length === 0
                ? 'No focus area'
                : `${value.length} ${value.length === 1 ? 'focus area' : 'focus areas'}`
              : `${value.length} selected`
          }
          tone={value.length > 0 ? 'accent' : 'neutral'}
        />
      </View>

      {value.length > 0 && !compact ? (
        <View style={styles.selectedList}>
          {value.map((selection) => {
            const region = bodyRegionOptions.find(
              (option) => option.slug === selection.regionSlug,
            );
            return (
              <Pressable
                accessibilityHint="Adjusts the side or removes this focus area."
                accessibilityLabel={`${region?.label ?? selection.regionSlug}, ${sideLabel(selection.side)}`}
                accessibilityRole="button"
                key={`${selection.regionSlug}:${selection.side}`}
                onPress={() => {
                  editRegion(selection.regionSlug);
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
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Button
        label={value.length === 0 ? 'Choose focus areas' : 'Review focus areas'}
        onPress={() => setVisible(true)}
        variant="secondary"
      />

      <Sheet
        closeLabel="Done"
        onRequestClose={close}
        title={
          editingRegion
            ? editingRegion.label
            : candidateTarget
              ? `Choose ${candidateTarget.label.toLowerCase()}`
              : 'Choose focus areas'
        }
        visible={visible}
      >
        {editingRegion ? (
          <>
            {editingRegion.laterality === 'central' ? (
              <Text style={[styles.helper, { color: colors.textMuted }]}>
                This area is selected at the center.
              </Text>
            ) : (
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
            )}
            <Button
              label={editingSelection ? 'Update area' : 'Add area'}
              onPress={applySide}
            />
            {editingSelection ? (
              <Button
                label="Remove area"
                onPress={removeEditingRegion}
                variant="destructive"
              />
            ) : null}
            <Button
              label="Back to body map"
              onPress={() => setEditingSlug(null)}
              variant="secondary"
            />
          </>
        ) : candidateTarget ? (
          <>
            <Text style={[styles.helper, { color: colors.textMuted }]}>
              Choose the closest match. It will be selected immediately.
            </Text>
            <View style={styles.regionGrid}>
              {candidateTarget.regionSlugs.map((slug) => {
                const region = bodyRegionOptions.find(
                  (option) => option.slug === slug,
                );
                if (region === undefined) return null;
                return (
                  <OptionChip
                    accessibilityHint={
                      value.some((entry) => entry.regionSlug === region.slug)
                        ? 'Toggles this focus area for the selected side.'
                        : 'Selects this focus area for the selected side.'
                    }
                    key={region.slug}
                    label={region.label}
                    onPress={() =>
                      toggleMappedRegion(region.slug, candidateTarget.side)
                    }
                    selected={value.some(
                      (entry) => entry.regionSlug === region.slug,
                    )}
                  />
                );
              })}
            </View>
            <Button
              label="Back to body map"
              onPress={() => setCandidateTarget(null)}
              variant="secondary"
            />
          </>
        ) : (
          <>
            <SegmentedControl
              label="Body view"
              onChange={setBodyView}
              options={bodyViewOptions}
              value={bodyView}
            />

            {useRegionList ? (
              <>
                <View style={styles.regionGrid}>
                  {visibleRegions.map((region) => (
                    <OptionChip
                      accessibilityHint={
                        value.some((entry) => entry.regionSlug === region.slug)
                          ? 'Adjusts or removes this focus area.'
                          : region.laterality === 'central'
                            ? 'Selects this focus area.'
                            : 'Opens side selection for this focus area.'
                      }
                      key={region.slug}
                      label={region.label}
                      onPress={() => chooseListedRegion(region.slug)}
                      selected={value.some(
                        (entry) => entry.regionSlug === region.slug,
                      )}
                    />
                  ))}
                </View>
                <Button
                  label="Use body map"
                  onPress={() => setUseRegionList(false)}
                  variant="secondary"
                />
              </>
            ) : (
              <>
                <AccessibleBodyMap
                  onPressTarget={chooseMapTarget}
                  selections={value}
                  view={bodyView}
                />
                <Button
                  accessibilityHint="Shows every available body area as a text list."
                  label="Choose from list"
                  onPress={() => setUseRegionList(true)}
                  variant="secondary"
                />
              </>
            )}
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
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  areaTitle: {
    fontSize: typography.body,
    fontWeight: '700',
  },
  regionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
