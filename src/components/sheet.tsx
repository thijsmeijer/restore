import { useRef } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { radius, spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';

type SheetProps = {
  visible: boolean;
  title: string;
  children: React.ReactNode;
  onRequestClose: () => void;
  closeLabel?: string;
};

export function Sheet({
  visible,
  title,
  children,
  onRequestClose,
  closeLabel = 'Close',
}: SheetProps) {
  const { colors } = useRestoreTheme();
  const titleRef = useRef<Text>(null);

  const focusTitle = () => {
    const node = findNodeHandle(titleRef.current);
    if (node !== null) AccessibilityInfo.setAccessibilityFocus(node);
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={onRequestClose}
      onShow={focusTitle}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityElementsHidden
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          onPress={onRequestClose}
          style={[styles.backdrop, { backgroundColor: colors.scrim }]}
        />
        <SafeAreaView
          accessibilityViewIsModal
          edges={['bottom', 'left', 'right']}
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.header}>
            <Text
              accessibilityRole="header"
              ref={titleRef}
              style={[styles.title, { color: colors.text }]}
            >
              {title}
            </Text>
            <Pressable
              accessibilityLabel={closeLabel}
              accessibilityRole="button"
              onPress={onRequestClose}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: pressed
                    ? colors.surfaceMuted
                    : 'transparent',
                },
              ]}
            >
              <Text style={[styles.closeLabel, { color: colors.accent }]}>
                {closeLabel}
              </Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: '88%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    fontSize: typography.title,
    fontWeight: '700',
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: spacing.sm,
  },
  closeLabel: {
    fontSize: typography.label,
    fontWeight: '700',
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
  },
});
