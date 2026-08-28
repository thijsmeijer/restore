import { render } from '@testing-library/react-native';

import TodayScreen from '@/app/(tabs)/index';

describe('Today application shell', () => {
  it('identifies the screen and its intentionally deferred behavior', async () => {
    const screen = await render(<TodayScreen />);

    screen.getByRole('header', { name: 'Today' });
    screen.getByText(/contains no health data or generation logic yet/i);
  });
});
