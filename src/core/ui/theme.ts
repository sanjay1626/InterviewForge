import { useColorScheme } from 'react-native';

/**
 * Minimal design tokens. Light/dark aware. Kept framework-light (plain objects)
 * so screens stay declarative and consistent. Touch targets use `spacing` and
 * `hitSlop` values that meet the 44pt accessibility minimum.
 */

const palette = {
  brand: '#3B5BFF',
  brandDark: '#8AA0FF',
  danger: '#D64545',
  success: '#2F855A',
  warning: '#B7791F',
};

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textOnBrand: string;
  brand: string;
  danger: string;
  success: string;
  warning: string;
}

const light: Theme = {
  mode: 'light',
  bg: '#FFFFFF',
  surface: '#F5F6FA',
  surfaceAlt: '#EEF0F6',
  border: '#DADCE3',
  text: '#14161C',
  textMuted: '#5A616E',
  textOnBrand: '#FFFFFF',
  brand: palette.brand,
  danger: palette.danger,
  success: palette.success,
  warning: palette.warning,
};

const dark: Theme = {
  mode: 'dark',
  bg: '#0E1016',
  surface: '#171A22',
  surfaceAlt: '#1F2330',
  border: '#2A2F3C',
  text: '#F3F4F8',
  textMuted: '#9AA1B1',
  textOnBrand: '#0E1016',
  brand: palette.brandDark,
  danger: '#F08A8A',
  success: '#68D391',
  warning: '#ECC94B',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 26,
  xxl: 32,
} as const;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}
