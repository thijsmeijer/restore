import { render } from '@testing-library/react-native';

import { PlayerPreviewScreen } from '@/features/developer/player-preview-screen';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ replace: jest.fn() }),
}));

describe('developer player preview', () => {
  it('assigns no movement and exposes the player controls for device review', async () => {
    const screen = await render(<PlayerPreviewScreen onExit={jest.fn()} />);

    screen.getByRole('header', { name: 'Timer and controls preview' });
    screen.getByText(
      'Use Pause, Next, Skip, feedback, and Finish early to review the player controls.',
    );
    screen.getByText(
      'Stay comfortable; this preview does not ask you to exercise.',
    );
    screen.getByRole('button', { name: 'Feels wrong' });
    screen.getByRole('button', { name: 'Pause' });
  });
});
