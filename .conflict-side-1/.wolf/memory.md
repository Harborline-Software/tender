# Memory

> Chronological action log. Hooks and AI append to this file automatically.
> Old sessions are consolidated by the daemon weekly.

| Time | Description | File(s) | Outcome | ~Tokens |
|---|---|---|---|---|
| 2026-05-20 | Created Windows tray app (po-win session) — PowerShell WinForms NotifyIcon mirroring Mac SwiftBar plugin | windows-tray/tender-tray.ps1, install.ps1 | Running; user confirmed visible in tray | ~1200 |
| 2026-05-20 | Fixed Unicode parse error in tender-tray.ps1 — PowerShell 5.1 ANSI encoding issue, replaced non-ASCII chars | windows-tray/tender-tray.ps1 | Process stays alive; confirmed by user | ~300 |
| 2026-05-20 | Fixed Add-Sep null ref — ContextMenuStrip vs ToolStripMenuItem .Items vs .DropDownItems distinction | windows-tray/tender-tray.ps1 | No errors in stderr | ~200 |
| 2026-05-20 | Added flag + badge icon system -- generate-assets.ps1 creates 32x32 PNG pennant; New-FlagStatusIcon composites badge at runtime | windows-tray/generate-assets.ps1, assets/flag-base.png, tender-tray.ps1 | Committed a8f8d1a; tray running PID 25988 | ~400 |
| 13:03 | Add dark/light theme support to tray menu (DarkColorTable C# class, Get-IsDarkMode, Set-ItemTheme) | windows-tray/tender-tray.ps1 | committed 00a5eab | ~2800 |
| 21:06 | Milestone 1 complete — Tauri 2 + React 18 app scaffolded. 41 source files: theme, state types, mocks, 8 components, 3 tabs, 7 detail screens, TrayMenu root, app.tsx, main.tsx. tsc passes clean; Vite dev server renders correctly at localhost:1421 | apps/windows/ | dev server verified via Playwright snapshot | ~4500 |
