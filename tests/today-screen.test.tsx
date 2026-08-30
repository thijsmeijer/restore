import { render } from '@testing-library/react-native';

import TodayScreen from '@/app/(tabs)/index';

describe('Today application shell', () => {
  it('identifies the screen with user-facing profile copy', async () => {
    const screen = await render(<TodayScreen />);

    screen.getByRole('header', { name: 'Today' });
    screen.getByText(/starting point for a routine shaped around your goals/i);
  });
});
