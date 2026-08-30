import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { OptionChip } from '@/components/option-chip';
import { Sheet } from '@/components/sheet';
import { spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';
import {
  difficultyLabels,
  emptyLibraryFilters,
  equipmentLabels,
  intentLabels,
  regionLabels,
  type LibraryDifficulty,
  type LibraryFilters,
  type LibraryIntent,
} from '@/features/library/library';

interface FilterOptions {
  readonly regions: readonly string[];
  readonly intents: readonly LibraryIntent[];
  readonly equipment: readonly string[];
  readonly difficulties: readonly LibraryDifficulty[];
}

type LibraryFilterSheetProps = {
  readonly visible: boolean;
  readonly filters: LibraryFilters;
  readonly options: FilterOptions;
  readonly onChange: (filters: LibraryFilters) => void;
  readonly onClose: () => void;
};

type FilterGroupProps<Value extends string> = {
  readonly title: string;
  readonly value: Value | null;
  readonly options: readonly Value[];
  readonly labelFor: (value: Value) => string;
  readonly onChange: (value: Value | null) => void;
};

function FilterGroup<Value extends string>({
  title,
  value,
  options,
  labelFor,
  onChange,
}: FilterGroupProps<Value>) {
  const { colors } = useRestoreTheme();

  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.chips}>
        <OptionChip
          label="Any"
          onPress={() => onChange(null)}
          role="radio"
          selected={value === null}
        />
        {options.map((option) => (
          <OptionChip
            key={option}
            label={labelFor(option)}
            onPress={() => onChange(option)}
            role="radio"
            selected={value === option}
          />
        ))}
      </View>
    </View>
  );
}

export function LibraryFilterSheet({
  visible,
  filters,
  options,
  onChange,
  onClose,
}: LibraryFilterSheetProps) {
  return (
    <Sheet
      closeLabel="Done"
      onRequestClose={onClose}
      title="Filter movements"
      visible={visible}
    >
      <FilterGroup
        labelFor={(value) => regionLabels[value] ?? value}
        onChange={(region) => onChange({ ...filters, region })}
        options={options.regions}
        title="Body area"
        value={filters.region}
      />
      <FilterGroup
        labelFor={(value) => intentLabels[value]}
        onChange={(intent) => onChange({ ...filters, intent })}
        options={options.intents}
        title="Intent"
        value={filters.intent}
      />
      <FilterGroup
        labelFor={(value) => equipmentLabels[value] ?? value}
        onChange={(equipment) => onChange({ ...filters, equipment })}
        options={options.equipment}
        title="Equipment"
        value={filters.equipment}
      />
      <FilterGroup
        labelFor={(value) => difficultyLabels[value]}
        onChange={(difficulty) => onChange({ ...filters, difficulty })}
        options={options.difficulties}
        title="Difficulty"
        value={filters.difficulty}
      />
      <Button
        label="Clear filters"
        onPress={() => onChange(emptyLibraryFilters)}
        variant="secondary"
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.sm,
  },
  groupTitle: {
    fontSize: typography.label,
    fontWeight: '700',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
