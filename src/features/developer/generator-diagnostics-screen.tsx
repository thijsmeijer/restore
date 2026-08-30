import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { radius, spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';
import { runBundledGenerationScenarios } from '@/developer/generator-scenarios';
import {
  formatGenerationTrace,
  serializeGenerationTrace,
} from '@/generator/trace';
import {
  nativeTextShareService,
  type TextShareService,
} from '@/services/text-share';

type GeneratorDiagnosticsScreenProps = {
  onBack: () => void;
  shareService?: TextShareService;
};

export function GeneratorDiagnosticsScreen({
  onBack,
  shareService = nativeTextShareService,
}: GeneratorDiagnosticsScreenProps) {
  const { colors } = useRestoreTheme();
  const [report, setReport] = useState(runBundledGenerationScenarios);
  const [runStatus, setRunStatus] = useState('');
  const [shareStatus, setShareStatus] = useState('');
  const firstTrace =
    report.results.find((result) => result.trace)?.trace ?? null;
  const readableTrace = useMemo(
    () =>
      firstTrace ? formatGenerationTrace(firstTrace) : 'No trace available.',
    [firstTrace],
  );
  const suitePassed = report.valid;

  const shareTrace = async (): Promise<void> => {
    if (!firstTrace) return;
    try {
      await shareService.share(
        'Restore generator trace',
        serializeGenerationTrace(firstTrace),
      );
      setShareStatus('Trace sharing opened.');
    } catch {
      setShareStatus('The trace could not be shared.');
    }
  };

  return (
    <Screen testID="generator-diagnostics-screen">
      <Button
        accessibilityHint="Returns to Settings."
        label="Back to settings"
        onPress={onBack}
        variant="secondary"
      />
      <View style={styles.heading}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          Generator diagnostics
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Runs deterministic synthetic inputs only. Exported traces omit owner
          identifiers, notes, body observations, training details, equipment
          values, and timestamps.
        </Text>
      </View>

      <Card>
        <Text
          accessibilityRole="header"
          style={[styles.cardTitle, { color: colors.text }]}
        >
          {suitePassed
            ? 'Scenario suite passed'
            : 'Scenario suite needs attention'}
        </Text>
        <Text style={[styles.metric, { color: colors.text }]}>
          {report.passed} of {report.total} scenarios passed
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Coverage: {report.coverage.duration_case_count} durations,{' '}
          {report.coverage.mode_case_count} modes,{' '}
          {report.coverage.target_case_count} target configurations,{' '}
          {report.coverage.equipment_context_count} equipment contexts, and{' '}
          {report.coverage.safety_state_count} safety states.
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          The bundled content is still in review. A passing result currently
          means every synthetic case stopped at the expected safe boundary.
        </Text>
        <Button
          accessibilityHint="Runs the local synthetic generator scenarios again."
          label="Run scenarios again"
          onPress={() => {
            const nextReport = runBundledGenerationScenarios();
            setReport(nextReport);
            setRunStatus(
              `Rerun complete: ${nextReport.passed} of ${nextReport.total} scenarios passed.`,
            );
            setShareStatus('');
          }}
          variant="secondary"
        />
        {runStatus ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.status, { color: colors.textMuted }]}
          >
            {runStatus}
          </Text>
        ) : null}
      </Card>

      <Card>
        <Text
          accessibilityRole="header"
          style={[styles.cardTitle, { color: colors.text }]}
        >
          Redacted decision trace
        </Text>
        <Text
          selectable
          testID="generator-trace-output"
          style={[
            styles.trace,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
        >
          {readableTrace}
        </Text>
        <Button
          accessibilityHint="Opens the system share sheet with redacted JSON."
          disabled={!firstTrace}
          label="Share redacted trace"
          onPress={() => void shareTrace()}
          variant="secondary"
        />
        {shareStatus ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.status, { color: colors.textMuted }]}
          >
            {shareStatus}
          </Text>
        ) : null}
      </Card>
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
  metric: {
    fontSize: typography.body,
    fontWeight: '700',
  },
  body: {
    fontSize: typography.body,
    lineHeight: 25,
  },
  trace: {
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    fontFamily: 'Courier',
    fontSize: typography.caption,
    lineHeight: 19,
    padding: spacing.md,
  },
  status: {
    fontSize: typography.caption,
    lineHeight: 19,
    textAlign: 'center',
  },
});
