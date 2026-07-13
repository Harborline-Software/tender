# Contributing to Harborline Toolbox

Thanks for your interest in improving Harborline Toolbox. This is a
Tauri (Rust + React/TypeScript) macOS menu-bar app. Contributions are welcome.

## Prerequisites

- **Node.js 22** (matches CI) and npm
- **Rust** (stable, via [rustup](https://rustup.rs))
- **Tauri system dependencies** for macOS — Xcode Command Line Tools
  (`xcode-select --install`). See the
  [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/) for
  details.

## Build & run

```bash
git clone https://github.com/Harborline-Software/tender.git
cd tender/apps/desktop
npm install

npm run tauri dev     # run the tray app in dev mode (Vite + Tauri)
npm run tauri build   # produce a release "Harborline Toolbox.app"
```

Rust Tauri commands live in `apps/desktop/src-tauri/src/`; the TypeScript IPC
wrappers are in `apps/desktop/src/ipc/`. No sibling repositories are required —
`npm install` works from a clean clone.

## Branches & pull requests

- Branch off `main`; open a PR back into `main`.
- **Commit subjects follow Conventional Commits:** `type(scope): subject`.
  Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `style`, `perf`.
  Example: `fix(residency): handle empty VRAM inventory`.
- **Keep commit bodies simple** — plain prose wrapped at a sensible width. Avoid
  fancy footer tokens; a trailing `Co-Authored-By:` line is fine.
- Keep PRs focused. Describe what changed and why in the PR description.

## CI checks

Every PR runs GitHub Actions that must pass before merge:

- **Build & test** (`build-test.yml`) — compiles the app and runs the test
  suite on Node 22.
- **Secret scanning** (`secret-scan.yml`) — fails if credentials or secrets are
  detected in the diff.
- **No personal paths** (`no-personal-paths.yml`) — fails if committed files
  contain personal absolute paths.
- **Commit lint** (`commitlint.yml`) — enforces the Conventional Commits subject
  format above.
- **Shellcheck** (`shellcheck.yml`) — lints shell scripts.

Run the build and tests locally before pushing so CI is a formality, not a
surprise.

## Never commit secrets or personal paths

- No API keys, tokens, passwords, or credentials — ever. Use environment
  variables (the `TENDER_*` vars documented in the README) for host/URL config.
- No personal absolute paths (e.g. a home directory or machine-specific path)
  in committed source. The `no-personal-paths` check will fail CI on these.
- If you accidentally commit a secret, rotate it immediately — scrubbing git
  history does not un-expose it.

## Questions & bug reports

Open a GitHub issue for bugs and feature requests. For anything security-related,
follow [`SECURITY.md`](./SECURITY.md) — report privately, not in a public issue.

By contributing you agree your contributions are licensed under the project's
MIT license, and you agree to abide by the [Code of
Conduct](./CODE_OF_CONDUCT.md).
