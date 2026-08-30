import { fireEvent, render } from '@testing-library/react-native';

import SettingsScreen from '@/app/(tabs)/settings';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('settings profile entry point', () => {
  beforeEach(() => mockPush.mockClear());

  it('opens the editable local profile', async () => {
    const screen = await render(<SettingsScreen />);

    screen.getByRole('header', { name: 'Settings' });
    await fireEvent.press(screen.getByRole('button', { name: 'Edit profile' }));

    expect(mockPush).toHaveBeenCalledWith('/profile');
  });

  it('opens generator diagnostics in development builds', async () => {
    const screen = await render(<SettingsScreen />);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Open generator diagnostics' }),
    );

    expect(mockPush).toHaveBeenCalledWith('/developer/generator');
  });

  it('opens the controls-only player preview in development builds', async () => {
    const screen = await render(<SettingsScreen />);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Preview session controls' }),
    );

    expect(mockPush).toHaveBeenCalledWith('/developer/player');
  });
});
