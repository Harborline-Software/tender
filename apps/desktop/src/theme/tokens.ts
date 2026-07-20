// Harborline product palette — single palette, two modes.
// P2 brand-token migration (public-release review §3): values now come from
// the Harborline product design language rather than the invented Engine Room
// palette. Sources of truth (consumed, not re-invented):
//   - shipyard/packages/ui-react/src/style.css   — Transmedia --color-* tokens
//     (interactive blue #0f62fe light / #7ab8ff dark; danger #b42318 / #ff8a80)
//   - shipyard/_shared/design/tokens/harborline-brand.css — identity --brand-*
//     (beacon-amber #e97c48 — the single live/signal accent; ink #a44c1d family)
// One-Accent Rule: blue = action/selection ONLY; amber = live/signal ONLY;
// semantic health stays on the green/amber/red status set.
// Raw hex literals belong in token VALUES only — never used directly in
// component styles; always reference via theme.*.

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
  // Brand accents (action/selection — NOT semantic status)
  accent: string
  accentBright: string
  // Beacon-amber live/signal accent (identity; NOT interactive, NOT health)
  signal: string
  // Semantic status — fleet-standard green/amber/red
  // Blue (accent) is action/selection only; operators must not infer health from it.
  healthy: string   // green — running / ok
  warn: string      // amber — degraded / elevated / preview
  danger: string    // red   — down / error / missing
  // System chrome (macOS menu-bar style)
  menuBar: string
  menuBarText: string
  menuBarDim: string
  // Type ramp tokens — codify the scale to prevent per-file guessing (F3.1).
  // Standardized on Inter / system-ui to match Carrier
  // (shipyard/apps/carrier/src/index.css); no remote fonts (CSP) and no
  // referenced-but-never-bundled faces.
  fontDisplay: string   // wordmark only
  fontRow: string       // entity names, body text
  fontMono: string      // labels, metrics, data
  // Type sizes — refreshed one step up for readability (2026-07 density pass).
  // The 8.5px floor was legitimately too tight; 10.5 is the new informational
  // floor. Larger sizes only ease the WCAG margins annotated on the colors below.
  sizeLabel: number     // 10.5 — informational mono label (was 8.5)
  sizeMetric: number    // 11   — monospace numbers / metrics (was 10)
  sizeBody: number      // 12.5 — descriptions / helper text (was 11)
  sizeRowTitle: number  // 14   — entity names in rows (was 12.5)
  sizeDisplay: number   // 16   — wordmark only (unchanged; header budget is tight)
  // Spacing scale — index 1..7 = 4/6/8/12/16/20/24 (2026-07 density pass).
  // Replaces per-file hardcoded px so density is tunable in one place.
  // Usage: theme.space[4] = 12. Index 0 is 0.
  space: readonly number[]
  // Tray panel width — widened 360 -> 384 for breathing room (still tray-native).
  panelWidth: number
  // Radius — reconciled to the product scale (--sf-radius-lg / --sf-radius-full)
  radiusLg: number      // 8 — cards / container surfaces
  radiusFull: number    // 999 — pills
}

const shared = {
  // Type ramp — same in both modes (sizing is mode-independent)
  fontDisplay: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  fontRow: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  fontMono: "ui-monospace, 'SF Mono', 'Menlo', 'Cascadia Mono', monospace",
  sizeLabel: 10.5,
  sizeMetric: 11,
  sizeRowTitle: 14,
  sizeBody: 12.5,
  sizeDisplay: 16,
  space: [0, 4, 6, 8, 12, 16, 20, 24] as const,
  panelWidth: 384,
  radiusLg: 8,
  radiusFull: 999,
}

export const dark: Theme = {
  mode: 'dark',
  bg: '#15171c',
  bgSoft: '#1e2128',
  surface: '#1a1d22',
  // Text — effective contrast vs #15171c after alpha blend:
  //   text ~13.5:1 · textDim 0.62 → ~6.0:1 · textMuted 0.55 → ~5.0:1 (AA floor
  //   for the 8.5px label tier; 0.42 measured 3.4:1 and failed — never lower,
  //   and never stack an opacity multiplier on top of these tokens)
  text: '#dde2ea',
  textDim: 'rgba(221,226,234,0.62)',
  textMuted: 'rgba(221,226,234,0.55)',
  border: 'rgba(122,184,255,0.18)',
  shadow: 'rgba(0,0,0,0.7)',
  // Action/selection accent — product interactive blue (dark) #7ab8ff.
  // Contrast vs #15171c bg: accent ~8.7:1, accentBright ~11.2:1 — AA pass.
  accent: '#7ab8ff',
  accentBright: '#a8d0ff',
  // Beacon-amber live/signal — ~6.4:1 vs #15171c, AA pass
  signal: '#e97c48',
  // Semantic status — contrast vs #15171c bg:
  //   healthy #4ade80 → ~6.1:1 WCAG AA pass
  //   warn    #f0b370 → ~6.2:1 WCAG AA pass
  //   danger  #ff8a80 → ~7.9:1 WCAG AA pass (product dark danger)
  healthy: '#4ade80',
  warn: '#f0b370',
  danger: '#ff8a80',
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
  // Text — effective contrast vs #dde0e6 after alpha blend:
  //   text ~14.6:1 · textDim 0.7 → ~5.8:1 · textMuted 0.65 → ~5.0:1 (AA floor;
  //   0.55 measured 3.7:1 and failed — same no-stacked-opacity rule as dark)
  text: '#15171c',
  textDim: 'rgba(21,23,28,0.7)',
  textMuted: 'rgba(21,23,28,0.65)',
  border: 'rgba(21,23,28,0.18)',
  shadow: 'rgba(21,23,28,0.22)',
  // Action/selection accent — product interactive blue #0f62fe.
  // Contrast vs #dde0e6 bg: 3.78:1 — passes AA for non-text UI (3:1); for
  // accent-as-small-text use accentBright #0043ce (~5.9:1, AA text pass).
  accent: '#0f62fe',
  accentBright: '#0043ce',
  // Beacon-amber as ink on the light bg (brand accent-ink family, depth-tuned
  // for this bg) — ~4.8:1, AA pass
  signal: '#9a4719',
  // Semantic status — darkened for contrast on #dde0e6 bg:
  //   healthy #1a7a3a → ~5.3:1 WCAG AA pass
  //   warn    #8c5c12 → ~5.5:1 WCAG AA pass
  //   danger  #b42318 → ~5.0:1 WCAG AA pass (product light danger)
  healthy: '#1a7a3a',
  warn: '#8c5c12',
  danger: '#b42318',
  menuBar: 'rgba(244,244,244,0.78)',
  menuBarText: 'rgba(0,0,0,0.85)',
  menuBarDim: 'rgba(0,0,0,0.5)',
  ...shared,
}

export const themes = { dark, light } as const
