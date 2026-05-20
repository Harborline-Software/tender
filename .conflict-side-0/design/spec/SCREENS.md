# Tender · Screens

Every user-facing surface in Tender, fully specified. Pair this with the
prototype at `/index.html` — every screen here is implemented there as a
React component you can inspect.

For palette tokens (`accent`, `bg`, `metal`, etc.) see `DESIGN.md`.

---

## Surface inventory

| ID | Surface | Reachable from |
|---|---|---|
| `main` | Menu panel (Telegraph layout) | Clicking the Tender menu-bar status item |
| `popover/workspace` | Connected Devices popover | Workspace dropdown in header |
| `popover/gear` | Settings popover | Gear icon in header |
| `signal-bridge` | Signal-Bridge detail | Fleet tab → gauge / row |
| `sunfish` | Sunfish detail | Fleet tab → gauge / row |
| `flight-deck` | Flight-Deck detail | Fleet tab → gauge / row |
| `engine-room` | Local Node diagnostics | Services tab → any row, gear → Collect logs |
| `dock-settings` | Settings (toggles + routes) | Gear → Appearance & behavior |
| `dry-dock` | Shutdown confirmation | Gear → Dry Dock |
| `release-notes` | Pending updates | Update icon in header |
| (deferred) `services-grid` | Aggregate dock view | not wired in v1 menu |
| (deferred) `fiber-traces` | Live trace tail | not wired in v1 menu |
| (deferred) `crew-comms` | Crew roster + comms | not wired in v1 menu |
| (deferred) `refit-yard` | Per-update install screen | not wired in v1 menu |

The four deferred screens have prototype implementations but are not
reachable from the v1 menu. Leave the components in the codebase as
unwired routes — they'll be exposed in v1.x.

---

## `main` — Menu panel (Telegraph)

The default surface when the user clicks the menu-bar status item.
The panel hangs *down* from below the icon, anchored to its right edge.

**Width:** 360 px
**Height:** depends on active tab; the menu shrinks to fit content (no
internal scroll for v1 — content is sized to fit common cases).

### Header (top ~52 px)

Left → right, gap 8 px, padding `11px 10px 11px 12px`:

1. **Logomark** — `<img src="assets/fleur-mark.png">` in a 26 × 26
   rounded-5 container. Box shadow `0 2px 8px {shadow}, 0 0 10px {accent}33`.
2. **Wordmark** — "Tender" in Cormorant italic 600, 16 px.
3. **Spacer** (flex: 1)
4. **Workspace dropdown button** — cyan-tinted pill with:
   - 5 × 5 pulsing cyan dot (with `0 0 8px {a}88` glow)
   - Current device label (e.g. `Local`) in JetBrains Mono 10 px
   - 8 × 8 chevron-down
   - Click → opens `popover/workspace`
5. **Update icon** (conditional — only when updates pending) — 26 × 26
   button with a download-arrow SVG in `metal` color and a small brass
   pip in the corner. Click → navigate to `release-notes`.
6. **Gear icon** — 26 × 26 button with a small gear SVG in `textDim`.
   Click → opens `popover/gear`.

The header has a `FiberDivider` (strong) directly below it.

### Tab strip (~38 px)

Three equal-width buttons: `Fleet`, `Projects`, `Services`. Active tab:
weight 600, color `text`, with a 2 px cyan glowing underline at the
bottom (positioned `left: 22%, right: 22%`).

Clicking a tab swaps the content below. Closes any open popover.

`FiberDivider` (strong) below the tab strip.

### Body — Fleet tab (default)

Two sections, stacked:

**A. Telegraph gauges row** (padded 14 px / 12 px, gap 8 px, justified
space-around). Three gauge cards, each:

| Gauge | label | value/max | sub | reading | bottom | navigates to | update pip |
|---|---|---|---|---|---|---|---|
| Signal-Bridge | LINK | 68/100 | MB/S | "12.3" | "Signal-Bridge" | `signal-bridge` | yes (brass) |
| Sunfish | TASKS | 7/10 | ACTIVE | "7" | "Sunfish" | `sunfish` | yes (brass) |
| Flight-Deck | AIRBORNE | 7/7 | OF 7 | "7/7" | "Flight-Deck" | `flight-deck` | no |

Each gauge is the `Dial` component (see DESIGN.md). The update pip sits
in the top-right corner with a brass color and bg-bordered glow.
Hovering a gauge tints its container `{accent}10`. Click → navigate.

**B. Installed tools list**

Section header: `↳ INSTALLED · 3 TOOLS` (mono, muted, letterspaced)

Three `ConsoleRow`s:

| name | sub-label | meter | active | badge |
|---|---|---|---|---|
| Signal-Bridge | `v2.3.1 · running` | `link healthy` | yes | `↑1` brass |
| Sunfish | `v1.8.4 · running` | `7 tasks` | yes | `↑1` brass |
| Flight-Deck | `v3.0.0 · running` | `7/7 airborne` | yes | (none) |

Rows separated by dim FiberDividers. Click → same detail screen as the
gauge above.

### Body — Projects tab

Section header: `↳ 5 PROJECTS · 3 ACTIVE` (left), `+ new` (right, cyan,
clickable — will open a new-project dialog when wired).

Five `ConsoleRow`s (indicator `grid`):

| name | sub-label | meter | active |
|---|---|---|---|
| harbor-east | `~/Code/harbor-east` | `ACTIVE` | yes |
| sunfish-indexer | `~/Code/sunfish-idx` | `ACTIVE` | yes |
| flight-deck-control | `~/Code/flight-deck` | `ACTIVE` | yes |
| tender-helm | `~/Code/tender` | `PAUSED` | no |
| old-sloop-prototype | `~/Code/old-sloop` | `ARCHIVED` | no |

Rows separated by dim FiberDividers. Click currently is a no-op — wire
to "Open in editor" or similar later.

### Body — Services tab

Section header: `↳ 8 SERVICES · THIS NODE` (left), `all healthy`
(right, cyan).

Eight `ConsoleRow`s (indicator `cpu`):

| name | sub-label | active (harborline-*) |
|---|---|---|
| harborline-router | `cpu 0.4% · mem 142 MB` | yes |
| harborline-fiber-relay | `cpu 0.3% · mem 88 MB` | yes |
| harborline-update-agent | `cpu 0.0% · mem 24 MB` | yes |
| postgres | `cpu 1.2% · mem 512 MB` | no |
| redis-server | `cpu 0.1% · mem 48 MB` | no |
| docker-daemon | `cpu 2.1% · mem 380 MB` | no |
| localhost-proxy | `cpu 0.0% · mem 12 MB` | no |
| mDNSResponder | `cpu 0.1% · mem 18 MB` | no |

Rows separated by dim FiberDividers. Click → `engine-room` detail.

---

## `popover/workspace` — Connected Devices

Positioned absolute: `right: 78px, top: 48px` from the menu's root.
Width 268 px.

### Header strip

Padded 8/12 px. Two-line label:
- Left: `CONNECTED DEVICES` (mono caps, `textMuted`)
- Right: `4 ONLINE` (cyan)

Bordered bottom with `border`.

### Device rows

Five rows, each padded 8/12 px, separated by 1 px `border` lines:

| host | this? | server? | os | status | sub |
|---|---|---|---|---|---|
| steamtide-w11 | **THIS** badge | — | WIN | online (cyan) | `100.74.12.1 · WIN` |
| harbor-mac-air | — | — | MAC | online (cyan) | `100.74.12.4 · MAC` |
| harbor-prod-01 | — | **SRV** badge | LNX | online (cyan) | `100.74.12.7 · LNX` |
| harbor-test-02 | — | **SRV** badge | LNX | idle (brass) | `100.74.12.8 · LNX` |
| old-sloop-rig | — | — | LNX | offline (dim, muted) | `last seen 2h ago` |

Layout per row: status dot (left, 7 × 7, glow when online), host + badges
(flex 1), OS pill on the right (suppressed for offline rows).

Active device's row has `background: {a}1a` baseline. Hover applies the
same on inactive rows.

Click → updates the dropdown button's label to the chosen host, closes
the popover. **Exception:** "Manage devices…" (see below) does not change
the active selection.

### Manage footer row

Trailing row: small gear icon + "Manage devices…" + arrow indicator
(`↗`). Color is `textDim`. When wired in v1.x, navigate to a device
management screen.

---

## `popover/gear` — Settings menu

Positioned absolute: `right: 10px, top: 48px`. Width 220 px.

Eight items, each a clickable row, separated by hairline `border` lines:

| id | label | tone | navigates to |
|---|---|---|---|
| about | About Tender | normal | `about` |
| faq | FAQ | normal | `faq` |
| plugins | Plugins | normal | `plugins` |
| proxy | Proxy settings | normal | `proxy` |
| appearance | Appearance & behavior | normal | `dock-settings` |
| account | Account · Log out | muted | `account` |
| logs | Collect logs & diagnostics | normal | `engine-room` |
| dry-dock | Dry Dock (shutdown) | **danger** | `dry-dock` |

Hover applies `{a}1a` background (or `{danger}1a` for the Dry Dock row).

---

## `signal-bridge` — Detail

Header (using the shared `DetailHeader` component):
- Back arrow (left)
- Title: "Signal-Bridge Linkage"
- Sub: `Fiber-routed services · 3 links`
- Badge (right): `HEALTHY` status pill (cyan)

Body, top → bottom:

1. **Throughput hero** (padded 12/14 px)
   - Row label "Throughput · 5 min" + big value `12.3 MB/S` (mono, 16 px,
     `accentBright` with cyan glow)
   - 296 × 56 sparkline of last 30 samples (data shape: number[] of MB/s)

2. **Active links** section (dim fiber divider above)
   - Label `↳ ACTIVE FIBER LINKS`
   - Three rows, each: port indicator (active) + hostname + sub
     `↑ {up} mb/s ↓ {down} mb/s` (mono).

3. **Action footer**: `View Logs` (secondary) | `Restart Link` (primary)

---

## `sunfish` — Detail

Header: "Sunfish Operations", sub `7 active · 12 queued`, `RUNNING` pill.

Body:

1. **Summary metrics row** (3 columns)
   - `TASKS/MIN` → `↑ 38` (mono 18, accent glow)
   - `ERRORS` → `0`
   - `QUEUE` → `12`

2. **Task list** — 5 rows. Each: name (mono 10) + status (right, mono 9,
   uppercase: `RUNNING` cyan or `QUEUED` muted). Below the row text, a
   2 px progress bar at the percent specified.

3. **Action footer**: `Pause All` (secondary) | `Open Workspace` (primary)

---

## `flight-deck` — Detail

Header: "Flight-Deck Control", sub `7 of 7 workers airborne`,
`AIRBORNE` pill.

Body:

1. **Worker grid** — `grid-template-columns: repeat(4, 1fr)`, gap 6 px,
   padded 12/14 px. Eight cells (7 workers + 1 spare). Each worker cell:
   - Header `GPU·{id}` (mono 8)
   - Big utilization `{util}%` (mono 13, `accentBright` with glow)
   - 1.5 px progress bar at `{util}%`
   - Temperature `{temp}°C` — color amber if > 75°C, else muted.
   - Spare cell: dashed border, label `SPARE` in mono caps.

2. **Action footer**: `Emergency Stop` (secondary, danger styling) |
   `Open Dashboard` (primary)

---

## `engine-room` — Local Node diagnostics

Header: "Engine Room", sub `Local node · steamtide-w11`, `HEALTHY` pill.

Body:

1. **Four meter bars** stacked (CPU, Memory, Disk, Network). Each shows
   value/max with unit and a glowing fill bar.
2. **Top processes** — label `↳ TOP PROCESSES`, then 5 rows: name (mono),
   cpu% (right, accent, 36 px column), memory (right, dim, 44 px column).
3. **Action footer**: `Restart Tender` (secondary) | `Full Diagnostics`
   (primary)

---

## `dock-settings` — Appearance & behavior

Header: "Dock Settings", sub `6 routes wired · MK VII`, `SAVED` pill.

Body:

1. Label `↳ WIRING`
2. Five toggle rows:
   - Auto-start with Windows (on)
   - Notifications · sound (on)
   - Notifications · banner (off)
   - Pulse animations (on)
   - Telemetry to Harborline (off)

   Each row: name (left), toggle switch (right). See DESIGN.md for switch.

3. Two data lines (dim divider above):
   - `THEME` → `Engine Room · dark`
   - `ROUTE COUNT` → `6`

4. **Action footer**: `Reset` (secondary) | `Edit Routes` (primary)

---

## `dry-dock` — Shutdown confirmation

Header: "Dry Dock", sub `Graceful shutdown · confirm`, `STANDBY` pill
(danger-toned).

Body:

1. **Warning block** (padded 12 px, background `{danger}10`):
   - Triangle warning icon in `danger`
   - Body text: "Stops Tender and all wired Harborline services on this
     node. Logs and state are preserved."

2. **Will stop** section (dim divider above):
   - Label `↳ WILL STOP`
   - Five rows, each: small `danger` dot + service name (mono):
     - Signal-Bridge Linkage
     - Sunfish Operations
     - Flight-Deck Control · 7 workers
     - Fiber trace collector
     - Tender helm process

3. **Action footer** (danger-styled primary):
   - `Cancel` (secondary) | `Confirm Shutdown` (primary, red glow)

---

## `release-notes` — Pending updates

Header: "Release Notes", sub `3 updates · 49 MB total`, `↑ 3` pill (brass).

The top fiber divider is `metal`-tinted (brass) instead of cyan to
signal "updates" context.

Body — for each release (3 total):

- Row 1: service name (left, `text`) + version arrow + size (right, mono):
  `v2.3.1 → v2.4.0 · 14.2 MB`. The arrow is brass; the new version is
  `accentBright`.
- Notes (3–4 each): small kind badge on the left (NEW / FIX / PERF), then
  the note text. Kind colors:
  - NEW: `accent` (cyan)
  - FIX: `accentBright` (lighter cyan)
  - PERF: `metalBright` (brass)

**Action footer**: `Defer` (secondary) | `Install All (49 MB)` (primary)

The 3 releases (sample content from the prototype):

| Service | From → To | Size |
|---|---|---|
| Signal-Bridge | v2.3.1 → v2.4.0 | 14.2 MB |
| Sunfish | v1.8.4 → v1.9.0 | 28.7 MB |
| Tender | v7.0.2 → v7.1.0 | 6.1 MB |

When the user clicks "Install All", show download progress per service
inline (replace each row's notes with a progress bar) and complete each
in sequence. After all install, dismiss to the main menu with a brief
"Updates installed" toast.

---

## States not yet specced (open for v1)

- **Loading / first-paint** — when the panel first opens, telemetry
  may not have arrived yet. Show muted placeholder values, no
  spinner. Replace inline as data arrives.
- **Service degraded / offline** — what does a gauge look like when its
  service is down? Suggested: dial fades to `textMuted`, value reads
  `—`, the update pip becomes a `!` danger pip.
- **Network unreachable** — if the tailnet is unreachable, the
  workspace dropdown shows `(offline)` and disables the popover
  (greys out the button).
- **Update download failure** — Release Notes screen should show a
  per-release error state with a `Retry` action.

Flag these with the product owner before building. They are visible in
real use and need design decisions.
