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
});
