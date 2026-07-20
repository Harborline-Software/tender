# Harborline Toolbox

Harborline Toolbox (repo name: `tender`) is a **macOS menu-bar tray app** for
monitoring and managing local Harborline services from a single place. It lives
in the menu bar and surfaces service health, Tailscale device status, log
viewers, a Projects tab for your git repositories, and bundle-manifest
inspection. Optionally, it can also report on remote operator hosts you run
yourself (model inventory, GPU VRAM residency, paid-compute ledgers) — those
features are off by default (see [Configuration](#configuration)).

**Who it's for:** operators running Harborline services on a Mac who want an
at-a-glance tray view without keeping a terminal open. It is a standalone `.app`
— you do **not** need to clone any other Harborline repository to build or run
it.

- Repository: <https://github.com/Harborline-Software/tender>
- License: MIT (see [`LICENSE`](./LICENSE) and
  [`THIRD-PARTY-LICENSES.md`](./THIRD-PARTY-LICENSES.md))

## Status

Harborline Toolbox is **pre-1.0** and under active development.

- **Builds are currently UNSIGNED.** macOS Gatekeeper will warn on first launch
  ("cannot verify the developer"). You can allow it via **System Settings →
  Privacy & Security → Open Anyway**. Code-signing/notarization is not yet in
  place; no timeline is promised here.
- **There is no auto-updater yet.** Updating means building or downloading a new
  version and replacing the app manually.

## Install / build

Harborline Toolbox ships as a self-contained `.app`. No sibling clone of any
other Harborline repo is required.

```bash
git clone https://github.com/Harborline-Software/tender.git
cd tender/apps/desktop
npm install
npm run tauri build   # produces "Harborline Toolbox.app" in src-tauri/target/
```

The bundle-manifest data and all TypeScript type definitions are bundled inside
the application at build time. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the
full toolchain (Node, Rust, Tauri) and dev-mode instructions.

## Configuration

Most panes work out of the box against services on your local machine. The
**operator / remote-host features are OFF by default** — model inventory, GPU
VRAM residency, and paid-compute reporting. They read from hosts you specify via
`TENDER_*` environment variables. Out of the box the app points at nothing you
own, so those panes stay empty until you set them to your own hosts:

| Env var | Purpose |
|---|---|
| `TENDER_WINHUB_HOST` | Hostname of your GPU/inference host (model inventory, VRAM residency) |
| `TENDER_WINHUB_SSH_HOST` | SSH host for the same machine, if different |
| `TENDER_BIFROST_HOST` | Host for the paid-compute gateway ledger |
| `TENDER_BRIDGE_BASE_URL` | Base URL for the Bridge service |
| `TENDER_FLIGHTDECK_BASE_URL` | Base URL for the Flight-deck service |
| `TENDER_STABILITY_MATRIX_DIR` | Local path to a Stability Matrix install (read-only) |
| `TENDER_INSECURE_TLS` | Set to allow self-signed TLS on the above hosts (use with care) |
| `TENDER_COORDINATION_DIR` | Local coordination checkout used for daemon status and logs |
| `TENDER_FLEET_DASHBOARD_URL` | Optional Fleet Dashboard URL fallback when Dock Settings has no saved value |
| `TENDER_ALLOW_COORDINATION_DAEMON_START` | Set to `1` only after the installed daemon safety fix is verified; unlocks Start and Run now |

If you don't set these, the corresponding panes simply show nothing — the app
does not require any operator host to run, and never points at a host you don't
control unless you configure it to.

The **Coordination Daemons** pane is read-only by default. It reports launchd,
active-marker, freshness, and log state without starting another sync engine.
Stop is always available for a loaded job and establishes a reboot-persistent
maintenance hold by removing its active marker before unloading it. Start and
Run now stay locked unless `TENDER_ALLOW_COORDINATION_DAEMON_START=1` is present
in the Toolbox process environment; set that only after the coordination daemon
safety update has been installed and verified. The fleet-dashboard link has no
committed host default. Configure it in **Dock Settings → Connections**; the
saved value takes priority over `TENDER_FLEET_DASHBOARD_URL`, which remains
available as an environment fallback.

## Projects tab

The **Projects** tab shows your git repositories:

1. **Curated list:** `~/Library/Application Support/Tender/projects.json`
   ```json
   [{ "name": "my-project", "path": "~/Code/my-project", "status": "active" }]
   ```
2. **Autodiscovery fallback:** git repos under `~/Projects/` at depth ≤ 2.

When neither source is available, the tab shows an empty state.

## Bundle manifests — resource bundling

Bundle-manifest JSON files (`*.bundle.json`) are shipped inside the `.app` under
`Contents/Resources/resources/bundles/`. A committed snapshot in
`src-tauri/resources/bundles/` is what ships in a normal build, so no external
data source is needed.

**Resolution order at runtime:**

1. `<Harborline Toolbox.app>/Contents/Resources/resources/bundles/` — always
   available in shipped builds and in `tauri dev` after the first build.
2. A local fleet-developer path (see below) — dev fallback only.

The **Plugins** entry in the gear menu opens the bundle-manifest viewer
(`BundlesDetail`), which reads manifests from that bundled resource directory.
Plugin health probing is not yet implemented; provider slots show "unknown"
until live probing lands in a later version.

## TypeScript contracts — vendored types

The `@sunfish/contracts` types used by Harborline Toolbox are vendored in
`apps/desktop/src/vendor/sunfish-contracts/`. Only the bundle-manifest subset
(`BusinessCaseBundleManifest`, `BundleCategory`, `BundleStatus`,
`ProviderCategory`, etc.) is included. This removes any `file:` dependency on an
external contracts package, so `npm install` works with no extra clones.

## Fleet-developer notes (optional)

> These notes apply **only** if you are developing inside the private Harborline
> fleet checkout. Outside contributors and users can ignore this section — the
> committed snapshots described above make it unnecessary.

- **Bundle-manifest refresh:** `build.rs` copies `*.bundle.json` from a sibling
  `shipyard/` clone (when present) into `src-tauri/resources/bundles/` at build
  time; the committed snapshot is used when no `shipyard` clone exists. To
  refresh the snapshot, run `cargo build` in `apps/desktop/src-tauri` with a
  `shipyard` clone present.
- **Dev-only manifest fallback path:**
  `~/Projects/Harborline-Software/shipyard/packages/foundation-catalog/Manifests/Bundles/`
  is consulted for bare `cargo check` without a Tauri context. This path is
  never required for a normal build.
- **Contract sync discipline:** when the upstream canonical record changes,
  update `src/vendor/sunfish-contracts/bundles.ts` and the Rust mirror in
  `src-tauri/src/bundles.rs` together.

## Upgrading from a `Tender.app` install

`productName`/`mainBinaryName` changed from `Tender` to `Harborline Toolbox`. A
rebuilt app now bundles as `Harborline Toolbox.app` and shows as **Harborline
Toolbox** in Activity Monitor. `Tender.app` does **not** update in place (there
is no auto-updater yet).

**What migrates automatically:** the per-user auto-start LaunchAgent. Its label
(`io.harborline.tender`) and the `~/Library/Application Support/Tender/` config
directory are intentionally **not** renamed, so no user data moves. On first
launch the app checks whether an existing LaunchAgent plist points at the old
`Tender.app` path and, if so, rewrites it in place to point at the new install —
auto-start keeps working with no user action.

**What requires a manual step:** the old `Tender.app` is left in place — the app
cannot safely delete a sibling `.app` bundle out from under itself, and there is
no updater to hand that off to. Once `Harborline Toolbox.app` is confirmed
running, drag the old `Tender.app` to the Trash yourself.

**Why the bundle identifier (`io.harborline.tender`) and Application Support
folder stay as `tender`:** changing the reverse-DNS identifier would reset macOS
TCC permission grants and change the Tauri webview data directory for no
functional benefit — Activity Monitor's process name comes from the compiled
*binary* (`mainBinaryName`), not the identifier. Keeping the identifier stable
avoids an unforced migration.

## Contributing & security

- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — build, dev, and PR conventions.
- [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) — community expectations.
- [`SECURITY.md`](./SECURITY.md) — how to report a vulnerability privately.
- [`THIRD-PARTY-LICENSES.md`](./THIRD-PARTY-LICENSES.md) — licensing of this
  project and any optional bundled runtimes.
