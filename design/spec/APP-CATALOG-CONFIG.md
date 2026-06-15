# Tender — App Catalog, Config Management & Dev/End-User Mode

**Status:** Design note (Draft) · **Author:** Engineer (Tender track) · **Date:** 2026-06-15
**Feeds:** the config cohorts that make the installer/coordinator prototype *actually functional*.
**Decided so far (CIC brainstorm 2026-06-15):** adopt the catalog + readiness model (option B foundation);
a **dev/end-user mode** is in scope to support local buildout while everything is still in motion.

> One ADR-adjacent item is flagged in §11 for Admiral ratification (the `availability` readiness ladder +
> what "installable" means per mode — it touches the ONR §7 signing-gates-audience doctrine). It does
> **not** block the Tender-local build.

---

## 1. Problem

Even after C1's "honest detection," the managed apps are **baked into the code**, not configured:

- `telemetry.rs` hardcodes each app's id, display name, **process pattern** (`Sunfish.Bridge.AppHost`,
  `Sunfish.Anchor`, `book-server`), and **health URL** (`localhost:17101`, `localhost:3080`).
- `commands.rs` carries app-specific actions (`restart_signal_bridge`, `emergency_stop` → `localhost:3080`).
- The TS `HarborlineService.id` is a **closed union** `'signal-bridge' | 'sunfish' | 'flight-deck'`.

Consequences: you can't add/remove an app without recompiling; "not-ready" apps are either faked or absent;
detection params are magic constants; Tender's own behavior can't be configured per deployment.

## 2. Goals / non-goals

**Goals.** De-hardcode the managed apps into a declarative **catalog**; model app **readiness** so
not-yet-ready apps are honest (not faked); make Tender's own behavior configurable via **settings**; add a
**dev/end-user mode** so the same binary is convenient on a builder's box and clean on a deployment.

**Non-goals (now).** A full runtime plugin system (tier-3 capability-plugin hot-load); a Releases/update
feed (C4/C6); signing/notarization (C6); conflating this with the existing **business-case** bundle
manifests (those are a *different* layer — see §12).

## 3. The three-layer config model (package-manager-shaped)

| Layer | What it is | Status |
|---|---|---|
| **Catalog** | What Tender *knows about* — one declarative **app manifest** per app. Bundled default + user override. | **new** (this note) |
| **Install-state** | What's *actually installed* — `install-config.json` (`apps` map: version, path, profile, launch contract). | **built (C1)** |
| **Settings** | Tender's *own* config — mode, autostart, enabled apps, telemetry posture, monitor intervals. | autostart built; rest **new** |

Mental model = `apt`: catalog = available packages, install-config = installed packages, settings = config.
Generic detection (§8) loops the **catalog ∪ install-state** instead of hardcoding three apps.

## 4. App manifest schema (strawman)

Bundled at `resources/catalog/<id>.app.json`; user overrides at
`~/Library/Application Support/Tender/catalog/<id>.app.json` (override wins by `id`).

```jsonc
{
  "id": "sunfish",                       // open string (replaces the closed TS union)
  "displayName": "Sunfish",
  "vendor": "Harborline",
  "icon": "sunfish",                     // resource key
  "availability": "packaged",            // §5 ladder: planned | packaged | released | deprecated
  "detect": {
    "processPattern": "Sunfish.Anchor",  // replaces the hardcoded pgrep pattern
    "healthUrl": null                    // null ⇒ process-only (ephemeral internal port)
  },
  "install": {
    "sourceKind": "appBundle",           // appBundle | tarGz (C3 InstallSource kinds)
    "source": "local:auto",              // local build (dev) | a path | (later) a feed ref
    "requiresSigning": false
  },
  "services": [                          // §9 sub-services this app owns
    { "id": "local-node", "boot": "self-supervised", "healthScope": "internal" }
  ],
  "actions": [                           // declarative app actions (generalizes emergency_stop/restart)
    { "id": "restart", "kind": "process-restart" }
  ],
  "caveats": [                           // §6 structured routed findings
    { "id": "unsigned-keychain-boot", "severity": "blocker",
      "summary": "Unsigned build: macOS Keychain seed not minted → sidecar won't boot.",
      "appliesWhen": "availability < released" }
  ]
}
```

## 5. Availability readiness ladder

```
planned  ──►  packaged  ──►  released        (+ deprecated)
(no pkg)      (local build,    (signed, backend
              unsigned,        boots clean,
              known caveats)   off a feed)
```

Current mapping (honest state of the fleet today):

| App | `availability` | dev-mode | end-user-mode |
|---|---|---|---|
| **Signal-Bridge** | `planned` (no packaging exists) | visible, *not* installable | hidden |
| **Sunfish** | `packaged` (local build; backend gated on signing/keychain) | installable + caveat | hidden until `released` |
| **Flight-Deck** | `packaged` (local build; backend gated on book-server bundling) | installable + caveat | hidden until `released` |

End-user-mode therefore honestly shows **nothing installable yet** — which is *correct* — while dev-mode is
fully working for buildout. One catalog serves both audiences as apps climb the ladder; no forking.

## 6. Caveats — routed findings become structured data

The cross-track findings I routed this session stop being tribal knowledge and live in the manifest:

- `sunfish` → `unsigned-keychain-boot` (blocker until signing OR a dev seed-injection fallback).
- `flight-deck` → `bookserver-not-bundled` (backend boots only from the repo tree / `GALLEY_BOOK_SERVER_PATH`).

Dev-mode **surfaces** caveats inline; end-user-mode **uses** them to keep an app hidden until `released`.

## 7. (reserved)

## 8. Generic detection (retire the telemetry.rs hardcoding)

Replace the three hardcoded `detect_*` functions with one loop:

```
for each app in (catalog ∪ install-state):
    installed = install_state.has(app.id)                       // honest (C1)
    running   = detect.healthUrl ? http_200(healthUrl)          // per-manifest
                                 : pgrep(detect.processPattern)
    version   = install_state.version(app.id) | "unknown" | ""  // honest (C1)
    visible   = mode.shows(app.availability)                    // §5/§10 gate
```

No more magic constants; adding an app = dropping a manifest. The C1 honest-detection rules (installed =
managed-or-running; version = recorded-or-unknown) carry over unchanged.

## 9. Services representation

An app owns sub-services with distinct boot/health scopes:

- **Sunfish** → `local-node` (self-supervised sidecar; ephemeral internal health port → process-only).
- **Flight-Deck** → `book-server` (supervised child; `:3080`) + **remote GPU workers** (Windows host, po-win).
- **Signal-Bridge** → `relay` (Aspire AppHost; plain process — not ADR-0115 self-supervising).

`healthScope: internal | local-port | remote` tells the detector how (or whether) it can probe.

## 10. Dev / End-User mode

One setting — `tender-settings.json → "mode": "dev" | "end-user"` — gates everything off `availability`:

| | **dev** (builder's box, in motion) | **end-user** (clean deployment) |
|---|---|---|
| Installable threshold | `packaged` and up | `released` only |
| Catalog sources | auto-seeds **local build paths** (`source: local:auto` resolves the `target/.../X.app`) | released/feed artifacts only |
| Caveats | surfaced inline | used to hide the app |
| Dev-isms | `~/Projects` autodiscovery + fleet-daemon log viewers ON | OFF (clean) |
| Extras | raw probe output + **install-from-local-path** form | clean status only |

**Default:** `dev` while building (auto-detect: fleet repo + local builds present ⇒ dev), with an explicit
toggle. **Prototype scoping:** build **dev-mode rich now**; end-user-mode **thin** (just the readiness gate +
dev-isms-off) — you're the only user and everything's in motion.

`tender-settings.json` (new) strawman:
```jsonc
{
  "schemaVersion": 1,
  "mode": "dev",
  "autostart": true,                 // mirrors the LaunchAgent state
  "telemetry": "local-only",         // local-only | off  (the BLOCKED axis stays local-first)
  "enabledApps": null,               // null = all catalog; or an allowlist of ids
  "monitorIntervalSecs": 5
}
```

## 11. Open decisions

1. **Default + auto-detect** — dev-mode default while building, explicit toggle (recommended). *CIC: confirm.*
2. **Editability** — include the **install-from-local-path** form in dev-mode (recommended) vs read-only catalog.
3. **Catalog home** — Tender-local bundled catalog + user override (recommended), **not** a fleet ADR artifact.
4. **[ADR-ADJACENT → Admiral]** the `availability` ladder + what **"installable" means per mode** touches the
   ONR §7 signing-gates-audience doctrine. Flag to Admiral for ratification in parallel; does **not** block
   the Tender-local build.

## 12. Relationship to existing substrate

- **`install-config.json` (C1)** — IS the install-state layer; the catalog is the missing "available" layer.
- **`*.bundle.json` business-case manifests (Q6, `bundles.rs`)** — a **different** layer (which modules a
  tenant turns on), kept **distinct** from the app catalog (ONR's #1 scoping warning). The app catalog =
  app-package; bundle manifest = business-case provisioning *inside* an installed app.
- **ADR 0116 fleet axis registry** — sibling config (capability axes); the app catalog is Tender-local.
- **ONR §7 signing-gates-audience** — the `availability` ladder operationalizes it: `packaged` (dev) vs
  `released` (signed, end-user).

## 13. Proposed cohort sequence

- **CFG-1 — Catalog + generic detection.** Manifest schema + bundled catalog (3 apps) + a loader; replace
  `telemetry.rs`'s hardcoded `detect_*` with the §8 loop. De-hardcodes everything; `availability` makes
  "not ready" honest. *Smallest; subsumes the "just de-hardcode" option.*
- **CFG-2 — Settings + dev/end-user mode.** `tender-settings.json` (read/write) + the §10 gating + the
  dev-ism toggles + autostart folded in. The mode goes live.
- **CFG-3 — Config UI (FED).** A "Manage Apps / Settings" surface: view catalog + readiness + caveats,
  the mode toggle, and the dev-mode install-from-local-path form. Pairs with the profile-selection UI.

---

*This note captures the 2026-06-15 CIC brainstorm. UI/UX for the config + manage-apps surfaces is the next
discussion (existing mockups: `design/settings-screens.jsx`, `design/detail-screens.jsx`).*
