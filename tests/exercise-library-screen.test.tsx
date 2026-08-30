import { fireEvent, render } from '@testing-library/react-native';

import { bundledContentInstallation } from '@/content/bundled-catalog';
import { ExerciseDetailContent } from '@/features/library/exercise-detail-screen';
import type { LibraryExercise } from '@/features/library/library';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({
    back: jest.fn(),
    canGoBack: () => true,
    replace: jest.fn(),
  }),
}));

const item: LibraryExercise = {
  ...bundledContentInstallation.exercises[0]!,
  preference: { favorite: false, avoidState: 'none', avoidUntil: null },
};

describe('exercise detail', () => {
  it('presents complete text guidance and visible draft-review status', async () => {
    const screen = await render(
      <ExerciseDetailContent
        item={item}
        onBack={jest.fn()}
        onAvoided={jest.fn()}
        onFavorite={jest.fn()}
        saveError={false}
        saving={false}
      />,
    );

    screen.getByRole('header', { name: 'Supported breathing reset' });
    screen.getByText('Clinical review pending');
    screen.getByRole('header', { name: 'Set up' });
    screen.getByRole('header', { name: 'Move' });
    screen.getByRole('header', { name: 'Breathe' });
    screen.getByRole('header', { name: 'Common mistakes' });
    screen.getByRole('header', { name: 'When to stop' });
    screen.getByText(/Stop if the movement feels wrong/i);
  });

  it('exposes labeled preference controls and a non-gesture back action', async () => {
    const onBack = jest.fn();
    const onFavorite = jest.fn();
    const onAvoided = jest.fn();
    const screen = await render(
      <ExerciseDetailContent
        item={item}
        onBack={onBack}
        onAvoided={onAvoided}
        onFavorite={onFavorite}
        saveError={false}
        saving={false}
      />,
    );

    await fireEvent.press(
      screen.getByRole('button', { name: 'Back to library' }),
    );
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Favorite' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Avoid' }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onFavorite).toHaveBeenCalledWith(true);
    expect(onAvoided).toHaveBeenCalledWith(true);
  });

  it('announces persistence failures without losing the current screen', async () => {
    const screen = await render(
      <ExerciseDetailContent
        item={item}
        onBack={jest.fn()}
        onAvoided={jest.fn()}
        onFavorite={jest.fn()}
        saveError
        saving={false}
      />,
    );

    screen.getByRole('alert', {
      name: 'The preference could not be saved. Try again.',
    });
  });
});
