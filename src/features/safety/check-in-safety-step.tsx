import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { OptionChip } from '@/components/option-chip';
import { Sheet } from '@/components/sheet';
import { spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';
import {
  checkInSafetySignalDefinitions,
  type CheckInSafetyInput,
  type CheckInSafetySignal,
} from '@/features/safety/check-in-safety';

type CheckInSafetyStepProps = {
  readonly value: CheckInSafetyInput | null;
  readonly onChange: (value: CheckInSafetyInput) => void;
};

function toggleSignal(
  signals: readonly CheckInSafetySignal[],
  signal: CheckInSafetySignal,
): CheckInSafetySignal[] {
  return signals.includes(signal)
    ? signals.filter((entry) => entry !== signal)
    : [...signals, signal];
}

export function CheckInSafetyStep({ value, onChange }: CheckInSafetyStepProps) {
  const { colors } = useRestoreTheme();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [draftSignals, setDraftSignals] = useState<
    readonly CheckInSafetySignal[]
  >([]);
  const reportedCount = value?.reportedSignals.length ?? 0;

  const openReview = () => {
    setDraftSignals(value?.reportedSignals ?? []);
    setSheetVisible(true);
  };

  const applyReview = () => {
    onChange({ reportedSignals: draftSignals });
    setSheetVisible(false);
  };

  return (
    <>
      <Card compact>
        <Text style={[styles.title, { color: colors.text }]}>Stop signs</Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Before Restore builds a routine, confirm whether anything in the stop
          list applies right now.
        </Text>
        <OptionChip
          accessibilityHint="Confirms that none of Restore's listed stop signs apply."
          label="None apply"
          onPress={() => onChange({ reportedSignals: [] })}
          selected={value !== null && reportedCount === 0}
        />
        <Button
          accessibilityHint="Opens the complete structured stop-sign list."
          label="Review stop signs"
          onPress={openReview}
          variant="secondary"
        />
        {value !== null && reportedCount > 0 ? (
          <View style={styles.resultRow}>
            <Badge
              accessibilityLabel={`${reportedCount} stop ${reportedCount === 1 ? 'sign' : 'signs'} reported`}
              label={`${reportedCount} reported`}
              tone="danger"
            />
            <Text style={[styles.resultText, { color: colors.text }]}>
              Restore will pause before building a routine.
            </Text>
          </View>
        ) : null}
      </Card>

      <Sheet
        closeLabel="Cancel"
        onRequestClose={() => setSheetVisible(false)}
        title="Review stop signs"
        visible={sheetVisible}
      >
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Select everything that applies right now. Restore uses these answers
          only to decide whether self-guided movement should stop here.
        </Text>
        <View style={styles.options}>
          {checkInSafetySignalDefinitions.map((definition) => (
            <OptionChip
              key={definition.signal}
              label={definition.label}
              onPress={() =>
                setDraftSignals((current) =>
                  toggleSignal(current, definition.signal),
                )
              }
              selected={draftSignals.includes(definition.signal)}
            />
          ))}
        </View>
        <Button
          label={
            draftSignals.length === 0 ? 'Confirm none apply' : 'Use answers'
          }
          onPress={applyReview}
        />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: typography.title,
    fontWeight: '700',
  },
  body: {
    fontSize: typography.body,
    lineHeight: 25,
  },
  options: {
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  resultRow: {
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  resultText: {
    fontSize: typography.label,
    lineHeight: 22,
  },
});
