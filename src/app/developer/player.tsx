import { Redirect, useRouter } from 'expo-router';

import { developerToolsAvailable } from '@/features/developer/developer-tools';
import { PlayerPreviewScreen } from '@/features/developer/player-preview-screen';

export default function PlayerPreviewRoute() {
  const router = useRouter();
  if (!developerToolsAvailable(__DEV__)) {
    return <Redirect href="/(tabs)/settings" />;
  }

  return <PlayerPreviewScreen onExit={() => router.back()} />;
}
