import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { Appearance, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { colorTokens, spacing, typography } from '@/design-system/tokens';
import { logger } from '@/services/logger';

type ErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<
  PropsWithChildren,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('ui_render_failed', {
      errorName: error.name,
      componentStackAvailable: Boolean(info.componentStack),
    });
  }

  private retry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const colors =
      Appearance.getColorScheme() === 'dark'
        ? colorTokens.dark
        : colorTokens.light;

    return (
      <View
        accessibilityRole="alert"
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <Text style={[styles.title, { color: colors.text }]}>
          Restore paused
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Something unexpected happened. Try again, or restart Restore if the
          problem continues.
        </Text>
        <Button label="Try again" onPress={this.retry} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
  },
  body: {
    fontSize: typography.body,
    lineHeight: 25,
  },
});
