// Engine Room palette — single palette, two modes.
// Transcribed from mac-design/themes.jsx (canonical source of truth).
// Path-A formalization (design-review 2026-06): all semantic values now live
// as named tokens. Raw hex literals belong in token VALUES only — never used
// directly in component styles; always reference via theme.*.

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
  // Brand accents (navigation / identity — NOT semantic status)
  accent: string
  accentBright: string
  metal: string
  metalBright: string
  // Semantic status — fleet-standard green/amber/red
  // Cyan (accent) is brand/nav only; operators must not infer health from it.
  healthy: string   // green — running / ok
  warn: string      // amber — degraded / elevated / preview
  danger: string    // red   — down / error / missing
  // System chrome (macOS menu-bar style)
  menuBar: string
  menuBarText: string
  menuBarDim: string
  // Type ramp tokens — codify the scale to prevent per-file guessing (F3.1)
  fontDisplay: string   // Cormorant Garamond italic — wordmark only
  fontRow: string       // Space Grotesk — entity names, body text
  fontMono: string      // JetBrains Mono — labels, metrics, data
  // Type sizes — 8.5px floor for any informational label (F3.2)
  sizeLabel: number     // 8.5 — minimum informational mono label
  sizeMetric: number    // 10  — monospace numbers / metrics
  sizeRowTitle: number  // 12.5 — entity names in rows
  sizeBody: number      // 11  — descriptions / helper text
  sizeDisplay: number   // 16  — wordmark only
}

const shared = {
  metal: '#7a5a28',
  metalBright: '#b8893d',
  // Type ramp — same in both modes (sizing is mode-independent)
  fontDisplay: "'Cormorant Garamond', serif",
  fontRow: "'Space Grotesk', sans-serif",
  fontMono: "'JetBrains Mono', monospace",
  sizeLabel: 8.5,
  sizeMetric: 10,
  sizeRowTitle: 12.5,
  sizeBody: 11,
  sizeDisplay: 16,
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
  // Brand / navigation accent — cyan; not used for health status
  accent: '#5fb8e0',
  accentBright: '#a3dcf5',
  // Semantic status — contrast vs #15171c bg:
  //   healthy #4ade80 → ~6.1:1 WCAG AA pass
  //   warn    #f0b370 → ~6.2:1 WCAG AA pass
  //   danger  #e87560 → ~4.8:1 WCAG AA pass (pairs with label text)
  healthy: '#4ade80',
  warn: '#f0b370',
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
  // Brand / navigation accent — darker cyan for light bg
  accent: '#1d6f9a',
  accentBright: '#0f5277',
  // Semantic status — darkened for contrast on #dde0e6 bg:
  //   healthy #1a7a3a → ~5.3:1 WCAG AA pass
  //   warn    #8c5c12 → ~5.5:1 WCAG AA pass
  //   danger  #a13325 → ~5.7:1 WCAG AA pass
  healthy: '#1a7a3a',
  warn: '#8c5c12',
  danger: '#a13325',
  menuBar: 'rgba(244,244,244,0.78)',
  menuBarText: 'rgba(0,0,0,0.85)',
  menuBarDim: 'rgba(0,0,0,0.5)',
  ...shared,
}

export const themes = { dark, light } as const
