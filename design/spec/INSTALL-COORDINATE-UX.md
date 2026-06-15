# Tender — Install / Coordinate UX

**Status:** Design note (Draft) · **Author:** Engineer (Tender track) · **Date:** 2026-06-15
**Companion to:** `APP-CATALOG-CONFIG.md` (the config model this UX renders).
**Decided:** 2026-06-15 CIC design session (all five forks below resolved).

> The existing `SCREENS.md` / `PRODUCT.md` describe Tender as a **monitor** of an already-installed,
> running fleet — with fake data (`Sunfish v1.8.4 · running`, etc.). This note evolves it into the
> **installer + coordinator + config manager** it now is, *without* losing the Telegraph aesthetic or the
> terse nautical voice. It supersedes the "monitor a running fleet" framing where they conflict.

---

## 1. The shift

Tender was designed to *watch* three installed tools. It now **installs, configures, and coordinates** a
fleet that may be partly or not installed. So the UI must represent **state** honestly (not-installed,
installable, installed, running, running-but-backend-gated) instead of fabricating "running" everywhere.
Honest detection (C1) already makes the data real (`installed:false`, `version:"unknown"`); the UI must
stop pretending otherwise.

## 2. Decisions (CIC 2026-06-15)

1. **One Fleet surface, state-driven.** The Fleet tab **absorbs the catalog** — every app appears there in
   whatever state it's in. No separate "Manage Apps / Shipyard" screen.
2. **Light "Outfitting" first-run** — a single calm screen (hardware probe → recommended profile → Continue),
   then drop into Fleet with Commission affordances. Not a multi-step wizard (honors the "calm, terse" voice).
3. **Dev/end-user mode** — a gear → Settings toggle **plus a subtle "DEV" pill** in the panel header so the
   posture is always visible.
4. **Naming = Commission.** Install = **Commission**; upgrade = **Refit** (existing); uninstall =
   **Decommission** (the natural nautical pair). A ship is commissioned, refitted, decommissioned.
5. **Invest in install/config + honest states now.** Keep the rich gauges, but let them show
   empty / installable / gated gracefully until apps are real.

## 3. The per-app state model (drives the Fleet tab)

| State | Gauge / row treatment | Primary action |
|---|---|---|
| `planned` (Bridge — no package) | dimmed, "Planned · no package" | — (honest, no action) |
| `available` (dev: `packaged`) | dimmed dial, no reading | **Commission** |
| `installed` (stopped) | dial at rest + recorded version | **Launch** |
| `running` | live dial + live meter (the existing rich treatment) | open detail |
| `running · gated` (backend caveat) | live, **plus a caveat pill** | open detail + caveat |

State comes from the catalog `availability` × install-state × live detection (`APP-CATALOG-CONFIG.md` §8).
End-user mode hides anything below `released`; dev mode shows `packaged`+ with caveats surfaced.

## 4. Surfaces

### 4.1 Fleet tab (state-driven; one surface)
```
┌────────────────────────────────────────────┐
│ ✦ Tender      ◉ Local ▾    DEV      ⚙       │   header + subtle DEV pill (mode 3)
├────────────────────────────────────────────┤
│    Fleet         Projects        Services    │
├────────────────────────────────────────────┤
│    ╭───────╮   ╭───────╮   ╭───────╮         │   gauges dim when not running;
│    │   ◌   │   │   ◌   │   │   ◌   │         │   no fabricated readings
│    │SUNFISH│   │FLIGHT │   │BRIDGE │         │
│    │   —   │   │   —   │   │planned│         │
│    ╰───────╯   ╰───────╯   ╰───────╯         │
│  ↳ FLEET · 2 AVAILABLE · 1 PLANNED           │
│  ┌──────────────────────────────────────────┐
│  │ Sunfish        packaged · not installed   │
│  │ ! backend gated (signing)    [ Commission ]│
│  ├──────────────────────────────────────────┤
│  │ Flight-Deck    packaged · not installed   │
│  │ ! backend gated (book-server)[ Commission ]│
│  ├──────────────────────────────────────────┤
│  │ Signal-Bridge      planned · no package    │
│  └──────────────────────────────────────────┘
│  + Commission from path…   (dev-mode only)    │
└────────────────────────────────────────────┘
```
Once an app is commissioned + running, its row flips to the live gauge + meter (the existing rich
treatment) — same surface, later state. The `+ Commission from path…` affordance is dev-mode only.

### 4.2 Outfitting (light first-run)
```
┌────────────────────────────────────────────┐
│ ‹  Outfitting          Probed · MK VII       │
├────────────────────────────────────────────┤
│   This Mac                                   │
│   16 GB · 8 cores · 460 GB free · x64        │   ← probe (C0)
│   Recommended:   CAPABLE                     │   ← recommend_profile (C1)
│   persistence: SQLite  (Postgres available)  │
│   [Minimum] [Standard] (Capable) [Max]       │   opt up/down (D3 within hw support)
│   Next — commission your tools.   [Continue →]│
└────────────────────────────────────────────┘
```
Shown once on a fresh box (no install-config). Re-reachable later (Engine Room or a settings route).
`keyingComplete:false` ⇒ show "couldn't read all signals — recommending the safe minimum" (H2 honesty).

### 4.3 Commission (install) — reuses the Refit Yard progress pattern
```
   Commissioning Sunfish…
   Fetch local build ······ done
   Place bundle ··········· done
   Record install ········· done
   Launch (hand-off) ······ …
   ! Backend gated: unsigned build — shell only
```
Maps to `install_app_local` → `launch_app` (built, C3). Per-step progress; surface the manifest `caveats`
honestly on completion. **Refit** (upgrade) and **Decommission** (uninstall) follow the same surface.

### 4.4 Settings (gear → Dock Settings): Mode + autostart
```
   ↳ MODE        ( Dev )  End-User
   Dev installs packaged builds + shows caveats.
   ↳ WIRING
   Start at login ···················· [on]    ← relabel from "with Windows"; LaunchAgent (built)
   Notifications · sound ············· [on]
   Telemetry to Harborline ·········· [off]    ← local-only/off (the BLOCKED axis stays local-first)
```
The Mode toggle drives `tender-settings.json` (CFG-2). `Start at login` binds the `set_autostart`/
`get_autostart` commands (already built). The header **DEV pill** mirrors the Mode state.

## 5. Honest states (fills the SCREENS.md "not yet specced" gaps)

- **Not installed** — dimmed dial, value `—`, a Commission action. Never a fake version.
- **Backend gated** — running shell + a `!` caveat pill (e.g. "signing", "book-server"); detail shows the
  caveat summary (the routed findings, surfaced).
- **Planned** — visible, labeled "Planned · no package", no action (dev); hidden (end-user).
- **Empty fleet** (fresh box) — Fleet shows the Outfitting prompt, not three fake rows.
- **Version unknown** — render `unknown`/`—`, not `v1.8.4`.

## 6. Build split

- **Engineer (me):** the backend — the catalog + generic detection (CFG-1), settings + mode (CFG-2), and
  the commands the screens call (`recommend_profile`, `install_app_local`, `launch_app`, `set_autostart`,
  `get_catalog`, …). Most are built; CFG-1 is next.
- **FED:** the screens — Outfitting, the state-driven Fleet rows + Commission affordances, the Commission/
  Refit progress, the Mode toggle + DEV pill. Pairs with the profile-selection UI already in flight.

## 7. Naming system (keep it consistent)

| Concept | Term |
|---|---|
| install | **Commission** |
| upgrade | **Refit** (existing) |
| uninstall | **Decommission** |
| first-run setup | **Outfitting** |
| graceful shutdown | **Dry Dock** (existing) |
| diagnostics | **Engine Room** (existing) |
| settings | **Dock Settings** (existing) |

Voice unchanged: competent, terse, slightly nautical-industrial; no marketing tone, no emoji.

## 8. Cohort linkage

- **CFG-1 (catalog + generic detection)** — makes the Fleet tab state-driven instead of hardcoded; the
  prerequisite for everything in §3–§4. *Next build.*
- **CFG-2 (settings + dev/end-user mode)** — powers the Mode toggle + DEV pill + the honest gating.
- **CFG-3 (FED screens)** — Outfitting, state-driven Fleet, Commission/Refit progress, Mode/DEV UI.
