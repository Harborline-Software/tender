// Engine Room palette — single palette, two modes.
// Transcribed from mac-design/themes.jsx (canonical source of truth).

export interface Theme {
  mode: 'dark' | 'light'
  // Surfaces
  bg: string
  bgSoft: string
  surface: string
  // Text
  text: string
  textDim: string
  textMuted: string
  // Structure
  border: string
  shadow: string
  // Brand accents
  accent: string
  accentBright: string
  metal: string
  metalBright: string
  danger: string
  // System chrome (macOS menu-bar style)
  menuBar: string
  menuBarText: string
  menuBarDim: string
}

const shared = {
  metal: '#7a5a28',
  metalBright: '#b8893d',
}

export const dark: Theme = {
  mode: 'dark',
  bg: '#15171c',
  bgSoft: '#1e2128',
  surface: '#1a1d22',
  text: '#dde2ea',
  textDim: 'rgba(221,226,234,0.62)',
  textMuted: 'rgba(221,226,234,0.42)',
  border: 'rgba(95,184,224,0.18)',
  shadow: 'rgba(0,0,0,0.7)',
  accent: '#5fb8e0',
  accentBright: '#a3dcf5',
  danger: '#e87560',
  menuBar: 'rgba(30,30,32,0.65)',
  menuBarText: 'rgba(255,255,255,0.85)',
  menuBarDim: 'rgba(255,255,255,0.55)',
  ...shared,
}

export const light: Theme = {
  mode: 'light',
  bg: '#dde0e6',
  bgSoft: '#c8cdd6',
  surface: '#d2d6df',
  text: '#15171c',
  textDim: 'rgba(21,23,28,0.7)',
  textMuted: 'rgba(21,23,28,0.55)',
  border: 'rgba(21,23,28,0.18)',
  shadow: 'rgba(21,23,28,0.22)',
  accent: '#1d6f9a',
  accentBright: '#0f5277',
  danger: '#a13325',
  menuBar: 'rgba(244,244,244,0.78)',
  menuBarText: 'rgba(0,0,0,0.85)',
  menuBarDim: 'rgba(0,0,0,0.5)',
  ...shared,
}

export const themes = { dark, light } as const
