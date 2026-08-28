import { useColorScheme } from 'react-native';

import { colorTokens, type ColorSchemeName } from './tokens';

export function useRestoreTheme() {
  const scheme: ColorSchemeName =
    useColorScheme() === 'dark' ? 'dark' : 'light';

  return {
    scheme,
    colors: colorTokens[scheme],
  };
}
