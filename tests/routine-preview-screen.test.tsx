import { fireEvent, render } from '@testing-library/react-native';

import { exerciseIdentityKey } from '@/db/repositories/generation-catalog-repository';
import {
  resolveRoutineRouteId,
  RoutinePreviewContent,
} from '@/features/routine/routine-preview-screen';
import type { RoutineDetails } from '@/features/routine/routine-service';

import {
  createRoutineFixture,
  routineFixtureAlternativeId,
  routineFixtureExercises,
} from './support/routine-fixtures';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
}));

const copy = (name: string) => ({
  name,
  summary: 'Summary',
  setup: 'Setup',
  execution: 'Execution',
  breathing: 'Breathe easily.',
  commonErrors: ['Avoid rushing.'],
  stopRules: ['Stop if it feels wrong.'],
});

function routineDetails(
  status: 'ready' | 'superseded' = 'ready',
): RoutineDetails {
  const value = createRoutineFixture();
  const item = value.items[0]!;
  const exercises = routineFixtureExercises();
  return {
    routine: {
      value,
      status,
      supersedesRoutineId: null,
      editKind: 'generated',
      createdAt: value.generated_at,
      readyAt: value.generated_at,
      items: [
        {
          id: '00000000000000000000000010',
          replacesRoutineItemId: null,
          editSource: 'generator',
          value: item,
        },
      ],
    },
    exercises: new Map([
      [
        exerciseIdentityKey(item.exercise_id, item.exercise_version),
        { exercise: exercises[0]!, copy: copy('Seated upper-back rotation') },
      ],
      [
        exerciseIdentityKey(routineFixtureAlternativeId, exercises[1]!.version),
        { exercise: exercises[1]!, copy: copy('Lying upper-back rotation') },
      ],
    ]),
  };
}

describe('routine preview', () => {
  it('accepts only one stable routine identity from the route', () => {
    expect(resolveRoutineRouteId('52000000-0000-4000-8000-000000000001')).toBe(
      '52000000-0000-4000-8000-000000000001',
    );
    expect(resolveRoutineRouteId(['00000000000000000000000001'])).toBe(
      '00000000000000000000000001',
    );
    expect(resolveRoutineRouteId('../routine')).toBeNull();
    expect(resolveRoutineRouteId(undefined)).toBeNull();
  });

  it('shows phases, exact dosage, reasons, duration, and stop guidance', async () => {
    const screen = await render(
      <RoutinePreviewContent
        busy={false}
        details={routineDetails()}
        failureCode={null}
        onBack={jest.fn()}
        onRegenerate={jest.fn()}
        onReplace={jest.fn()}
        onStart={jest.fn()}
      />,
    );

    screen.getByRole('header', { name: 'Today’s routine' });
    screen.getByRole('header', { name: 'Arrive' });
    screen.getByText('Seated upper-back rotation');
    screen.getByText('4 min 55 sec');
    screen.getByText('Matches an area you selected today.');
    screen.getByText(/Stop if a movement causes sudden, severe, spreading/i);
  });

  it('reveals named replacement options and sends the exact identity', async () => {
    const onReplace = jest.fn();
    const screen = await render(
      <RoutinePreviewContent
        busy={false}
        details={routineDetails()}
        failureCode={null}
        onBack={jest.fn()}
        onRegenerate={jest.fn()}
        onReplace={onReplace}
        onStart={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Replace' }));
    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Use Lying upper-back rotation',
      }),
    );
    expect(onReplace).toHaveBeenCalledWith(0, routineFixtureAlternativeId);
  });

  it('keeps failed edits visible and the previous routine available', async () => {
    const onRegenerate = jest.fn();
    const screen = await render(
      <RoutinePreviewContent
        busy={false}
        details={routineDetails()}
        failureCode="replacement_unavailable"
        onBack={jest.fn()}
        onRegenerate={onRegenerate}
        onReplace={jest.fn()}
        onStart={jest.fn()}
      />,
    );

    screen.getByRole('alert', { name: /Nothing changed/i });
    await fireEvent.press(
      screen.getByRole('button', { name: 'Build another option' }),
    );
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  it('shows superseded history without offering another edit from it', async () => {
    const screen = await render(
      <RoutinePreviewContent
        busy={false}
        details={routineDetails('superseded')}
        failureCode={null}
        onBack={jest.fn()}
        onRegenerate={jest.fn()}
        onReplace={jest.fn()}
        onStart={jest.fn()}
      />,
    );

    screen.getByRole('text', { name: 'Previous version' });
    expect(screen.queryByRole('button', { name: 'Replace' })).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Build another option' }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Start routine' })).toBeNull();
  });

  it('starts only the exact ready routine shown in preview', async () => {
    const onStart = jest.fn();
    const screen = await render(
      <RoutinePreviewContent
        busy={false}
        details={routineDetails()}
        failureCode={null}
        onBack={jest.fn()}
        onRegenerate={jest.fn()}
        onReplace={jest.fn()}
        onStart={onStart}
      />,
    );

    await fireEvent.press(
      screen.getByRole('button', { name: 'Start routine' }),
    );
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
