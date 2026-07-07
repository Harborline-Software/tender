# Harborline Toolbox

Harborline Toolbox (repo name: `tender`) is the tray-resident toolbox for managing the Harborline fleet from the Mac menu bar. It surfaces service health, Tailscale device status, log viewers, and (from Q6) bundle-manifest inspection.

## Standalone install

Harborline Toolbox ships as a self-contained `.app` — no sibling clone of `shipyard` or any other fleet repo is required on the operator's machine.

```bash
git clone https://github.com/Harborline-Software/tender.git
cd tender/apps/desktop && npm install
npm run build   # or: cargo tauri build
```

That's it. The bundle manifest data and all TypeScript type definitions are bundled inside the application at build time.

## Bundle manifests — resource bundling

Bundle manifest JSON files (`*.bundle.json`) are shipped inside the `.app` under `Contents/Resources/resources/bundles/`.

The `build.rs` build script copies them from the sibling `shipyard/` clone (when present) into `src-tauri/resources/bundles/` at build time. The committed snapshot in `src-tauri/resources/bundles/` is what ships when building without a `shipyard` clone.

**Resolution order at runtime:**

1. `<Harborline Toolbox.app>/Contents/Resources/resources/bundles/` — always available in shipped builds and in `cargo tauri dev` after the first build.
2. `~/Projects/Harborline-Software/shipyard/packages/foundation-catalog/Manifests/Bundles/` — dev fallback for bare `cargo check` without a Tauri context.

**To refresh the bundled snapshot** (fleet developers only):

```bash
cd apps/desktop/src-tauri
cargo build   # build.rs copies fresh manifests from shipyard if present
```

## TypeScript contracts — vendored types

The `@sunfish/contracts` types used by Harborline Toolbox are vendored in
`apps/desktop/src/vendor/sunfish-contracts/`. Only the bundle manifest subset
(`BusinessCaseBundleManifest`, `BundleCategory`, `BundleStatus`, `ProviderCategory`,
etc.) is included — the full ERP/property-management contracts are not needed.

This removes the `file:` dependency on the sibling `shipyard/packages/contracts`
package, so `npm install` works without cloning `shipyard`.

**Sync discipline:** when the upstream C# canonical record changes (in
`shipyard/packages/foundation-catalog/Bundles/BusinessCaseBundleManifest.cs`),
update `src/vendor/sunfish-contracts/bundles.ts` AND the Rust mirror in
`src-tauri/src/bundles.rs` together.

## Projects tab

The **Projects** tab shows the operator's git repositories:

1. **Curated list:** `~/Library/Application Support/Tender/projects.json`
   ```json
   [{ "name": "my-project", "path": "~/Code/my-project", "status": "active" }]
   ```
2. **Autodiscovery fallback:** git repos under `~/Projects/` at depth ≤ 2.

When neither source is available, the tab shows an empty state.

## Q6 — Bundle manifest viewer (BundlesDetail)

The **Plugins** entry in the gear menu opens `BundlesDetail`, which reads
bundle manifests from the bundled resource directory (see above).

Plugin health probing is not implemented in Q6 v1; all provider slots show
"unknown" (H4.A ruling). Q6 v2 will add live probing.

See ADR 0007 and the Q6 Stage-05 spec in
`shipyard/icm/05_implementation-plan/q6-tender-deep-integration-stage-05.md`
for the full design rationale.

## Development

```bash
cd apps/desktop
npm install          # no sibling repos required
npm run dev          # Vite + Tauri dev mode (opens tray app)
npm run build        # production build
cargo tauri build    # produces "Harborline Toolbox.app" in src-tauri/target/
```

Tauri commands are defined in `src-tauri/src/` (Rust). TypeScript IPC wrappers
live in `src/ipc/tauri.ts`.

## Upgrading from a Tender.app install

`productName`/`mainBinaryName` changed from `Tender` to `Harborline Toolbox`
(the identifier-layer half of the brand rename; the display-only half shipped
earlier). A rebuilt app now bundles as `Harborline Toolbox.app` and its process
shows as **Harborline Toolbox** in Activity Monitor — `Tender.app` does not
update in place (there is no auto-updater yet, item 22 on the roadmap).

**What migrates automatically:** the per-user auto-start LaunchAgent. Its
label (`io.harborline.tender`, unchanged — see below) and the
`~/Library/Application Support/Tender/` config directory (unchanged, same
reasoning) are intentionally **not** renamed, so no user data moves. On first
launch, the app checks whether an existing LaunchAgent plist points at the
old `Tender.app` path and, if so, rewrites it in place to point at the new
install (`autostart::migrate_program_path`, wired into `lib.rs` setup) — auto-start
keeps working with no user action.

**What requires a manual step (honest, not silently automated):** the OLD
`/Applications/Tender.app` is left in place — this app cannot safely delete a
sibling `.app` bundle out from under itself, and there's no updater to hand
that off to. Once `Harborline Toolbox.app` is confirmed running, drag the old
`Tender.app` to the Trash yourself.

**Why the bundle `identifier` (`io.harborline.tender`) and Application Support
folder stay as `tender`:** changing the reverse-DNS identifier would reset
macOS TCC permission grants and change the Tauri webview data directory for
no functional benefit — Activity Monitor's process name comes from the
compiled *binary* (`mainBinaryName`), not the identifier. Keeping the
identifier stable avoids an unforced migration; it mirrors the fleet's
existing pattern of an internal/engineering name (here: the `tender` repo,
crate, and identifier) persisting under a renamed shipped product (see the
Shipyard→Harborline rebrand).
