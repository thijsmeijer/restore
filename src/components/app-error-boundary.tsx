import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { Appearance, StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/error-state';
import { colorTokens, spacing } from '@/design-system/tokens';
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ErrorState
          description="Restore could not continue. Try again, or reopen the app if the problem continues."
          onRetry={this.retry}
          title="Something went wrong"
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
});
