# Tender — Implementation Handoff

This package contains everything needed for a local agent (or developer) to
implement **Tender**, a macOS menu-bar application for managing
Harborline services.

## What's in this repo

- `index.html` + `*.jsx` — a working, **interactive** hi-fi prototype built
  in React. Drives the studio preview off `themes.jsx` + `live-preview.jsx`
  + `menu-variants.jsx` + `detail-screens.jsx`. **Use this as the visual
  source of truth.** Open it and click around — every interaction is
  represented.
- `assets/logomark.png` — the locked logomark (PNG, 512×512; waterline +
  beacon mark, CIC ruling 2026-07-03 — supersedes the fleur-de-lis
  described below, see `spec/DESIGN.md`). Don't redraw. Use as-is at
  menu-bar sizes (16/18/22) and hero sizes (64+).
- `spec/` — implementation documentation (this is the contract):
  - [`README.md`](spec/README.md) — how to read this spec
  - [`PRODUCT.md`](spec/PRODUCT.md) — what Tender is, features, user stories
  - [`DESIGN.md`](spec/DESIGN.md) — palette, type, components, motion tokens
  - [`SCREENS.md`](spec/SCREENS.md) — every screen and popover, fully specced
  - [`IMPLEMENTATION.md`](spec/IMPLEMENTATION.md) — tech stack, project
    structure, data shapes, macOS integration

## Locked

- **Platform:** macOS 13+ (Ventura, Sonoma, Sequoia). Menu-bar accessory,
  no Dock icon. Apple Silicon + Intel.
- **Palette:** Engine Room (single palette, dark + light modes — follows
  the system appearance). Tokens in `spec/DESIGN.md`. Do not introduce
  other palettes.
- **Logomark:** `assets/logomark.png` (waterline + beacon mark; the
  steampunk fleur-de-lis this doc originally described is retired
  fleet-wide per CIC ruling 2026-07-03 — see `spec/DESIGN.md`). Used in
  the menu bar accessory icon, panel header, and hero brand plate.
- **Layout:** Telegraph (Variant D in the prototype). Three dial gauges
  for Signal-Bridge / Sunfish / Flight-Deck at the top of the body,
  tabbed navigation (Fleet / Projects / Services), workspace dropdown +
  update icon + gear icon in the panel header.
- **Behaviour:** Panel hangs *down* from the menu-bar icon, anchored to
  its right edge. Closes on focus loss, on Escape, and on second click
  of the menu-bar icon.

## Open questions for the implementer

These are intentionally not specced — flag them with the product owner
before building:

1. **Telemetry source.** What process exposes Signal-Bridge / Sunfish /
   Flight-Deck health? Unix domain socket? Local HTTP loopback?
   Polling rate?
2. **Tailnet integration.** Backed by the Tailscale local API
   (`/var/run/tailscaled.socket`), a custom mesh, or both?
3. **Update channel.** Sparkle or a custom updater? Where do release
   manifests live? Code-signing + notarisation pipeline?
4. **Crew comms backend.** Out of scope for v1, but the screen exists in
   the prototype. Decide whether to ship it disabled or remove the entry.

## Where to start

1. Read `spec/PRODUCT.md` (10 min)
2. Read `spec/DESIGN.md` (15 min)
3. Open `index.html` locally and click through every menu item + tab +
   detail screen (10 min)
4. Read `spec/SCREENS.md` alongside the prototype (30 min)
5. Read `spec/IMPLEMENTATION.md` and confirm the tech stack with the
   product owner (15 min)
