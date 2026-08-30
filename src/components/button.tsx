import {
  Pressable,
  StyleSheet,
  type StyleProp,
  Text,
  type ViewStyle,
} from 'react-native';

import { radius, spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  accessibilityHint?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'destructive';
  containerStyle?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  accessibilityHint,
  disabled = false,
  variant = 'primary',
  containerStyle,
}: ButtonProps) {
  const { colors } = useRestoreTheme();

  const backgroundColor = disabled
    ? colors.surfaceMuted
    : variant === 'secondary'
      ? colors.surface
      : variant === 'destructive'
        ? colors.danger
        : colors.accent;
  const foregroundColor = disabled
    ? colors.textMuted
    : variant === 'secondary'
      ? colors.accent
      : colors.accentText;
  const borderColor = disabled
    ? colors.border
    : variant === 'secondary'
      ? colors.accent
      : backgroundColor;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      {...(accessibilityHint ? { accessibilityHint } : {})}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor:
            pressed && !disabled && variant === 'primary'
              ? colors.accentPressed
              : backgroundColor,
          borderColor,
          opacity: pressed && !disabled && variant !== 'primary' ? 0.82 : 1,
        },
        containerStyle,
      ]}
    >
      <Text style={[styles.label, { color: foregroundColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  label: {
    fontSize: typography.body,
    fontWeight: '700',
  },
});
