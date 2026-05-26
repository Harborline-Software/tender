# Tender

Tender is the tray-resident toolbox for managing the Harborline fleet from the Mac menu bar. It surfaces service health, Tailscale device status, log viewers, and (from Q6) bundle-manifest inspection.

## Fleet-layout requirement

Tender uses a `file:` reference to `@sunfish/contracts` from the sibling `shipyard` repo:

```
apps/desktop/package.json:
  "@sunfish/contracts": "file:../../../../../shipyard/packages/contracts"
```

**Both `tender` and `shipyard` must be cloned under the same parent directory:**

```
~/Projects/Harborline-Software/
  tender/          ← this repo
  shipyard/        ← required sibling (Harborline-Software/shipyard)
```

If `shipyard` is absent, `pnpm install` (or `npm install`) will fail with a
symlink-resolution error.

### Quick setup

```bash
cd ~/Projects/Harborline-Software
git clone https://github.com/Harborline-Software/shipyard.git
git clone https://github.com/Harborline-Software/tender.git
cd tender/apps/desktop && npm install
```

## Q6 — Bundle manifest viewer (BundlesDetail)

The **Plugins** entry in the gear menu (accessible from any detail panel) opens
`BundlesDetail`, which reads bundle manifests from the sibling shipyard via the
Tauri Rust backend at runtime:

- Manifests are loaded from
  `../shipyard/packages/foundation-catalog/Manifests/Bundles/*.bundle.json`
  (relative to the fleet layout root, resolved at Tauri startup).
- If the path does not exist, the UI shows an operator-actionable error:
  "Bundle manifest directory not found: {path}. Ensure shipyard/ is cloned at
  the sibling fleet-layout path."
- Plugin health probing is not implemented in Q6 v1; all provider slots show
  "unknown" (H4.A ruling). Q6 v2 will add live probing.

Type contracts for bundle manifests live in
`shipyard/packages/contracts/src/bundles.ts` and are consumed via
`@sunfish/contracts`. See ADR 0007 and the Q6 Stage-05 spec in
`shipyard/icm/05_implementation-plan/q6-tender-deep-integration-stage-05.md`
for the full design rationale.

## Development

```bash
cd apps/desktop
npm install          # requires sibling shipyard — see above
npm run dev          # Vite + Tauri dev mode (opens tray app)
npm run build        # production build
```

Tauri commands are defined in `src-tauri/src/` (Rust). TypeScript IPC wrappers
live in `src/ipc/tauri.ts`.
