import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { BodyObservationSelector } from '@/features/check-in/body-observation-selector';
import type { CheckIn, CheckInInput } from '@/features/check-in/check-in';
import {
  checkInNeedsScrolling,
  CheckInFormScreen,
} from '@/features/check-in/check-in-form-screen';
import type { UserProfile } from '@/features/onboarding/profile';

const profile: UserProfile = {
  id: '00000000000000000000000000',
  goalSlugs: ['move_better'],
  bodyBaseline: [{ regionSlug: 'neck', side: 'central' }],
  equipmentIds: ['10000000-0000-4000-8000-000000000001'],
  trainingTypes: ['planche', 'pull'],
  preferredDurations: { quick: 5, normal: 15, deep: 30 },
  units: null,
  coachingPreference: null,
  onboardingCompletedAt: '2026-08-30T08:00:00.000Z',
  safetyRulesVersion: 'safety_baseline_2026_08_28',
  safetyAcknowledgedAt: '2026-08-30T08:00:00.000Z',
  createdAt: '2026-08-30T08:00:00.000Z',
  updatedAt: '2026-08-30T08:00:00.000Z',
};

function savedCheckIn(input: CheckInInput): CheckIn {
  return {
    id: '00000000000000000000000001',
    ...input,
    observedAt: '2026-08-30T08:15:00.000Z',
    localDate: '2026-08-30',
    timeZone: 'Europe/Amsterdam',
    captureStatus: 'captured',
    createdAt: '2026-08-30T08:15:00.000Z',
  };
}

describe('check-in form', () => {
  it('keeps the standard flow fixed while allowing large text to scroll', () => {
    expect(checkInNeedsScrolling(1)).toBe(false);
    expect(checkInNeedsScrolling(1.2)).toBe(false);
    expect(checkInNeedsScrolling(1.21)).toBe(true);
  });

  it('captures a fast context snapshot with profile-aware defaults', async () => {
    const onComplete = jest.fn();
    const onSave = jest.fn(async (input: CheckInInput) => ({
      ok: true as const,
      checkIn: savedCheckIn(input),
    }));
    const screen = await render(
      <CheckInFormScreen
        onComplete={onComplete}
        onSave={onSave}
        profile={profile}
      />,
    );

    expect(
      screen.getByRole('radio', { name: 'Daily restore' }).props
        .accessibilityState,
    ).toEqual({ selected: true });
    expect(screen.getByLabelText('Step 1 of 4')).toHaveAccessibilityValue({
      min: 1,
      max: 4,
      now: 1,
    });
    await fireEvent.press(
      screen.getByRole('radio', { name: 'After training' }),
    );
    await fireEvent.press(screen.getByRole('radio', { name: '10 min' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    screen.getByRole('header', { name: 'How are you moving?' });
    screen.getByLabelText('Step 2 of 4');
    await fireEvent.press(screen.getByRole('radio', { name: 'Good' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    screen.getByRole('header', { name: 'What can you use?' });
    screen.getByText('Mat');
    await fireEvent.press(screen.getByRole('radio', { name: 'Home' }));
    screen.getByText('Mat');
    await fireEvent.press(screen.getByRole('radio', { name: 'Gym' }));
    screen.getByText('No equipment selected');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    screen.getByRole('header', { name: 'Any training today?' });
    screen.getByLabelText('Step 4 of 4');
    expect(
      screen.getByRole('radio', { name: 'Completed' }).props.accessibilityState,
    ).toEqual({ selected: true });
    await fireEvent.press(screen.getByRole('radio', { name: 'Hard' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add a note' }));
    await fireEvent.changeText(
      screen.getByLabelText('Check-in note'),
      '  Wrists felt worked.  ',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Save check-in' }),
    );

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      mode: 'post_workout_reset',
      availableMinutes: 10,
      readiness: 4,
      environment: 'gym',
      equipmentIds: [],
      regions: [],
      training: { type: 'planche', status: 'completed', stress: 4 },
      note: '  Wrists felt worked.  ',
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('adds an explicit zero body rating without using a slider', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <BodyObservationSelector onChange={onChange} value={[]} />,
    );

    await fireEvent.press(
      screen.getByRole('button', { name: 'Add a focus area' }),
    );
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Neck' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Right' }));
    await fireEvent.press(
      screen.getByRole('radio', { name: 'Stiffness 0 of 10' }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Add area' }));

    expect(onChange).toHaveBeenCalledWith([
      {
        regionSlug: 'neck',
        side: 'right',
        stiffness: 0,
        soreness: null,
        discomfort: null,
      },
    ]);
  });
});
