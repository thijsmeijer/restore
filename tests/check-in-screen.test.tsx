import { useState } from 'react';

import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { bodyMapTargets } from '@/features/check-in/accessible-body-map';
import { BodyObservationSelector } from '@/features/check-in/body-observation-selector';
import type { CheckIn, CheckInInput } from '@/features/check-in/check-in';
import {
  checkInNeedsScrolling,
  CheckInFormScreen,
} from '@/features/check-in/check-in-form-screen';
import type { UserProfile } from '@/features/onboarding/profile';
import { selectableBodyRegionOptions } from '@/features/onboarding/profile-options';

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

function BodySelectorHarness() {
  const [value, setValue] = useState<CheckInInput['regions']>([]);
  return <BodyObservationSelector compact onChange={setValue} value={value} />;
}

describe('check-in form', () => {
  it('maps every canonical selectable body region to the front or back map', () => {
    const mappedSlugs = new Set(
      Object.values(bodyMapTargets).flatMap((targets) =>
        targets.flatMap((target) => target.regionSlugs),
      ),
    );

    expect([...mappedSlugs].sort()).toEqual(
      selectableBodyRegionOptions.map((region) => region.slug).sort(),
    );
  });

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

  it('selects the combined wrist, hand, and fingers area without another choice', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <BodyObservationSelector onChange={onChange} value={[]} />,
    );

    await fireEvent.press(
      screen.getByRole('button', { name: 'Choose focus areas' }),
    );
    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Right wrist, hand, and fingers, front',
      }),
    );
    expect(screen.queryByText('Choose wrist, hand, and fingers')).toBeNull();
    expect(screen.queryByText('Stiffness')).toBeNull();

    expect(onChange).toHaveBeenCalledWith([
      {
        regionSlug: 'wrist_hand_fingers',
        side: 'right',
        stiffness: null,
        soreness: null,
        discomfort: null,
      },
    ]);
  });

  it('combines opposite map taps into both sides and toggles them off', async () => {
    const screen = await render(<BodySelectorHarness />);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Choose focus areas' }),
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Right elbow, front' }),
    );
    screen.getByRole('button', { name: 'Elbow, Right' });

    await fireEvent.press(
      screen.getByRole('button', { name: 'Left elbow, front' }),
    );
    screen.getByRole('button', { name: 'Elbow, Both sides' });

    await fireEvent.press(
      screen.getByRole('button', { name: 'Right elbow, front' }),
    );
    screen.getByRole('button', { name: 'Elbow, Left' });

    await fireEvent.press(
      screen.getByRole('button', { name: 'Left elbow, front' }),
    );
    expect(screen.queryByRole('button', { name: 'Elbow, Left' })).toBeNull();
  });

  it('supports crowded map areas, back view, and the full text list', async () => {
    const screen = await render(
      <BodyObservationSelector
        onChange={jest.fn()}
        value={[
          {
            regionSlug: 'shoulder_front',
            side: 'right',
            stiffness: 4,
            soreness: null,
            discomfort: null,
          },
          {
            regionSlug: 'calf',
            side: 'left',
            stiffness: null,
            soreness: 2,
            discomfort: null,
          },
        ]}
      />,
    );

    await fireEvent.press(
      screen.getByRole('button', { name: 'Review focus areas' }),
    );
    expect(
      screen.getByRole('button', {
        name: 'Right shoulder and chest, front',
      }),
    ).toHaveAccessibilityValue({ text: 'Selected: 1 area' });

    await fireEvent.press(screen.getByRole('radio', { name: 'Back' }));
    expect(
      screen.getByRole('button', {
        name: 'Left calf, ankle, and foot, back',
      }),
    ).toHaveAccessibilityValue({ text: 'Selected: 1 area' });

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Left shoulder and upper back, back',
      }),
    );
    screen.getByRole('header', { name: 'Choose shoulder and upper back' });
    screen.getByRole('checkbox', { name: 'Rear shoulder' });
    await fireEvent.press(
      screen.getByRole('button', { name: 'Back to body map' }),
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Choose from list' }),
    );
    screen.getByRole('checkbox', { name: 'Neck' });
    screen.getByRole('button', { name: 'Use body map' });
  });
});
