import { render } from '@testing-library/react-native';

import TodayScreen from '@/app/(tabs)/index';

describe('Today application shell', () => {
  it('identifies the screen and confirms local profile setup', async () => {
    const screen = await render(<TodayScreen />);

    screen.getByRole('header', { name: 'Today' });
    screen.getByText(/profile is stored locally on this iPhone/i);
  });
});
