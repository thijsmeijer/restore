export const colorTokens = {
  light: {
    background: '#F4F5FA',
    surface: '#FFFFFF',
    surfaceMuted: '#E9EBF4',
    text: '#15182A',
    textMuted: '#5E6379',
    accent: '#4F5FC7',
    accentMuted: '#E3E7FF',
    accentPressed: '#3D4AA5',
    accentText: '#FFFFFF',
    border: '#D7DAE7',
    danger: '#A9364A',
    dangerSurface: '#FBEAEC',
    scrim: 'rgba(0, 0, 0, 0.52)',
    track: '#C8CCDB',
  },
  dark: {
    background: '#080B16',
    surface: '#111626',
    surfaceMuted: '#1A2035',
    text: '#F5F7FF',
    textMuted: '#ADB4CC',
    accent: '#9AA8FF',
    accentMuted: '#252D57',
    accentPressed: '#B2BCFF',
    accentText: '#0B1020',
    border: '#2C3552',
    danger: '#FF8B98',
    dangerSurface: '#3A1E29',
    scrim: 'rgba(0, 0, 0, 0.68)',
    track: '#39425F',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const typography = {
  display: 34,
  title: 24,
  body: 17,
  label: 15,
  caption: 13,
} as const;

export type ColorSchemeName = keyof typeof colorTokens;
export type ThemeColors = (typeof colorTokens)[ColorSchemeName];
