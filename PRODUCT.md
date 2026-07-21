# Product

## Register

product

## Users

Fleet operators (today: Chris; post-release: developers running Harborline apps locally). They live in the macOS menu bar — the Toolbox is glanced at between tasks, not dwelt in. Context: quick health checks, starting/stopping services, commissioning apps, reading logs when something is wrong. Sessions are seconds to a couple of minutes.

## Product Purpose

Tender ("Harborline Toolbox") is a tray-resident control panel for the Harborline fleet: install/commission apps, watch service health, inspect model inventory / GPU residency / paid-compute spend, and reach logs fast. Success = an operator can answer "is everything ok, and if not, what's wrong?" in under five seconds from the menu bar.

## Surfaces (dual-surface architecture)

The Toolbox ships **two surfaces over one Rust core** (shipyard #2973), each sized to its job:

1. **Tray popup** (`index.html`, the `main` window) — the unchanged 360px, undecorated, always-on-top menu-bar panel. The glanceable-truth surface: answer "is everything ok?" in <5s, then dismiss on blur. It gains only an **Open Toolbox** affordance and **row-level deep-links** that hand off to the main window focused on a specific item.
2. **Main window** ("Toolbox", the `toolbox` window) — a decorated, resizable window (~1100×720, min 800×560) for the work that never fit a 360px panel. It wears the **standard shipyard workspace chrome** (`@shipyard/workspace-shell` — the same `WorkspaceShell` family the Carrier app uses: toggleable navigation panel, top bar with search + Pilot slot), and presents all four sections (Fleet / Projects / Services / Console) as **master-detail**, with Console carrying a full-height log viewer. It opens from the tray, and its close button returns to the tray (the app never quits from the window). The macOS Dock icon appears while it is open and disappears when it closes (Tauri ActivationPolicy), standard macOS behavior.

The two surfaces are separate documents/bundles: the popup never inherits the workspace-shell stylesheet, so its pixel-role is preserved by construction. Both consume the same tender theme tokens; the main window bridges those tokens onto the workspace-shell chrome tokens so the shipyard chrome wears the Harborline palette.

## Brand Personality

Calm, honest, seaworthy. The UI never fabricates state (fail-soft "not configured"/"unreachable" over guessed values — this is enforced in the Rust layer and must stay visible in the UI). Same design family as the Carrier app: Harborline product tokens (interactive blue, beacon-amber signal, semantic green/amber/red), Inter/system type, lucide icons — but tray-native: dense, compact, dark-leaning, following the macOS appearance.

## Anti-references

- Hacker-terminal aesthetic: green-on-black, scanlines, mono-everything ops-tool cosplay. Mono type is for data values only, never ambience.
- Web-app chrome transplanted into a native tray (oversized cards, hero metrics, gradients).

## Design Principles

1. **Glanceable truth** — status reads correctly from 2 feet away; semantic color (green/amber/red) is the only health channel; blue is action/selection only; amber is live/signal only (One-Accent Rule).
2. **Honest states first-class** — "not configured", "unreachable", "unknown" are designed states with guidance, never error styling or blank space.
3. **Right surface for the job** — the tray popup stays 360px, information-dense, macOS-tray-native (match Carrier's tokens, not its window chrome). The main window earns the room the popup can't give: it consumes the *actual* shipyard workspace chrome (`WorkspaceShell`), never a hand-rolled window frame, and lays every section out as master-detail rather than a centered 360px panel stretched wide.
4. **Tokens, never literals** — every color/font/radius flows through theme.* (tokens.ts) with WCAG annotations kept current.

## Accessibility & Inclusion

WCAG 2.2 AA. Contrast ratios annotated in tokens.ts for every accent/status value in both modes (existing discipline — keep it). 8.5px minimum label floor already codified. Follows macOS appearance for dark/light. Reduced-motion fallbacks for any added animation.
