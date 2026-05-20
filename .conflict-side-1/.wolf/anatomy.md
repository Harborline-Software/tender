# tender — Anatomy

Per-repo OpenWolf anatomy. Lists files + 2-3 line descriptions + token estimates.

## Top-level layout

| Path | Description | Est. tokens |
|---|---|---|
| `menubar-plugin/sunfishsoftware.10s.sh` | Mac SwiftBar plugin v2.0 — fleet status tray for macOS. pgrep-based process detection, osascript Terminal launch, Coordination/Bridge/ERP/Anchor/GPU/Folders sections | ~400 |
| `windows-tray/tender-tray.ps1` | Windows WinForms system tray coordinator (PowerShell 5.1 STA). Mirrors Mac plugin. 10s refresh timer, CimInstance process detection, 6 sections | ~550 |
| `windows-tray/generate-assets.ps1` | GDI+ asset generator. Produces `assets/flag-base.png` — 32x32 ARGB naval pennant (navy + teal, transparent bg, badge zone clear at x=21,y=21) | ~120 |
| `windows-tray/assets/flag-base.png` | Generated 32x32 PNG — Harborline flag base without badge (badge composited at runtime) | binary |
| `windows-tray/install.ps1` | Creates Windows startup shortcut for tender-tray.ps1 at `%APPDATA%\...\Startup\`. Also launches tray immediately | ~60 |
| `windows-tray/launch-tray.vbs` | VBScript no-window launcher — runs tender-tray.ps1 with WScript.Shell.Run(..., 0) to suppress console popup | ~15 |
| `apps/windows/` | **NEW** — Tauri 2 + React 18 + TypeScript tray panel app (Milestone 1 shell complete). 360px panel, transparent/alwaysOnTop window | dir |
| `apps/windows/src/theme/tokens.ts` | Two-mode Engine Room palette (dark/light). THEMES record with bg/surface/text/accent/metal/danger tokens | ~80 |
| `apps/windows/src/theme/ThemeProvider.tsx` | React context + OS matchMedia sync. Exports ThemeContext, ThemeProvider | ~60 |
| `apps/windows/src/state/types.ts` | All data interfaces: Device, HarborlineService, Project, LocalService, SystemStats, PendingUpdate, ReleaseNote, Screen, DetailId | ~90 |
| `apps/windows/src/mocks/index.ts` | Static M1 mock data: MOCK_DEVICES (5), MOCK_SERVICES (3), MOCK_SYSTEM_STATS, MOCK_LOCAL_SERVICES (5), MOCK_PROJECTS (5), dial values | ~100 |
| `apps/windows/src/screens/TrayMenu.tsx` | Root screen — header (Logomark + wordmark + workspace pill + gear), TabStrip, tab routing, detail screen routing, popover state | ~180 |
| `apps/windows/src/screens/tabs/FleetTab.tsx` | Fleet tab — GaugeCard row (3 dials) + ConsoleRow list for Harborline services | ~120 |
| `apps/windows/src/screens/tabs/ProjectsTab.tsx` | Projects tab — ConsoleRow list from MOCK_PROJECTS, no navigation | ~80 |
| `apps/windows/src/screens/tabs/ServicesTab.tsx` | Services tab — ConsoleRow list from MOCK_LOCAL_SERVICES, all click to engine-room | ~90 |
| `apps/windows/src/screens/detail/DetailStub.tsx` | Generic stub detail screen with back button | ~40 |
| `apps/windows/src/screens/detail/DryDockDetail.tsx` | Dry Dock graceful shutdown screen with danger styling and confirm/cancel buttons | ~80 |
| `apps/windows/src/screens/detail/DockSettingsDetail.tsx` | Dock Settings with functional dark/light theme toggle | ~50 |
| `apps/windows/src/components/MenuShell.tsx` | Outer panel shell — gradient bg, border-radius, accent glow, FiberDivider top strip | ~60 |
| `apps/windows/src/components/TabStrip.tsx` | 3-tab strip (Fleet/Projects/Services) with active indicator underline glow | ~80 |
| `apps/windows/src/components/Dial.tsx` | SVG arc gauge dial with reading + sub labels (JetBrains Mono) | ~100 |
| `apps/windows/src/components/GaugeCard.tsx` | Clickable wrapper around Dial with bottomLabel and optional update dot | ~60 |
| `apps/windows/src/components/ConsoleRow.tsx` | Single-row service/process entry with indicator, name, subLabel, meter pill, optional badge | ~100 |
| `apps/windows/src/components/popovers/WorkspacePopover.tsx` | Device list popover — online count, status dots, OS badges, "Manage devices" footer | ~150 |
| `apps/windows/src/components/popovers/GearPopover.tsx` | Settings menu popover — 8 items, maps to detail screen IDs via NAV_MAP | ~70 |
| `apps/windows/src-tauri/tauri.conf.json` | Tauri 2 config — panel window 360×600 transparent/alwaysOnTop/skipTaskbar, tray icon | ~60 |
| `apps/windows/src-tauri/src/tray.rs` | Tray icon setup + left-click toggle panel show/hide | ~80 |
| `apps/windows/src-tauri/src/commands.rs` | Tauri command stubs for M2: get_system_stats, get_services, get_devices, get_projects | ~60 |
