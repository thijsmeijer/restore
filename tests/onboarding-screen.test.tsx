import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { OnboardingProfileScreen } from '@/features/onboarding/onboarding-profile-screen';
import type {
  OnboardingProfileInput,
  SaveProfileResult,
  UserProfile,
} from '@/features/onboarding/profile';
import { currentSafetyRulesVersion } from '@/features/onboarding/profile-options';

const timestamp = '2026-08-30T08:00:00.000Z';

function completedProfile(input: OnboardingProfileInput): UserProfile {
  return {
    id: '01K00000000000000000000000',
    goalSlugs: input.goalSlugs,
    bodyBaseline: input.bodyBaseline,
    equipmentIds: input.equipmentIds,
    trainingTypes: input.trainingTypes,
    preferredDurations: input.preferredDurations,
    units: null,
    coachingPreference: null,
    onboardingCompletedAt: timestamp,
    safetyRulesVersion: currentSafetyRulesVersion,
    safetyAcknowledgedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function successfulSave() {
  return jest.fn(
    async (input: OnboardingProfileInput): Promise<SaveProfileResult> => ({
      ok: true,
      profile: completedProfile(input),
    }),
  );
}

async function skipToSafety(
  screen: Awaited<ReturnType<typeof render>>,
  stepsToSkip: number,
) {
  for (let index = 0; index < stepsToSkip; index += 1) {
    await fireEvent.press(
      screen.getByRole('button', { name: 'Skip this step' }),
    );
  }
}

async function acknowledgeAndSave(
  screen: Awaited<ReturnType<typeof render>>,
  label = 'Finish setup',
) {
  await fireEvent.press(
    screen.getByRole('checkbox', {
      name: 'I understand Restore’s safety boundary',
    }),
  );
  await fireEvent.press(screen.getByRole('button', { name: label }));
}

describe('onboarding profile screen', () => {
  it('allows every optional step to be skipped but requires safety acknowledgement', async () => {
    const onSave = successfulSave();
    const screen = await render(
      <OnboardingProfileScreen initialProfile={null} onSave={onSave} />,
    );

    screen.getByRole('header', { name: 'Make Restore yours' });
    screen.getByText(/stay on this iPhone/i);
    await fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    await skipToSafety(screen, 5);

    expect(
      screen.getByRole('button', { name: 'Finish setup' }).props
        .accessibilityState,
    ).toEqual({ disabled: true });
    screen.getByText(/only ask for notification access/i);
    screen.getByText(/new numbness or tingling/i);
    screen.getByText(/still check your current symptoms/i);

    await acknowledgeAndSave(screen);

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        goalSlugs: [],
        bodyBaseline: [],
        equipmentIds: [],
        trainingTypes: [],
        preferredDurations: { quick: null, normal: null, deep: null },
        safetyAcknowledged: true,
      }),
    );
  });

  it('stores goals in a user-controlled priority order', async () => {
    const onSave = successfulSave();
    const screen = await render(
      <OnboardingProfileScreen initialProfile={null} onSave={onSave} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    await fireEvent.press(
      screen.getByRole('checkbox', { name: 'Move with more ease' }),
    );
    await fireEvent.press(
      screen.getByRole('checkbox', { name: 'Ease everyday stiffness' }),
    );
    const dragHandle = screen.getByRole('adjustable', {
      name: 'Ease everyday stiffness, priority 2 of 2',
    });
    await act(() => {
      dragHandle.props.onAccessibilityAction({
        nativeEvent: { actionName: 'decrement' },
      });
    });
    await waitFor(() =>
      screen.getByRole('adjustable', {
        name: 'Ease everyday stiffness, priority 1 of 2',
      }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await skipToSafety(screen, 4);
    await acknowledgeAndSave(screen);

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          goalSlugs: ['reduce_stiffness', 'move_better'],
        }),
      ),
    );
  });

  it('captures a side-specific body baseline without requiring the future body map', async () => {
    const onSave = successfulSave();
    const screen = await render(
      <OnboardingProfileScreen initialProfile={null} onSave={onSave} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Skip this step' }),
    );
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Neck' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Left' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add area' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await skipToSafety(screen, 3);
    await acknowledgeAndSave(screen);

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          bodyBaseline: [{ regionSlug: 'neck', side: 'left' }],
        }),
      ),
    );
  });

  it('uses stable tap targets for routine lengths and preserves their ordering', async () => {
    const onSave = successfulSave();
    const screen = await render(
      <OnboardingProfileScreen initialProfile={null} onSave={onSave} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    await skipToSafety(screen, 4);

    await fireEvent.press(screen.getByRole('radio', { name: 'Quick: 15 min' }));
    await fireEvent.press(
      screen.getByRole('radio', { name: 'Standard: 10 min' }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await acknowledgeAndSave(screen);

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          preferredDurations: { quick: 10, normal: 10, deep: 30 },
        }),
      ),
    );
  });

  it('loads an existing profile for editing and exposes a cancel path', async () => {
    const onSave = successfulSave();
    const onComplete = jest.fn();
    const profile = completedProfile({
      goalSlugs: ['move_better'],
      bodyBaseline: [],
      equipmentIds: [],
      trainingTypes: [],
      preferredDurations: { quick: 5, normal: 15, deep: 30 },
      safetyAcknowledged: true,
    });
    const screen = await render(
      <OnboardingProfileScreen
        initialProfile={profile}
        onComplete={onComplete}
        onSave={onSave}
      />,
    );

    screen.getByRole('header', { name: 'Review your profile' });
    await fireEvent.press(
      screen.getByRole('button', { name: 'Review profile' }),
    );
    expect(
      screen.getByRole('checkbox', { name: 'Move with more ease' }).props
        .accessibilityState,
    ).toEqual({ checked: true });

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('keeps a failed local save visible without claiming completion', async () => {
    const onSave = jest.fn(async (): Promise<SaveProfileResult> => {
      throw new Error('Expected database error');
    });
    const screen = await render(
      <OnboardingProfileScreen initialProfile={null} onSave={onSave} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    await skipToSafety(screen, 5);
    await acknowledgeAndSave(screen);

    await waitFor(() =>
      screen.getByRole('alert', {
        name: /could not save your profile/i,
      }),
    );
  });
});
