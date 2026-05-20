export type ThemeMode = 'dark' | 'light';

export interface Theme {
  mode: ThemeMode;
  // Surfaces
  bg: string;
  bgSoft: string;
  surface: string;
  // Text
  text: string;
  textDim: string;
  textMuted: string;
  // Structure
  border: string;
  shadow: string;
  // Accent (cyan)
  accent: string;
  accentBright: string;
  // Brass
  metal: string;
  metalBright: string;
  // Danger
  danger: string;
}

const DARK: Theme = {
  mode: 'dark',
  bg:          '#15171c',
  bgSoft:      '#1e2128',
  surface:     '#1a1d22',
  text:        '#dde2ea',
  textDim:     'rgba(221,226,234,0.62)',
  textMuted:   'rgba(221,226,234,0.42)',
  border:      'rgba(95,184,224,0.18)',
  shadow:      'rgba(0,0,0,0.7)',
  accent:      '#5fb8e0',
  accentBright:'#a3dcf5',
  metal:       '#7a5a28',
  metalBright: '#b8893d',
  danger:      '#e87560',
};

const LIGHT: Theme = {
  mode: 'light',
  bg:          '#dde0e6',
  bgSoft:      '#c8cdd6',
  surface:     '#d2d6df',
  text:        '#15171c',
  textDim:     'rgba(21,23,28,0.7)',
  textMuted:   'rgba(21,23,28,0.55)',
  border:      'rgba(21,23,28,0.18)',
  shadow:      'rgba(21,23,28,0.22)',
  accent:      '#1d6f9a',
  accentBright:'#0f5277',
  metal:       '#7a5a28',
  metalBright: '#b8893d',
  danger:      '#a13325',
};

export const THEMES: Record<ThemeMode, Theme> = { dark: DARK, light: LIGHT };
