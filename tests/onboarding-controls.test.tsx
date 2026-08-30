import { fireEvent, render } from '@testing-library/react-native';

import { BodyBaselineSelector } from '@/features/onboarding/body-baseline-selector';
import {
  insertionSlotForMove,
  moveGoalToIndex,
} from '@/features/onboarding/draggable-goal-list';
import { adjustDurations } from '@/features/onboarding/duration-selector';

describe('onboarding controls', () => {
  it('moves a dragged goal directly to its target priority', () => {
    expect(
      moveGoalToIndex(
        ['move_better', 'reduce_stiffness', 'wind_down'],
        'wind_down',
        0,
      ),
    ).toEqual(['wind_down', 'move_better', 'reduce_stiffness']);
    expect(insertionSlotForMove(2, 0)).toBe(0);
    expect(insertionSlotForMove(0, 2)).toBe(3);
    expect(insertionSlotForMove(1, 1)).toBe(1);
  });

  it('keeps chosen routine lengths in a valid ascending order', () => {
    expect(
      adjustDurations({ quick: 5, normal: 15, deep: 30 }, 'normal', 2),
    ).toEqual({ quick: 2, normal: 2, deep: 30 });
    expect(
      adjustDurations({ quick: 15, normal: 30, deep: 60 }, 'deep', 20),
    ).toEqual({ quick: 15, normal: 20, deep: 20 });
  });

  it('switches compact front and back views and asks for a side when needed', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <BodyBaselineSelector onChange={onChange} value={[]} />,
    );

    screen.getByRole('checkbox', { name: 'Front shoulder' });
    expect(
      screen.queryByRole('checkbox', { name: 'Rear shoulder' }),
    ).toBeNull();
    await fireEvent.press(screen.getByRole('radio', { name: 'Back' }));
    screen.getByRole('checkbox', { name: 'Rear shoulder' });

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Wrist' }));
    screen.getByRole('header', { name: 'Wrist: choose a side' });
    await fireEvent.press(screen.getByRole('radio', { name: 'Left' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add area' }));

    expect(onChange).toHaveBeenCalledWith([
      { regionSlug: 'wrist', side: 'left' },
    ]);
  });
});
