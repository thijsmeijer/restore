import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { radius, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';
import type {
  BodyRegionSlug,
  BodySide,
} from '@/features/onboarding/profile-options';

export type BodyMapView = 'front' | 'back';

export type BodyMapTarget = {
  readonly id: string;
  readonly label: string;
  readonly regionSlugs: readonly BodyRegionSlug[];
  readonly side: Extract<BodySide, 'central' | 'left' | 'right'>;
  readonly x: number;
  readonly y: number;
};

type BodyMapSelection = {
  readonly regionSlug: BodyRegionSlug;
  readonly side: BodySide;
};

function target(
  id: string,
  label: string,
  regionSlugs: readonly BodyRegionSlug[],
  side: BodyMapTarget['side'],
  x: number,
  y: number,
): BodyMapTarget {
  return { id, label, regionSlugs, side, x, y };
}

const FRONT_TARGETS: readonly BodyMapTarget[] = [
  target(
    'front-head-neck',
    'Head and neck',
    ['head_eyes_jaw', 'neck'],
    'central',
    90,
    42,
  ),
  target(
    'front-right-upper-body',
    'Shoulder and chest',
    ['shoulder_front', 'shoulder_side', 'chest_pecs'],
    'right',
    61,
    99,
  ),
  target(
    'front-left-upper-body',
    'Shoulder and chest',
    ['shoulder_front', 'shoulder_side', 'chest_pecs'],
    'left',
    119,
    99,
  ),
  target('front-right-elbow', 'Elbow', ['elbow'], 'right', 39, 151),
  target('front-left-elbow', 'Elbow', ['elbow'], 'left', 141, 151),
  target('front-right-forearm', 'Forearm', ['forearm'], 'right', 31, 185),
  target('front-left-forearm', 'Forearm', ['forearm'], 'left', 149, 185),
  target(
    'front-right-hand',
    'Wrist, hand, and fingers',
    ['wrist', 'hand_fingers'],
    'right',
    23,
    225,
  ),
  target(
    'front-left-hand',
    'Wrist, hand, and fingers',
    ['wrist', 'hand_fingers'],
    'left',
    157,
    225,
  ),
  target(
    'front-right-hip-thigh',
    'Hip and upper thigh',
    [
      'hip_front',
      'hip_side',
      'hip_deep_rotation',
      'adductors_groin',
      'quadriceps',
    ],
    'right',
    69,
    239,
  ),
  target(
    'front-left-hip-thigh',
    'Hip and upper thigh',
    [
      'hip_front',
      'hip_side',
      'hip_deep_rotation',
      'adductors_groin',
      'quadriceps',
    ],
    'left',
    111,
    239,
  ),
  target('front-right-knee', 'Knee', ['knee'], 'right', 66, 297),
  target('front-left-knee', 'Knee', ['knee'], 'left', 114, 297),
  target(
    'front-right-foot',
    'Ankle, foot, and toes',
    ['ankle', 'foot_toes'],
    'right',
    61,
    342,
  ),
  target(
    'front-left-foot',
    'Ankle, foot, and toes',
    ['ankle', 'foot_toes'],
    'left',
    119,
    342,
  ),
];

const BACK_TARGETS: readonly BodyMapTarget[] = [
  target(
    'back-head-neck',
    'Head and neck',
    ['head_eyes_jaw', 'neck'],
    'central',
    90,
    42,
  ),
  target(
    'back-left-upper-body',
    'Shoulder and upper back',
    [
      'upper_trapezius',
      'shoulder_side',
      'shoulder_rear',
      'scapular_region',
      'lats',
    ],
    'left',
    62,
    104,
  ),
  target(
    'back-right-upper-body',
    'Shoulder and upper back',
    [
      'upper_trapezius',
      'shoulder_side',
      'shoulder_rear',
      'scapular_region',
      'lats',
    ],
    'right',
    118,
    104,
  ),
  target('back-left-elbow', 'Elbow', ['elbow'], 'left', 39, 151),
  target('back-right-elbow', 'Elbow', ['elbow'], 'right', 141, 151),
  target('back-left-forearm', 'Forearm', ['forearm'], 'left', 31, 185),
  target('back-right-forearm', 'Forearm', ['forearm'], 'right', 149, 185),
  target(
    'back-left-hand',
    'Wrist, hand, and fingers',
    ['wrist', 'hand_fingers'],
    'left',
    23,
    225,
  ),
  target(
    'back-right-hand',
    'Wrist, hand, and fingers',
    ['wrist', 'hand_fingers'],
    'right',
    157,
    225,
  ),
  target(
    'back-spine-pelvis',
    'Mid-back, lower back, and pelvis',
    ['thoracic_spine', 'lumbar_spine', 'pelvis_si_area'],
    'central',
    90,
    170,
  ),
  target(
    'back-left-hip-thigh',
    'Hip, glutes, and back thigh',
    ['hip_side', 'hip_deep_rotation', 'glutes', 'hamstrings'],
    'left',
    69,
    240,
  ),
  target(
    'back-right-hip-thigh',
    'Hip, glutes, and back thigh',
    ['hip_side', 'hip_deep_rotation', 'glutes', 'hamstrings'],
    'right',
    111,
    240,
  ),
  target('back-left-knee', 'Knee', ['knee'], 'left', 66, 297),
  target('back-right-knee', 'Knee', ['knee'], 'right', 114, 297),
  target(
    'back-left-lower-leg',
    'Calf, ankle, and foot',
    ['calf', 'ankle', 'foot_toes'],
    'left',
    63,
    337,
  ),
  target(
    'back-right-lower-leg',
    'Calf, ankle, and foot',
    ['calf', 'ankle', 'foot_toes'],
    'right',
    117,
    337,
  ),
];

const MAP_WIDTH = 240;
const MAP_HEIGHT = 400;
const PRESS_TARGET_SIZE = 44;

export const bodyMapTargets: Readonly<
  Record<BodyMapView, readonly BodyMapTarget[]>
> = {
  front: FRONT_TARGETS,
  back: BACK_TARGETS,
};

function sidePrefix(side: BodyMapTarget['side']): string {
  return side === 'central' ? '' : `${side === 'left' ? 'Left' : 'Right'} `;
}

function accessibleTargetLabel(
  mapTarget: BodyMapTarget,
  view: BodyMapView,
): string {
  const label =
    mapTarget.side === 'central'
      ? mapTarget.label
      : `${sidePrefix(mapTarget.side)}${mapTarget.label.charAt(0).toLowerCase()}${mapTarget.label.slice(1)}`;
  return `${label}, ${view}`;
}

function targetSelections(
  mapTarget: BodyMapTarget,
  selections: readonly BodyMapSelection[],
): readonly BodyMapSelection[] {
  return selections.filter((selection) => {
    if (!mapTarget.regionSlugs.includes(selection.regionSlug)) return false;
    if (mapTarget.side === 'central') return true;
    return selection.side === mapTarget.side || selection.side === 'bilateral';
  });
}

type AccessibleBodyMapProps = {
  readonly view: BodyMapView;
  readonly selections: readonly BodyMapSelection[];
  readonly onPressTarget: (target: BodyMapTarget) => void;
};

export function AccessibleBodyMap({
  view,
  selections,
  onPressTarget,
}: AccessibleBodyMapProps) {
  const { colors } = useRestoreTheme();
  const leftMarker = view === 'front' ? 'R' : 'L';
  const rightMarker = view === 'front' ? 'L' : 'R';

  return (
    <View style={styles.container}>
      <Text style={[styles.orientationNote, { color: colors.textMuted }]}>
        L and R refer to your body
      </Text>
      <View
        accessible={false}
        importantForAccessibility="no"
        style={styles.map}
      >
        <Svg
          accessibilityElementsHidden
          height={MAP_HEIGHT}
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          viewBox="0 0 180 360"
          width={MAP_WIDTH}
        >
          <Circle
            cx="90"
            cy="28"
            fill={colors.surfaceMuted}
            r="18"
            stroke={colors.border}
            strokeWidth="1.5"
          />
          <Path
            d="M80 52 C74 58 64 62 52 67 C43 71 39 82 37 96 L28 177 L18 221 C16 229 21 235 27 232 L39 186 L50 118 L55 164 C58 184 64 199 68 211 L63 278 L57 341 C56 350 69 352 72 343 L82 286 L90 226 L98 286 L108 343 C111 352 124 350 123 341 L117 278 L112 211 C116 199 122 184 125 164 L130 118 L141 186 L153 232 C159 235 164 229 162 221 L152 177 L143 96 C141 82 137 71 128 67 C116 62 106 58 100 52 Z"
            fill={colors.surfaceMuted}
            stroke={colors.border}
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
          <Path
            d="M90 53 L90 217"
            opacity={view === 'back' ? 0.38 : 0.2}
            stroke={colors.textMuted}
            strokeDasharray="3 5"
            strokeWidth="1"
          />
        </Svg>

        <Text style={[styles.leftMarker, { color: colors.textMuted }]}>
          {leftMarker}
        </Text>
        <Text style={[styles.rightMarker, { color: colors.textMuted }]}>
          {rightMarker}
        </Text>

        {bodyMapTargets[view].map((mapTarget) => {
          const selected = targetSelections(mapTarget, selections);
          const isSelected = selected.length > 0;
          const selectionSummary = isSelected
            ? `Selected: ${selected.length} ${selected.length === 1 ? 'area' : 'areas'}`
            : 'Not selected';

          return (
            <Pressable
              accessibilityHint={
                mapTarget.regionSlugs.length === 1
                  ? 'Opens side and rating choices for this area.'
                  : 'Shows the body areas available at this location.'
              }
              accessibilityLabel={accessibleTargetLabel(mapTarget, view)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityValue={{ text: selectionSummary }}
              key={mapTarget.id}
              onPress={() => onPressTarget(mapTarget)}
              style={({ pressed }) => [
                styles.target,
                {
                  left: (mapTarget.x / 180) * MAP_WIDTH - PRESS_TARGET_SIZE / 2,
                  opacity: pressed ? 0.68 : 1,
                  top: (mapTarget.y / 360) * MAP_HEIGHT - PRESS_TARGET_SIZE / 2,
                },
              ]}
            >
              <View
                style={[
                  styles.targetMarker,
                  {
                    backgroundColor: isSelected
                      ? colors.accent
                      : colors.surface,
                    borderColor: isSelected ? colors.accent : colors.textMuted,
                  },
                ]}
              >
                <Text
                  maxFontSizeMultiplier={1}
                  style={[
                    styles.targetCheck,
                    {
                      color: isSelected ? colors.accentText : colors.textMuted,
                    },
                  ]}
                >
                  {isSelected ? '✓' : ''}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  orientationNote: {
    fontSize: typography.caption,
    lineHeight: 19,
  },
  map: {
    height: MAP_HEIGHT,
    position: 'relative',
    width: MAP_WIDTH,
  },
  target: {
    alignItems: 'center',
    height: PRESS_TARGET_SIZE,
    justifyContent: 'center',
    position: 'absolute',
    width: PRESS_TARGET_SIZE,
  },
  targetMarker: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  targetCheck: {
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 16,
    textAlign: 'center',
  },
  leftMarker: {
    fontSize: typography.caption,
    fontWeight: '800',
    left: 1,
    position: 'absolute',
    top: 70,
  },
  rightMarker: {
    fontSize: typography.caption,
    fontWeight: '800',
    position: 'absolute',
    right: 1,
    top: 70,
  },
});
