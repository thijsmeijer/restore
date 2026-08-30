import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppErrorBoundary } from '@/components/app-error-boundary';
import { RestoreDatabaseProvider } from '@/db/database-provider';
import { colorTokens } from '@/design-system/tokens';
import { ProfileProvider } from '@/features/onboarding/profile-context';
import { ProfileNavigation } from '@/features/onboarding/profile-navigation';

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = colorTokens[scheme];
  const navigationTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <AppErrorBoundary>
      <RestoreDatabaseProvider>
        <SafeAreaProvider>
          <ThemeProvider
            value={{
              ...navigationTheme,
              colors: {
                ...navigationTheme.colors,
                background: colors.background,
                card: colors.surface,
                primary: colors.accent,
                text: colors.text,
                border: colors.border,
              },
            }}
          >
            <ProfileProvider>
              <ProfileNavigation />
            </ProfileProvider>
            <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          </ThemeProvider>
        </SafeAreaProvider>
      </RestoreDatabaseProvider>
    </AppErrorBoundary>
  );
}
