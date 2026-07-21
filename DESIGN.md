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

## Layout

Two surfaces, one token system (dual-surface, shipyard #2973):

**Tray popup (`main` window, `index.html`).** Fixed 360px width, macOS tray dropdown; dense rows ~34–44px; detail screens push in-place. Unchanged pixel-role — it renders in its own bundle and never loads the workspace-shell stylesheet. Adds only an Open Toolbox affordance (header) and per-row deep-links into the main window (Console rows carry a trailing "open in Toolbox" control alongside the in-popup chevron — two sibling buttons, never nested).

**Main window ("Toolbox", `toolbox` window, `toolbox.html`).** Decorated, resizable, ~1100×720 (min 800×560). Chrome is the *actual* shipyard workspace shell — `@shipyard/workspace-shell`'s `WorkspaceShell` (the Carrier-family chrome), consumed as a `file:` dependency, NOT a hand-rolled frame. Structure:
- Header: navigation-panel toggle (icon-only, `WorkspaceShellPanelToggle`) · Logomark + wordmark · section-scoped search · honest Pilot slot (Pilot is not wired into the Toolbox surface — a quiet "not available here" designed state, never a dead button) · appearance indicator.
- Navigation panel (toggleable, ~240px): the four sections (Fleet / Projects / Services / Console).
- Main region: the active section as **master-detail** — a ~300px master list + a detail pane. The detail pane reuses the existing 13 detail screens (no rescope); Console's Logs entry is a full-height log viewer with a real measure.
- Inspector / utility panels are unused (hidden) — the Toolbox is a two-region (nav + master-detail) workspace.
- Responsiveness is JS-gated (`useMediaQuery`, `max-width: 860px`), structural: below the breakpoint the master-detail folds to a single column (master, then detail-with-back), and the navigation panel collapses via the shell's own toggle.
- Window lifecycle: opens from the tray, closes back to the tray (never quits); the macOS Dock icon appears/disappears with the window (Tauri ActivationPolicy).

**Chrome token bridge.** `WorkspaceShell`'s stylesheet keys off `--eco-*` / `--brand-*` chrome tokens (which fall back to system `Canvas`/`CanvasText`). `src/toolbox/shellTheme.ts` maps the tender palette onto those inputs per mode (`--eco-surface`←bg, `--eco-surface-raised`←bgSoft, `--eco-text`←text, `--eco-border`←border, `--eco-focus`/`--brand-primary`←accent), applied as documentElement custom properties — so the shipyard chrome wears the Harborline palette and One-Accent Rule (selection = blue only). The shell's dark/light is driven by the same `.dark`/`[data-theme]` the ThemeProvider stamps.

- Radius: 8px (`radiusLg`) containers, pill (`radiusFull`) for badges/pills; legacy micro-elements at 2–5px pending reconciliation

## Iconography & Brand

- Interim sun-over-wave mark from the central `brand` repo (named variants vendored at `src/assets/brand/`; mode-aware in Logomark — on-dark white wave / on-light cobalt); badge treatment (white wave on cobalt rounded square) for system chrome — source `src-tauri/icons/source/app-icon-badge.svg`
- Identity cobalt `#06489c` is logo/identity only, never interactive

## Accessibility

WCAG 2.2 AA; every accent/status value annotated with its measured contrast in tokens.ts. Keep annotations current when values change.
