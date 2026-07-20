# Design

Visual system for the Harborline Toolbox (tray app). Source of truth for values: `apps/desktop/src/theme/tokens.ts` (typed `theme.*` object, mirrored as `--color-*`/`--font-*`/`--radius-*` CSS custom properties by ThemeProvider). Values below are the dark mode / light mode pair.

## Theme

Dual-mode, follows macOS appearance (IPC-driven; `.dark`/`.light` class on documentElement, persisted to localStorage). Dark-leaning by usage: a menu-bar utility most often over a dark translucent backdrop. Same token family as Carrier (shipyard `ui-react` Transmedia tokens + `harborline-brand.css` identity layer), tray-native density.

## Color

- Surfaces: bg `#15171c` / `#dde0e6`; bgSoft `#1e2128` / `#c8cdd6`; surface `#1a1d22` / `#d2d6df`
- Text: `#dde2ea` / `#15171c`, with `textDim` (62%/70%) and `textMuted` (42%/55%) alphas
- Interactive accent (action/selection ONLY): `#7ab8ff` / `#0f62fe`; bright variant `#a8d0ff` / `#0043ce` (light-mode accent-as-small-text must use the bright variant — 3.78:1 vs 5.9:1)
- Signal (beacon-amber, live/identity ONLY): `#e97c48` / `#9a4719`
- Status (the ONLY health channel): healthy `#4ade80` / `#1a7a3a`; warn `#f0b370` / `#8c5c12`; danger `#ff8a80` / `#b42318`
- Border: accent-hued 18% alpha (dark) / ink 18% (light)
- One-Accent Rule: blue = action, amber = live/signal, green/amber/red = health. Never crossed.

## Typography

- UI + display: Inter, system-ui fallback stack (matches Carrier; nothing remote — CSP)
- Data/labels: ui-monospace stack (SF Mono et al) — values and metrics only, never ambience
- Scale (px): 8.5 label floor · 10 metric · 11 body · 12.5 row title · 16 display/wordmark

## Components

- StatusPill, MeterBar, Sparkline, Dial, GaugeCard — data primitives, mono numerals
- ConsoleIndicator — lucide-react icons at 11px (radio, layout-grid, waves, cpu, settings, power, container, message-square)
- MenuShell + TabStrip (Fleet / Projects / Services / Console) — 360px tray panel
- Honest-state rows: "not configured" / "unreachable" render as designed guidance states, not errors
- Connected Devices: a read-only tailnet status popover, refreshed on open and every 30 seconds.
  The current-node label scopes local telemetry honestly; peer selection is not offered until
  remote telemetry exists, and detailed node state lives in Sync & Relay.
- Coordination Daemons: compact launchd-backed rows in Console with visible state glyph + label,
  cadence, last-log summary, and local controls. Maintenance-held, armed-but-unloaded, disabled,
  stale/error, and not-configured are first-class states; the UI never equates an active marker with
  a running job. Stop establishes a persistent hold. Start is confirmation-based and native-gated.
- Fleet Dashboard: an optional action in Coordination Daemons, persisted through Dock Settings;
  a session environment value is the fallback. No fleet-private hostname is embedded in the app,
  and the absent configuration has explicit guidance.

## Layout

- Fixed 360px width, macOS tray dropdown; dense rows ~34–44px; detail screens push in-place
- Radius: 8px (`radiusLg`) containers, pill (`radiusFull`) for badges/pills; legacy micro-elements at 2–5px pending reconciliation

## Iconography & Brand

- Interim sun-over-wave mark from the central `brand` repo (named variants vendored at `src/assets/brand/`; mode-aware in Logomark — on-dark white wave / on-light cobalt); badge treatment (white wave on cobalt rounded square) for system chrome — source `src-tauri/icons/source/app-icon-badge.svg`
- Identity cobalt `#06489c` is logo/identity only, never interactive

## Accessibility

WCAG 2.2 AA; every accent/status value annotated with its measured contrast in tokens.ts. Keep annotations current when values change.
Daemon state uses glyph + text + semantic color together, lifecycle actions remain keyboard-native
buttons with a 28px desktop target, action results use live status/alert regions, and no animation was
added (the surface therefore honors reduced-motion without a fallback branch).
