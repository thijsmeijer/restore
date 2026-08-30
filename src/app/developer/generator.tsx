import { Redirect, useRouter } from 'expo-router';

import { developerToolsAvailable } from '@/features/developer/developer-tools';
import { GeneratorDiagnosticsScreen } from '@/features/developer/generator-diagnostics-screen';

export default function GeneratorDiagnosticsRoute() {
  const router = useRouter();
  if (!developerToolsAvailable(__DEV__)) {
    return <Redirect href="/(tabs)/settings" />;
  }

  return <GeneratorDiagnosticsScreen onBack={() => router.back()} />;
}
