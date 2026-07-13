# Third-Party Licenses & Notices

Harborline Toolbox itself is licensed under the **MIT License** — see
[`LICENSE`](./LICENSE). This file is a NOTICE-style summary of the licensing of
third-party components and, separately, of the optional model runtimes the app
can help you observe. It is a good-faith summary, not legal advice.

## This project

- **Harborline Toolbox** — MIT. You may use, copy, modify, and distribute it
  under the terms in [`LICENSE`](./LICENSE).

## Bundled build dependencies

Harborline Toolbox is built on Tauri (Rust) and React/TypeScript. The compiled
app statically links its Rust crate dependencies, and its frontend bundles its
npm dependencies. Those dependencies carry their own licenses (predominantly
MIT/Apache-2.0). A complete, machine-generated dependency license inventory is
**not yet checked in**:

- **TODO:** generate a full crate license report with
  [`cargo about`](https://github.com/EmbarkStudios/cargo-about) and an npm
  report with a tool such as `license-checker` / `npm-license-checker`, and
  commit the combined output here. Until then, treat this section as
  incomplete rather than authoritative.

## Optional / external model runtimes

Harborline Toolbox can *monitor* local and remote inference services, but it does
**not embed** model runtimes or model weights in its own bundle. Any runtime you
install and point the app at is governed by that runtime's own license, which you
are responsible for reviewing. The project follows this discipline about what it
will and will not embed:

- **LM Studio** — never bundled or embedded. It is proprietary; if you use it,
  you install it yourself under its own terms.
- **AGPL-licensed components** (for example **Jan**, **Stability Matrix**) — are
  **never embedded** in this app. They may be supported only in a
  **read-only / optional** capacity (e.g. reading a local Stability Matrix
  directory you configure). Harborline Toolbox does not link, redistribute, or
  incorporate their code.
- **Permissively licensed runtimes** (MIT/Apache-2.0 floor) such as
  **Ollama**, **llama.cpp**, and **Kokoro** — these are the license floor for
  runtimes the project integrates with. They remain separate programs you
  install; the app talks to them over their APIs rather than embedding them.

These integrations are all **optional and off by default** — see the
Configuration section in the [README](./README.md#configuration). The app ships
without pointing at any runtime you have not configured.

## Reporting a licensing concern

If you believe a component's license is mis-stated here, or that a bundled
dependency's notice is missing, please open an issue or follow the private
disclosure path in [`SECURITY.md`](./SECURITY.md).
