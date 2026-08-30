import { z } from 'zod';

import type { Exercise } from '@/content/schemas';

export const exerciseCopySchema = z.strictObject({
  name: z.string().min(1).max(80),
  summary: z.string().min(1).max(220),
  setup: z.string().min(1).max(500),
  execution: z.string().min(1).max(700),
  breathing: z.string().min(1).max(300),
  commonErrors: z.array(z.string().min(1).max(240)).min(1),
  stopRules: z.array(z.string().min(1).max(280)).min(1),
});

export type ExerciseCopy = z.infer<typeof exerciseCopySchema>;

const stopIfWrong =
  'Stop if the movement feels wrong or makes what you are feeling worse.';

const copyBySlug: Readonly<Record<string, ExerciseCopy>> = {
  supported_breathing_reset: {
    name: 'Supported breathing reset',
    summary: 'A quiet breathing drill in a supported lying position.',
    setup:
      'Lie on your back with your head supported and knees bent. Let your arms rest comfortably and keep your jaw relaxed.',
    execution:
      'Allow your body to settle into the support. Breathe without trying to make the breath as large as possible.',
    breathing:
      'Breathe in gently through your nose, then let the exhale leave slowly and easily.',
    commonErrors: ['Avoid forcing a deep breath or bracing your abdomen.'],
    stopRules: [
      stopIfWrong,
      'Stop if breathing becomes difficult, uncomfortable, or unusually restricted.',
    ],
  },
  seated_breathing_reset: {
    name: 'Seated breathing reset',
    summary: 'A low-effort breathing pause you can do from a chair.',
    setup:
      'Sit with both feet supported and let your hands rest. Choose a position that does not require you to hold yourself rigidly upright.',
    execution:
      'Let your ribs and torso move naturally with each breath while your shoulders stay easy.',
    breathing:
      'Breathe in gently through your nose and use an unforced, slightly longer exhale.',
    commonErrors: ['Avoid lifting your shoulders or forcing a large breath.'],
    stopRules: [
      stopIfWrong,
      'Stop if breathing becomes difficult, uncomfortable, or unusually restricted.',
    ],
  },
  seated_thoracic_rotation: {
    name: 'Seated upper-back rotation',
    summary:
      'Explore comfortable rotation through your upper back while seated.',
    setup:
      'Sit with both feet supported. Cross your arms loosely or rest your hands on your chest.',
    execution:
      'Turn your chest slowly to one side without forcing the end position. Return to the middle and repeat on the other side.',
    breathing:
      'Keep breathing normally; an easy exhale can accompany each turn.',
    commonErrors: [
      'Avoid pulling yourself farther or rushing through the range.',
    ],
    stopRules: [stopIfWrong, 'Stop if symptoms increase as you rotate.'],
  },
  side_lying_thoracic_rotation: {
    name: 'Side-lying upper-back rotation',
    summary:
      'Explore upper-back rotation from a supported side-lying position.',
    setup:
      'Lie on your side with your head supported and knees comfortably bent. Reach both arms forward with your hands together.',
    execution:
      'Open the top arm and turn your chest only as far as feels easy. Return with control, then change sides after the set.',
    breathing:
      'Let an easy exhale accompany the opening movement and breathe normally on the return.',
    commonErrors: ['Avoid forcing your shoulder or knee toward the floor.'],
    stopRules: [stopIfWrong, 'Stop if symptoms increase as you rotate.'],
  },
  quadruped_scapular_glide: {
    name: 'All-fours shoulder-blade glide',
    summary:
      'Practice controlled shoulder-blade movement with your hands supported.',
    setup:
      'Start on hands and knees with hands under shoulders and knees under hips. Use a comfortable hand position.',
    execution:
      'Keep your elbows straight but not locked. Let your chest move slightly toward the floor, then press the floor away to spread your shoulder blades.',
    breathing: 'Breathe continuously and keep your neck and jaw relaxed.',
    commonErrors: ['Avoid bending the elbows or shrugging toward your ears.'],
    stopRules: [
      stopIfWrong,
      'Stop if wrist or shoulder discomfort appears or increases.',
    ],
  },
  wall_scapular_glide: {
    name: 'Wall shoulder-blade glide',
    summary: 'Practice shoulder-blade control while standing at a wall.',
    setup:
      'Stand facing a wall with hands placed around shoulder height. Step back enough to lean lightly into your hands.',
    execution:
      'Keep your elbows straight but not locked. Let your chest move slightly toward the wall, then press away to spread your shoulder blades.',
    breathing: 'Breathe continuously and keep the effort light.',
    commonErrors: [
      'Avoid shrugging your shoulders or pushing with locked elbows.',
    ],
    stopRules: [
      stopIfWrong,
      'Stop if shoulder discomfort appears or increases.',
    ],
  },
  wrist_controlled_circles: {
    name: 'Wrist controlled circles',
    summary:
      'Explore a comfortable circle through the wrists, hands, and fingers.',
    setup:
      'Sit or stand comfortably with your forearms supported or held easily in front of you. Keep your hands relaxed.',
    execution:
      'Draw a slow circle with each wrist through a comfortable range. Reverse direction after the planned repetitions.',
    breathing: 'Breathe normally and keep the rest of each arm relaxed.',
    commonErrors: ['Avoid forcing the circle or turning it into a fast shake.'],
    stopRules: [stopIfWrong, 'Stop if symptoms increase during the circle.'],
  },
  quadruped_wrist_rock: {
    name: 'All-fours wrist rock',
    summary:
      'Explore gentle wrist loading with a small controlled weight shift.',
    setup:
      'Start on hands and knees with fingers spread comfortably. Keep most of your weight through your knees at first.',
    execution:
      'Shift your body forward a small amount, then return. Stay inside a range that feels controlled and easy to reverse.',
    breathing: 'Breathe normally and keep your shoulders away from your ears.',
    commonErrors: ['Avoid forcing farther into wrist extension or bouncing.'],
    stopRules: [stopIfWrong, 'Stop if wrist or hand symptoms increase.'],
  },
  seated_hip_rotation_switch: {
    name: 'Seated hip rotation switch',
    summary:
      'Explore hip rotation by moving the knees side to side while seated.',
    setup:
      'Sit on the floor with knees bent and feet wider than hip width. Place your hands behind you for support if useful.',
    execution:
      'Lower both knees toward one side without forcing them down. Return through the middle and move toward the other side.',
    breathing:
      'Breathe normally and use an easy exhale as the knees change sides.',
    commonErrors: [
      'Avoid pushing through a pinching sensation or forcing the range.',
    ],
    stopRules: [stopIfWrong, 'Stop if hip or knee symptoms increase.'],
  },
  supine_hip_rotation: {
    name: 'Lying hip rotation',
    summary: 'Explore gentle hip rotation with your back supported.',
    setup:
      'Lie on your back with knees bent and feet a comfortable distance apart. Let your arms rest by your sides.',
    execution:
      'Allow both knees to move a small distance toward one side, return to the middle, then move toward the other side.',
    breathing:
      'Keep the breath easy and let an exhale accompany each side-to-side movement.',
    commonErrors: [
      'Avoid forcing the knees toward the floor or moving quickly.',
    ],
    stopRules: [stopIfWrong, 'Stop if hip or back symptoms increase.'],
  },
};

export function exerciseCopyFor(exercise: Exercise): ExerciseCopy {
  const copy = copyBySlug[exercise.slug];
  if (copy === undefined) {
    throw new Error(`exercise_copy_missing:${exercise.slug}`);
  }

  const parsed = exerciseCopySchema.parse(copy);
  if (
    parsed.commonErrors.length !==
      exercise.instructions.common_error_keys.length ||
    parsed.stopRules.length !== exercise.instructions.stop_rule_keys.length
  ) {
    throw new Error(
      `exercise_copy_instruction_count_mismatch:${exercise.slug}`,
    );
  }

  return parsed;
}

export function validateExerciseCopyCatalog(
  exercises: readonly Exercise[],
): readonly ExerciseCopy[] {
  const knownSlugs = new Set(exercises.map((exercise) => exercise.slug));
  const extraSlug = Object.keys(copyBySlug).find(
    (slug) => !knownSlugs.has(slug),
  );
  if (extraSlug !== undefined) {
    throw new Error(`exercise_copy_orphaned:${extraSlug}`);
  }

  return exercises.map(exerciseCopyFor);
}
