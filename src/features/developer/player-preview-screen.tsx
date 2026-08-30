import { useMemo } from 'react';

import type { ExerciseCopy } from '@/content/exercise-copy';
import { exerciseIdentityKey } from '@/db/repositories/generation-catalog-repository';
import {
  PlayerContent,
  type PlayerContentDetails,
} from '@/features/player/player-screen';

const previewExerciseId = '53000000-0000-4000-8000-000000000001';

const previewItem: PlayerContentDetails['routine']['items'][number] = {
  id: '00000000000000000000000020',
  value: {
    order: 0,
    exercise_id: previewExerciseId,
    exercise_version: 1,
    prescription: {
      type: 'timed_movement',
      dose: 20,
      sets: 1,
      tempo: 'controlled',
      side_mode: 'central',
      side_sequence: ['central'],
      rest_seconds: 0,
      transition_seconds: 5,
      estimated_duration_seconds: 25,
    },
  },
};

const previewCopy: ExerciseCopy = {
  name: 'Timer and controls preview',
  summary: 'A developer-only interaction check with no assigned movement.',
  setup: 'Stay where you are. No movement is assigned in this preview.',
  execution:
    'Use Pause, Next, Skip, feedback, and Finish early to review the player controls.',
  breathing: 'Stay comfortable; this preview does not ask you to exercise.',
  commonErrors: ['Do not treat this controls preview as movement guidance.'],
  stopRules: ['Select Feels wrong at any time to review the stop flow.'],
};

export interface PlayerPreviewScreenProps {
  readonly onExit: () => void;
}

export function PlayerPreviewScreen({ onExit }: PlayerPreviewScreenProps) {
  const details = useMemo<PlayerContentDetails>(
    () => ({
      routine: { items: [previewItem] },
      exercises: new Map([
        [exerciseIdentityKey(previewExerciseId, 1), { copy: previewCopy }],
      ]),
    }),
    [],
  );

  return <PlayerContent details={details} onExit={onExit} />;
}
