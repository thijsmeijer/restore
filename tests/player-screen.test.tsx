import { fireEvent, render } from '@testing-library/react-native';

import { exerciseIdentityKey } from '@/db/repositories/generation-catalog-repository';
import {
  PlayerContent,
  resolvePlayerRouteId,
} from '@/features/player/player-screen';
import type { RoutineDetails } from '@/features/routine/routine-service';

import {
  createRoutineFixture,
  routineFixtureExercises,
} from './support/routine-fixtures';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ replace: jest.fn() }),
}));

function details(): RoutineDetails {
  const value = createRoutineFixture();
  const generatedItem = value.items[0]!;
  const exercise = routineFixtureExercises()[0]!;
  return {
    routine: {
      value,
      status: 'ready',
      supersedesRoutineId: null,
      editKind: 'generated',
      createdAt: value.generated_at,
      readyAt: value.generated_at,
      items: [
        {
          id: '00000000000000000000000010',
          replacesRoutineItemId: null,
          editSource: 'generator',
          value: generatedItem,
        },
      ],
    },
    exercises: new Map([
      [
        exerciseIdentityKey(
          generatedItem.exercise_id,
          generatedItem.exercise_version,
        ),
        {
          exercise,
          copy: {
            name: 'Seated upper-back rotation',
            summary: 'Easy seated rotation.',
            setup: 'Sit with both feet supported.',
            execution: 'Turn only through a comfortable range.',
            breathing: 'Keep breathing easily.',
            commonErrors: ['Do not force the movement.'],
            stopRules: ['Stop if the movement feels wrong.'],
          },
        },
      ],
    ]),
  };
}

describe('session player screen', () => {
  it('accepts only one stable routine identity from the route', () => {
    expect(resolvePlayerRouteId('52000000-0000-4000-8000-000000000001')).toBe(
      '52000000-0000-4000-8000-000000000001',
    );
    expect(resolvePlayerRouteId(['00000000000000000000000001'])).toBe(
      '00000000000000000000000001',
    );
    expect(resolvePlayerRouteId('../session')).toBeNull();
    expect(resolvePlayerRouteId(undefined)).toBeNull();
  });

  it('shows the exact prescription, instruction, progress, and floor controls', async () => {
    const screen = await render(
      <PlayerContent details={details()} onExit={jest.fn()} />,
    );

    expect(
      screen.getByLabelText('Movement 1 of 1').props.accessibilityRole,
    ).toBe('progressbar');
    screen.getByText('Movement 1 of 1');
    screen.getByRole('header', { name: 'Seated upper-back rotation' });
    expect(
      screen.getByLabelText('4:55 remaining').props.accessibilityRole,
    ).toBe('timer');
    screen.getByText('Turn only through a comfortable range.');
    screen.getByText('Keep breathing easily.');
    screen.getByText('Stop if the movement feels wrong.');
    screen.getByRole('button', { name: 'Pause' });
    screen.getByRole('button', { name: 'Next' });
    screen.getByRole('button', { name: 'Skip movement' });
    screen.getByRole('button', { name: 'Finish early' });
  });

  it('marks quick feedback and pauses into an unskippable wrong-response prompt', async () => {
    const screen = await render(
      <PlayerContent details={details()} onExit={jest.fn()} />,
    );

    const helpful = screen.getByRole('checkbox', { name: 'Feels good' });
    await fireEvent.press(helpful);
    expect(
      screen.getByRole('checkbox', { name: 'Feels good' }).props
        .accessibilityState,
    ).toMatchObject({ checked: true });
    screen.getByText('Response: Feels good');

    await fireEvent.press(screen.getByRole('button', { name: 'Feels wrong' }));
    screen.getByRole('header', { name: 'Movement paused' });
    screen.getByRole('button', { name: 'Skip this movement' });
    screen.getByRole('button', { name: 'End session' });
    expect(screen.queryByRole('button', { name: 'Keep going' })).toBeNull();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Skip this movement' }),
    );
    screen.getByRole('header', { name: 'Routine complete' });
    screen.getByText('This player preview does not save session history yet.');
  });

  it('requires confirmation before finishing early', async () => {
    const screen = await render(
      <PlayerContent details={details()} onExit={jest.fn()} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Finish early' }));
    screen.getByRole('header', { name: 'Finish this session?' });
    await fireEvent.press(screen.getByRole('button', { name: 'Keep going' }));
    screen.getByRole('button', { name: 'Pause' });
  });

  it('keeps the immediate stop action available during transitions', async () => {
    const screen = await render(
      <PlayerContent details={details()} onExit={jest.fn()} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    screen.getByText('Settle before finishing');
    screen.getByRole('button', { name: 'Feels wrong' });
  });
});
