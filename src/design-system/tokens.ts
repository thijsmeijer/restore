export const colorTokens = {
  light: {
    background: '#F4F6F2',
    surface: '#FFFFFF',
    surfaceMuted: '#E8ECE6',
    text: '#152019',
    textMuted: '#5B675F',
    accent: '#2F6B4F',
    accentMuted: '#DDEEE4',
    accentPressed: '#24543E',
    accentText: '#FFFFFF',
    border: '#D7DED8',
    danger: '#A13A3A',
    dangerSurface: '#F9E7E7',
    scrim: 'rgba(0, 0, 0, 0.52)',
    track: '#C6D0C8',
  },
  dark: {
    background: '#0D120F',
    surface: '#171E1A',
    surfaceMuted: '#222C26',
    text: '#F2F7F3',
    textMuted: '#AAB6AE',
    accent: '#76BE98',
    accentMuted: '#193B2A',
    accentPressed: '#5EA77F',
    accentText: '#0B1A11',
    border: '#344139',
    danger: '#F08B8B',
    dangerSurface: '#3D2323',
    scrim: 'rgba(0, 0, 0, 0.68)',
    track: '#47554C',
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
