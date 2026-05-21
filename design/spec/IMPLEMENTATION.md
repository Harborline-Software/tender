# Tender · Implementation

How to build Tender. Pair with `PRODUCT.md` (what to build) + `DESIGN.md`
(how it looks) + `SCREENS.md` (every screen).

Target platform: **macOS 13+ (Ventura, Sonoma, Sequoia)**, universal
(Apple Silicon + Intel). Menu-bar accessory only — no Dock icon, no app
menu.

---

## Recommended tech stack

Two viable paths. Pick one before starting; do not mix.

### Path A (recommended): Tauri 2 + React + TypeScript

Reuses the existing React prototype as the foundation and skips most of
the UI re-implementation cost.

| Concern | Choice | Why |
|---|---|---|
| Shell | **Tauri 2** | First-class macOS support, small `.app` bundle (~10 MB), Rust backend for system telemetry, can present an `NSPanel` for the dropdown |
| Menu-bar status item | **`tauri-plugin-positioner` + `NSStatusItem` via the Rust `objc2` crate** | Tauri doesn't ship a built-in status-item API; reach into AppKit |
| UI | **React 18 + TypeScript** | Prototype is already React; reuse the components |
| Styling | **CSS Modules** | Keeps the token vocabulary explicit; the prototype uses inline style + gradients which Tailwind would obscure |
| State | **Zustand** | Two stores: app config (mode/active device) + live telemetry. Lightweight. |
| Async / data | **TanStack Query** | Cache + dedupe polling calls |
| IPC | **Tauri commands + events** | Typed `invoke()` for actions, push events for state changes |
| Fonts | **Self-hosted woff2** | Don't depend on Google Fonts at runtime. Bundle Cormorant, Space Grotesk, JetBrains Mono in the app bundle. |
| Update channel | **Sparkle 2 via `tauri-plugin-updater`** | Standard macOS updater; supports delta updates |
| Code signing | **Apple Developer ID + notarization** | `cargo tauri build` → `codesign` → `notarytool submit` → staple |

### Path B (most-native): Swift 5.9+ / SwiftUI + AppKit

Native Swift app. Throws away the React prototype but gives the best
macOS feel and the smallest binary.

| Concern | Choice |
|---|---|
| Shell | **AppKit `NSStatusItem` + `NSPanel`** (the SwiftUI menu-bar story isn't quite mature enough for our panel needs) |
| Body | **SwiftUI** views inside the NSPanel |
| State | **`@Observable` (Swift 5.9 macros)** or Combine if you need backports |
| Async | **structured concurrency (async/await + `AsyncStream`)** for telemetry |
| Persistence | **`UserDefaults` + JSON files in `~/Library/Application Support/Tender/`** |
| Update channel | **Sparkle 2** |

Recommended: **Path A** unless the team strongly prefers native Swift.

The rest of this doc assumes Path A.

---

## Project structure (Tauri + React)

```
tender/
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   ├── status_item.rs      # NSStatusItem creation, click handlers, panel positioning
│   │   ├── panel_window.rs     # NSPanel config, focus-loss close, escape close
│   │   ├── telemetry.rs        # Service health, system stats, top processes
│   │   ├── devices.rs          # Tailscale local API integration
│   │   ├── updates.rs          # Update check / staging / install (Sparkle bridge)
│   │   ├── shutdown.rs         # Graceful shutdown logic
│   │   ├── projects.rs         # Read projects.json
│   │   └── commands.rs         # Tauri command exports
│   ├── icons/                  # icon.icns, generated from fleur-mark.png
│   ├── Info.plist              # LSUIElement=true (no Dock icon)
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/                        # React frontend
│   ├── app.tsx                 # Root, theme provider, query client
│   ├── theme/
│   │   ├── tokens.ts           # All palette + size + spacing tokens
│   │   ├── ThemeProvider.tsx
│   │   └── useTheme.ts         # Reads NSApp.effectiveAppearance via IPC
│   ├── components/             # Pure UI components
│   │   ├── MenuShell.tsx
│   │   ├── ConsoleRow.tsx
│   │   ├── FiberDivider.tsx
│   │   ├── ConsoleIndicator.tsx
│   │   ├── DetailHeader.tsx
│   │   ├── Sparkline.tsx
│   │   ├── MeterBar.tsx
│   │   ├── ActionFooter.tsx
│   │   ├── DataLine.tsx
│   │   ├── StatusPill.tsx
│   │   ├── UpdateCountBadge.tsx
│   │   ├── UnreadPip.tsx
│   │   ├── Dial.tsx
│   │   ├── GaugeCard.tsx
│   │   ├── ToggleSwitch.tsx
│   │   ├── TabStrip.tsx
│   │   ├── Logomark.tsx        # The PNG mark wrapped for any size
│   │   └── popovers/
│   │       ├── WorkspacePopover.tsx
│   │       └── GearPopover.tsx
│   ├── screens/
│   │   ├── Panel.tsx           # The "main" screen — header + tabs + body
│   │   ├── tabs/
│   │   │   ├── FleetTab.tsx
│   │   │   ├── ProjectsTab.tsx
│   │   │   └── ServicesTab.tsx
│   │   └── detail/
│   │       ├── SignalBridgeDetail.tsx
│   │       ├── SunfishDetail.tsx
│   │       ├── FlightDeckDetail.tsx
│   │       ├── EngineRoomDetail.tsx
│   │       ├── DockSettingsDetail.tsx
│   │       ├── DryDockDetail.tsx
│   │       └── ReleaseNotesDetail.tsx
│   ├── routes/router.tsx       # Internal screen state (NOT react-router)
│   ├── state/
│   │   ├── appConfig.ts        # Zustand: mode, active device, prefs
│   │   ├── telemetry.ts        # Zustand: live caches
│   │   └── queries/
│   │       ├── useServices.ts
│   │       ├── useSystemStats.ts
│   │       ├── useDevices.ts
│   │       ├── useUpdates.ts
│   │       └── useProjects.ts
│   ├── ipc/tauri.ts            # Typed wrappers around invoke()
│   ├── assets/
│   │   ├── fleur-mark.png      # Copied verbatim from this repo
│   │   └── fonts/
│   ├── animations.css          # Keyframes (consoleFiberPulse, etc.)
│   └── index.tsx
│
├── package.json
└── tsconfig.json
```

---

## Routing

This is a menu-bar app, not a website. **Do not use React Router.** A
single piece of state controls which surface is showing:

```ts
type Screen =
  | { kind: 'main' }
  | { kind: 'detail'; id: DetailId };

type DetailId =
  | 'signal-bridge' | 'sunfish' | 'flight-deck'
  | 'engine-room' | 'dock-settings' | 'dry-dock'
  | 'release-notes';
```

Stored in component-local `useState` in `Panel`. Back-navigation resets
to `{ kind: 'main' }`. Esc key handler at the panel root does the same
*and* closes the panel if already on main.

Popovers are sibling state:

```ts
const [openPopover, setOpenPopover] = useState<null | 'workspace' | 'gear'>(null);
```

When a tab changes or the panel is dismissed, set `openPopover` to
`null`.

---

## Data shapes

Define these in `src/state/types.ts`. All times are ISO 8601 strings;
sizes are bytes.

```ts
export interface Device {
  hostname: string;              // 'steamtide-mac'
  ip: string;                    // '100.74.12.1' (Tailscale CGNAT)
  os: 'WIN' | 'MAC' | 'LNX';
  kind?: 'workstation' | 'server';
  status: 'online' | 'idle' | 'offline';
  lastSeen?: string;
  isThis: boolean;
}

export interface HarborlineService {
  id: 'signal-bridge' | 'sunfish' | 'flight-deck';
  displayName: string;
  version: string;
  installed: boolean;
  status: 'running' | 'idle' | 'stopped' | 'error';
  updateAvailable?: PendingUpdate;

  signalBridge?: {
    throughputMbps: number;
    history: number[];           // last 30 samples for sparkline
    links: { hostname: string; upMbps: number; downMbps: number; status: 'healthy' | 'degraded' }[];
  };
  sunfish?: {
    activeTasks: number;
    queuedTasks: number;
    tasksPerMin: number;
    errors: number;
    tasks: { name: string; status: 'running' | 'queued' | 'paused'; pct: number }[];
  };
  flightDeck?: {
    airborne: number;
    total: number;
    workers: { id: number; util: number; temp: number }[];
  };
}

export interface Project {
  name: string;
  path: string;                  // '~/Code/harbor-east'
  status: 'active' | 'paused' | 'archived';
  lastOpened?: string;
}

export interface LocalService {
  name: string;                  // 'harborline-router'
  pid?: number;
  cpu: number;                   // 0-100
  memBytes: number;
  isHarborline: boolean;
}

export interface SystemStats {
  cpu: number;
  memUsedBytes: number;
  memTotalBytes: number;
  diskUsedBytes: number;
  diskTotalBytes: number;
  netMbps: number;
  netMaxMbps: number;
  topProcesses: LocalService[];
}

export interface PendingUpdate {
  service: HarborlineService['id'] | 'tender';
  fromVersion: string;
  toVersion: string;
  sizeBytes: number;
  releaseNotes: ReleaseNote[];
  publishedAt: string;
}

export interface ReleaseNote {
  kind: 'new' | 'fix' | 'perf';
  text: string;
}
```

---

## IPC contract (Tauri commands)

```rust
#[tauri::command] async fn get_devices() -> Result<Vec<Device>, Error>;
#[tauri::command] async fn get_services() -> Result<Vec<HarborlineService>, Error>;
#[tauri::command] async fn get_system_stats() -> Result<SystemStats, Error>;
#[tauri::command] async fn get_local_services() -> Result<Vec<LocalService>, Error>;
#[tauri::command] async fn get_projects() -> Result<Vec<Project>, Error>;
#[tauri::command] async fn check_updates() -> Result<Vec<PendingUpdate>, Error>;
#[tauri::command] async fn install_update(service: String) -> Result<(), Error>;
#[tauri::command] async fn install_all_updates() -> Result<(), Error>;
#[tauri::command] async fn restart_service(id: String) -> Result<(), Error>;
#[tauri::command] async fn graceful_shutdown() -> Result<ShutdownResult, Error>;
#[tauri::command] async fn collect_logs() -> Result<PathBuf, Error>;
#[tauri::command] async fn open_in_editor(project_path: String) -> Result<(), Error>;
#[tauri::command] async fn get_system_appearance() -> Result<'dark' | 'light', Error>;
```

Plus Tauri events for push state:

```rust
emit("service-status-changed", payload: HarborlineService);
emit("update-available",       payload: PendingUpdate);
emit("device-status-changed",  payload: Device);
emit("appearance-changed",     payload: 'dark' | 'light'); // when NSApp.effectiveAppearance flips
```

The frontend subscribes and invalidates TanStack Query keys.

---

## Polling cadences

| Source | Interval | Notes |
|---|---|---|
| Service telemetry (gauges) | **1 s** | Smooth sparklines need ~1 Hz |
| System stats (CPU/MEM/disk) | **2 s** | |
| Top processes | **5 s** | |
| Local services list | **5 s** | |
| Device list (Tailscale) | **15 s** + event-driven on `tailscaled` state change | |
| Update check | **30 min** | Plus on app launch and on user demand |
| Projects list | **on user open** | Read from `~/Library/Application Support/Tender/projects.json` |

---

## Platform integration: macOS menu bar

### NSStatusItem

Create a status item from Rust via `objc2` (or `cacao` if you prefer
the higher-level wrapper):

```rust
// Pseudocode
let item = NSStatusBar::system().statusItem(withLength: NSVariableStatusItemLength);
let button = item.button();
button.setImage(NSImage::imageWithContentsOfFile("fleur-mark@2x.png"));
button.setAction(/* on click, toggle panel */);
```

Use a **template-friendly** monochrome variant of the mark? No — the
fleur PNG already carries the brand color and looks correct in both
appearance modes. Don't strip it to a template image. macOS Sonoma+
shows colored status-item images correctly.

### NSPanel (the panel window)

Use an `NSPanel` (not an `NSWindow`) so it:
- Doesn't appear in Mission Control / Cmd-Tab
- Hides itself when the app resigns active (focus loss)
- Floats above normal windows when shown
- Has rounded corners + shadow that match system look

Key window flags:
- `nonactivatingPanel`, `hideOnDeactivate`
- Style mask: `borderless`, `nonactivatingPanel`
- Level: `NSStatusWindowLevel`
- Collection behavior: `canJoinAllSpaces`, `transient`

### Panel positioning

When the status-item button is clicked:
1. Get the button's screen rect: `button.window().convertRectToScreen(button.frame())`
2. Position the panel: top edge = button bottom - 6 px gap, right edge
   aligned to the button's center + small inset toward the screen edge
3. Clamp horizontally so the panel never extends past the active
   screen's bounds (multi-monitor)
4. Animate in: `opacity 0 → 1 over 120 ms`, optional `transform:
   translateY(-6px → 0)` if you want the slight settle effect

### Focus loss

Bind `NSWindowDidResignKeyNotification` on the panel; when fired, close
the panel. Add an Esc key handler at the React root that does the same
(but only when no popover is open — Esc inside a popover closes the
popover first).

### Appearance changes

Observe `NSApp.effectiveAppearance` via KVO. On change, emit the
`appearance-changed` event so the React theme provider can flip tokens
without re-launching.

### LSUIElement

Set `LSUIElement = true` in `Info.plist` so the app has **no Dock
icon** and never steals focus from the active app.

### Multi-monitor

macOS may have multiple menu bars (one per screen if "Displays have
separate Spaces" is on). Place the panel on the screen that owns the
status item's frame. If the user moves their cursor to another monitor
and clicks the status item there, re-position the panel on that
monitor.

---

## Persistence

App config is stored in the macOS app support dir:

```
~/Library/Application Support/Tender/
├── config.json       # Mode-derived prefs, active device, toggles
├── projects.json     # User projects list
└── logs/             # Where "Collect logs" writes to
```

Note: `themeMode` is **not** stored — it's derived from
`NSApp.effectiveAppearance`. If the user wants to force a specific
mode (override the system), expose that as a future setting and
persist a `themeOverride: 'system' | 'dark' | 'light'` field.

```ts
interface TenderConfig {
  version: 1;
  themeOverride: 'system' | 'dark' | 'light';  // default 'system'
  activeDevice: string;          // hostname
  preferences: {
    launchAtLogin: boolean;      // mapped to ServiceManagement framework
    notificationsSound: boolean;
    notificationsBanner: boolean;
    pulseAnimations: boolean;
    telemetryToHarborline: boolean;
  };
  routes: Route[];               // schema TBD
}
```

Use `SMAppService.mainApp.register()` for "Launch at login" on
Ventura+.

---

## Build & deploy

- `cargo tauri build` produces an unsigned `Tender.app`
- Sign with `codesign --options runtime --sign "Developer ID Application: …" Tender.app`
- Generate `.dmg` with `create-dmg` or the Tauri DMG builder
- Notarize: `xcrun notarytool submit Tender.dmg --keychain-profile … --wait`
- Staple: `xcrun stapler staple Tender.dmg`
- Distribute via the Harborline website or GitHub Releases. Sparkle
  updater pulls from the same channel.

### Universal binary

Build for `x86_64-apple-darwin` + `aarch64-apple-darwin` and stitch
with `lipo` or use `cargo tauri build --target universal-apple-darwin`.

### Telemetry (opt-in)

Same as in `PRODUCT.md` — basic app version + service health rollup,
no user content, no project paths. Opt-in via Dock Settings.

---

## Implementation order

Suggested phasing:

**Milestone 1 — Shell**
1. Tauri scaffold + `LSUIElement` + Developer ID code signing
2. NSStatusItem with the fleur PNG (16/32/64)
3. NSPanel that opens on click, anchored under the status item
4. Theme provider with Engine Room dark + light tokens; subscribe to
   `effectiveAppearance` changes
5. `MenuShell`, `FiberDivider`, `ConsoleRow`, `ConsoleIndicator`,
   `Logomark`
6. Panel chrome (header + tab strip), all tabs render empty states

**Milestone 2 — Live telemetry**
7. Rust side: `get_services`, `get_system_stats`, `get_local_services`
8. TanStack Query hooks + 1 s polling
9. `Dial`, `GaugeCard`, `Sparkline`, `MeterBar`
10. Fleet/Services tabs wired to live data
11. Signal-Bridge, Sunfish, Flight-Deck, Engine Room detail screens

**Milestone 3 — Devices + updates**
12. Tailscale local API integration → `get_devices`
13. WorkspacePopover with real device list
14. Sparkle integration + Release Notes detail screen
15. `install_update` + `install_all_updates`

**Milestone 4 — Settings + shutdown**
16. GearPopover, Dock Settings detail with persistence
17. `graceful_shutdown` + Dry Dock confirmation screen
18. `collect_logs` (zips the logs dir, reveals in Finder)

**Milestone 5 — Polish**
19. Keyboard nav (Esc, arrows, Enter)
20. Empty/error states (see open questions in `SCREENS.md`)
21. Cold-start budget (≤ 150 ms first paint on Apple Silicon)
22. Code signing + notarisation + auto-updater channel

---

## Acceptance per surface

For each screen in `SCREENS.md`, the implementation passes when:

- Layout matches the prototype within ±2 px at 1× DPI
- Tokens match `DESIGN.md` exactly (no eyeballed colors)
- Hover/focus/active states render
- Live data fills the placeholders (no hardcoded sample data in
  production builds)
- Keyboard reachable (Tab order, Enter activation, Esc closes/backs)
- Both dark and light modes (driven by `NSApp.effectiveAppearance`)
  pass WCAG 2.1 AA contrast on body text against the surface they
  sit on
- App passes Apple notarisation with no entitlement warnings

---

## Out of scope for v1

Same as in `PRODUCT.md` — Services Grid, Fiber Traces, Crew Comms,
Refit Yard, and any non-macOS platform. The prototype components for
the deferred surfaces are still in the codebase as unwired routes.
