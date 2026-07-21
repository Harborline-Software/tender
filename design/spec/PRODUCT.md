# Tender · Product Spec

## What Tender is

Tender is a **tray control app for the Harborline service mesh**, shipping as
a **macOS menu-bar application** and a **Windows notification-area (system
tray) application** from one shared codebase. It surfaces a single control
surface for the Harborline service mesh on the local machine and the devices
on the tailnet. On macOS it lives as a status item in the menu bar (no Dock
icon) and opens as a panel that hangs *down* from the menu-bar icon; on
Windows it lives as a notification-area icon and opens as a panel near the
tray. Either way it surfaces:

- **Fleet** — the three installed Harborline tools (Signal-Bridge, Sunfish,
  Flight-Deck) with live telemetry and per-service detail views
- **Projects** — the user's checked-out projects, surfaced for quick
  switching
- **Services** — the local OS-level services running on the host (so the
  user has visibility without leaving the tray)
- **Connected Devices** — Tailscale-style device picker showing every node
  on the tailnet, with status and connection info
- **Updates** — a brass update icon that appears when releases are pending
  with a full release-notes screen
- **Settings** — a gear-menu popover for app preferences, plugins, proxy,
  account, and shutdown

## Who it's for

A developer running **multiple Harborline services** on a macOS or Windows
workstation, who needs to:

- See at a glance whether their services are healthy
- Switch between local and remote tailnet nodes
- Jump into per-service detail views without opening separate apps
- Install pending updates with confidence about what's changing
- Shut everything down gracefully when ending a session

## Core feature list

### Must-have (v1)

| Feature | Notes |
|---|---|
| Tray status item (the waterline+beacon logomark) | Always present; left-click toggles the panel; menu-bar item on macOS, notification-area icon on Windows |
| Panel header | Logomark, "Tender" wordmark, workspace dropdown, update icon, gear icon |
| Workspace dropdown (Connected Devices) | Tailnet device list, status dots, OS pills, "Manage devices…" footer |
| Update icon (conditional) | Only shows when updates pending; click → Release Notes screen |
| Gear popover | 8 items (About, FAQ, Plugins, Proxy, Appearance, Account/Log out, Collect logs, Dry Dock) |
| Tabs | Fleet · Projects · Services |
| Fleet tab | 3 dial gauges + installed tool rows with version + update pip |
| Projects tab | List of user projects with status |
| Services tab | List of local services (launchd jobs on macOS / relevant daemons on Windows) with cpu/mem |
| Detail screens | Per-service (Signal-Bridge, Sunfish, Flight-Deck), Release Notes, Engine Room diagnostics, Dock Settings, Dry Dock confirmation |
| Dark / Light modes | Engine Room palette, follows the host OS appearance (macOS `NSApp.effectiveAppearance`; Windows theme setting) |
| Graceful shutdown | Dry Dock confirmation screen, preserves logs/state |
| Start at login | Per-user, no elevation; macOS LaunchAgent, Windows via `tauri-plugin-autostart`; Dock Settings reports live state on both |

### v1.x (deferred but specced)

| Feature | Notes |
|---|---|
| Services Grid detail | Aggregated view of all docks/services across the tailnet |
| Fiber Traces detail | Live trace tail of inter-app calls |
| Crew Comms | Crew roster + messaging; out of scope for v1 backend |
| Refit Yard detail | Per-service update manifest with selective install (today the Release Notes screen handles this, but a dedicated Yard with download progress + install confirmation is v1.x) |

### Out of scope

- **Linux** — not targeted for v1. The component layer is portable enough to
  support it later (macOS and Windows already share one Rust core and React
  UI, with platform differences isolated behind a small `platform.rs` seam),
  but Linux tray-host integration is not yet built or verified.
- Cloud sync of preferences
- Actual Harborline service implementations — Tender is the *control
  surface*; the services themselves are separate products
- Windows code-signing / notarization-equivalent (both platforms currently
  ship unsigned; see the root `README.md` Status section)

## User stories

> **As a developer**, when I sit down at my machine, I want to open the
> Tender tray item and see at a glance whether Signal-Bridge,
> Sunfish, and Flight-Deck are healthy — without launching three apps.
> *— Fleet tab, dial gauges, live meters.*

> **As a developer**, when an update is pending, I want a clear, calm
> indicator (not a notification banner) so I can choose when to read the
> notes and install.
> *— Brass update icon in the panel header. Click → Release Notes with
> NEW/FIX/PERF tags.*

> **As a developer working across multiple machines**, I want to see
> which of my tailnet nodes are reachable and switch the active context
> with one click.
> *— Workspace dropdown opens the Connected Devices popover.*

> **As a developer**, when something goes wrong with my local node, I
> want CPU/memory/disk telemetry and a top-process list without opening
> Activity Monitor or Task Manager.
> *— Engine Room detail screen, reachable from the Services tab.*

> **As a developer ending a session**, I want a single graceful shutdown
> that stops everything and preserves my logs.
> *— Gear menu → Dry Dock → confirmation screen → shutdown.*

> **As a Windows operator on a fleet GPU host**, I want the same tray control
> surface as macOS operators get, including a real notification-area icon and
> working start-at-login, instead of Task Scheduler and log files.
> *— Windows tray parity: notification-area icon, `tauri-plugin-autostart`,
> Dock Settings reporting real state.*

## Success criteria for v1

- Panel open-to-first-paint: ≤ 150 ms on Apple Silicon, ≤ 250 ms on Intel or
  a typical Windows desktop GPU host
- Panel is keyboard-navigable (arrow keys, Enter, Escape) — Esc
  closes any popover or returns from a detail screen to the main menu
- Live telemetry refresh: ≤ 1 s for service gauges, ≤ 5 s for system stats
- Update notification appears within 5 minutes of release publication
- Graceful shutdown succeeds for all running services in ≤ 10 s, or shows
  a per-service failure list
- macOS app passes Apple notarisation; ships signed with a Developer ID cert
  (not yet in place — see Status)
- No Dock icon on macOS; no app menu in the menu bar (status-item only). On
  Windows, a normal per-user install with a notification-area icon, no
  elevation required for everyday tray use
- Windows build produces a clean x64 MSI on a clean checkout; installing it
  creates a per-user app that runs in the logged-on desktop session (never
  Session 0 only)

## Tone & copy

- **Voice:** competent, terse, slightly nautical-industrial.
- **Naming:** services keep their proper names (Signal-Bridge, Sunfish,
  Flight-Deck). Use "Dry Dock" for graceful shutdown. Use "Refit" for
  updates. "Hands online" / "fiber link" / "airborne" — these are
  flavor, keep them.
- **Avoid:** marketing tone, exclamation marks, emoji.
- **Error messages:** state what failed and what to try, in 1–2 short
  sentences. Don't apologize.
