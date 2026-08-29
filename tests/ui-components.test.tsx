import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AppErrorBoundary } from '@/components/app-error-boundary';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { SegmentedControl } from '@/components/segmented-control';
import { Sheet } from '@/components/sheet';
import { Slider } from '@/components/slider';

jest.mock('@/services/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

function BrokenContent(): never {
  throw new Error('Expected test error');
}

describe('UI component foundation', () => {
  it('exposes button state and blocks disabled actions', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <Button disabled label="Save routine" onPress={onPress} />,
    );
    const button = screen.getByRole('button', { name: 'Save routine' });

    expect(button.props.accessibilityState).toEqual({ disabled: true });
    expect(button).toHaveStyle({ minHeight: 48 });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('provides a textual badge label independent of color', async () => {
    const screen = await render(<Badge label="Blocked" tone="danger" />);

    screen.getByRole('text', { name: 'Blocked' });
    screen.getByText('Blocked');
  });

  it('keeps controls inside cards independently accessible', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <Card>
        <Button label="Open details" onPress={onPress} />
      </Card>,
    );

    expect(screen.queryByRole('summary')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Open details' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('reports and changes segmented-control selection', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <SegmentedControl
        label="Session length"
        onChange={onChange}
        options={[
          { label: 'Quick', value: 'quick' },
          { label: 'Normal', value: 'normal' },
        ]}
        value="quick"
      />,
    );

    expect(
      screen.getByRole('radio', { name: 'Quick' }).props.accessibilityState,
    ).toEqual({ disabled: false, selected: true });
    await fireEvent.press(screen.getByRole('radio', { name: 'Normal' }));
    expect(onChange).toHaveBeenCalledWith('normal');
  });

  it('supports VoiceOver increment and decrement actions on sliders', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <Slider label="Readiness" onChange={onChange} value={3} />,
    );
    const slider = screen.getByRole('adjustable', { name: 'Readiness' });

    expect(slider).toHaveAccessibilityValue({
      min: 0,
      max: 10,
      now: 3,
      text: '3',
    });
    expect(slider).toHaveStyle({ minHeight: 48 });
    await fireEvent(slider, 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
    await fireEvent(slider, 'accessibilityAction', {
      nativeEvent: { actionName: 'decrement' },
    });

    expect(onChange).toHaveBeenNthCalledWith(1, 4);
    expect(onChange).toHaveBeenNthCalledWith(2, 2);
  });

  it('keeps slider accessibility actions inside their bounds', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <Slider label="Discomfort" onChange={onChange} value={10} />,
    );
    const slider = screen.getByRole('adjustable', { name: 'Discomfort' });

    await fireEvent(slider, 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
    expect(onChange).not.toHaveBeenCalled();

    await fireEvent(slider, 'accessibilityAction', {
      nativeEvent: { actionName: 'decrement' },
    });
    expect(onChange).toHaveBeenCalledWith(9);
  });

  it('provides a visible close action for modal sheets', async () => {
    const onClose = jest.fn();
    const screen = await render(
      <Sheet onRequestClose={onClose} title="Choose equipment" visible>
        <Text>Equipment choices</Text>
      </Sheet>,
    );

    screen.getByRole('header', { name: 'Choose equipment' });
    screen.getByText('Equipment choices');
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps empty states understandable without icons or color', async () => {
    const onAction = jest.fn();
    const empty = await render(
      <EmptyState
        actionLabel="Create routine"
        description="Saved routines will appear here."
        onAction={onAction}
        title="No saved routines"
      />,
    );

    empty.getByRole('header', { name: 'No saved routines' });
    empty.getByText('Saved routines will appear here.');
    await fireEvent.press(
      empty.getByRole('button', { name: 'Create routine' }),
    );
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('keeps error states understandable without icons or color', async () => {
    const onRetry = jest.fn();
    const error = await render(
      <ErrorState
        description="Your information was not changed."
        onRetry={onRetry}
        title="Could not save"
      />,
    );

    error.getByRole('alert', { name: 'Could not save' });
    error.getByText('Your information was not changed.');
    await fireEvent.press(error.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps the application error retry separate from its alert', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    try {
      const screen = await render(
        <AppErrorBoundary>
          <BrokenContent />
        </AppErrorBoundary>,
      );

      screen.getByRole('alert', { name: 'Restore paused' });
      screen.getByRole('button', { name: 'Try again' });
    } finally {
      consoleError.mockRestore();
    }
  });
});
