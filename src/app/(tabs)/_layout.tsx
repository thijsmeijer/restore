import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { useRestoreTheme } from '@/design-system/use-theme';

type TabIconProps = {
  color: ColorValue;
  name: SymbolViewProps['name'];
};

function TabIcon({ color, name }: TabIconProps) {
  return <SymbolView name={name} size={24} tintColor={color} />;
}

export default function TabLayout() {
  const { colors } = useRestoreTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} name="sun.max.fill" />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} name="books.vertical.fill" />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} name="chart.xyaxis.line" />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color }) => <TabIcon color={color} name="calendar" />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} name="gearshape.fill" />
          ),
        }}
      />
    </Tabs>
  );
}
