import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { spacing, typography } from '@/design-system/tokens';
import { useRestoreTheme } from '@/design-system/use-theme';

type PlaceholderScreenProps = {
  eyebrow: string;
  title: string;
  cardTitle: string;
  description: string;
};

export function PlaceholderScreen({
  eyebrow,
  title,
  cardTitle,
  description,
}: PlaceholderScreenProps) {
  const { colors } = useRestoreTheme();

  return (
    <Screen testID={`${title.toLowerCase()}-screen`}>
      <View style={styles.heading}>
        <Badge accessibilityLabel={`${eyebrow} status`} label={eyebrow} />
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          {title}
        </Text>
      </View>

      <Card>
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          {cardTitle}
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          {description}
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    gap: spacing.sm,
    paddingTop: spacing.lg,
  },
  title: {
    fontSize: typography.display,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  cardTitle: {
    fontSize: typography.title,
    fontWeight: '700',
  },
  body: {
    fontSize: typography.body,
    lineHeight: 25,
  },
});
