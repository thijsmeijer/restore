import { fireEvent, render } from '@testing-library/react-native';

import { TodayContent } from '@/app/(tabs)/index';
import type { CheckIn } from '@/features/check-in/check-in';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const latest: CheckIn = {
  id: '00000000000000000000000000',
  mode: 'daily_restore',
  availableMinutes: 15,
  readiness: 4,
  environment: 'home',
  equipmentIds: [],
  regions: [
    {
      regionSlug: 'neck',
      side: 'central',
      stiffness: 3,
      soreness: null,
      discomfort: null,
    },
  ],
  training: null,
  note: null,
  safety: null,
  safetyResult: null,
  safetyRulesVersion: null,
  safetyRuleIds: [],
  safetyReasonCodes: [],
  observedAt: '2026-08-30T08:15:00.000Z',
  localDate: '2026-08-30',
  timeZone: 'Europe/Amsterdam',
  captureStatus: 'captured',
  createdAt: '2026-08-30T08:15:00.000Z',
};

describe('Today check-in entry point', () => {
  it('opens a first check-in from a clear empty state', async () => {
    const onCheckIn = jest.fn();
    const screen = await render(
      <TodayContent
        latest={null}
        onCheckIn={onCheckIn}
        onRetry={jest.fn()}
        status="ready"
      />,
    );

    screen.getByRole('header', { name: 'Make space to move' });
    screen.getByText(/one quick check-in/i);
    await fireEvent.press(screen.getByRole('button', { name: 'Check in' }));

    expect(onCheckIn).toHaveBeenCalledTimes(1);
  });

  it('summarizes the latest saved snapshot without hiding missing values', async () => {
    const screen = await render(
      <TodayContent
        latest={latest}
        onCheckIn={jest.fn()}
        onRetry={jest.fn()}
        status="ready"
      />,
    );

    screen.getByText('Latest check-in');
    screen.getByText('Daily restore · Home');
    screen.getByText('1 body area rated · Readiness 4 of 5');
    screen.getByRole('button', { name: 'Check in again' });
  });

  it('offers a retry without claiming local information was lost', async () => {
    const onRetry = jest.fn();
    const screen = await render(
      <TodayContent
        latest={null}
        onCheckIn={jest.fn()}
        onRetry={onRetry}
        status="error"
      />,
    );

    screen.getByRole('alert', {
      name: 'Today’s details could not be loaded',
    });
    screen.getByText('Your saved information is still on this iPhone.');
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps a blocked result visible after returning to Today', async () => {
    const screen = await render(
      <TodayContent
        latest={{
          ...latest,
          captureStatus: 'submitted',
          safety: { reportedSignals: ['rapidly_worsening_problem'] },
          safetyResult: 'blocked',
          safetyRulesVersion: 'check_in_safety_engineering_2026_08_30',
          safetyRuleIds: ['block_rapidly_worsening_problem_v1'],
          safetyReasonCodes: ['reported_rapidly_worsening_problem'],
        }}
        onCheckIn={jest.fn()}
        onRetry={jest.fn()}
        status="ready"
      />,
    );

    screen.getByRole('text', { name: 'Routine paused' });
    screen.getByRole('alert', {
      name: /Restore will not build a routine from this check-in/i,
    });
  });
});
