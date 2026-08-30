import { Stack } from 'expo-router';

import { useProfile } from '@/features/onboarding/profile-context';
import { resolveProfileNavigation } from '@/features/onboarding/profile-route-guards';

export function ProfileNavigation() {
  const profileState = useProfile();
  const guards = resolveProfileNavigation(
    profileState.status,
    profileState.profile !== null,
  );

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={guards.loading}>
        <Stack.Screen name="loading" />
      </Stack.Protected>
      <Stack.Protected guard={guards.onboarding}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={guards.application}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="check-in" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="exercise/[exerciseId]" />
        <Stack.Screen name="routine/[routineId]" />
        <Stack.Screen name="session/[routineId]" />
        <Stack.Screen name="developer/generator" />
        <Stack.Screen name="developer/player" />
      </Stack.Protected>
    </Stack>
  );
}
