# AGENTS.md — tender

**Tender** is the tray-resident toolbox for managing the Harborline fleet from the Mac menu bar:
service health, Tailscale device status, log viewers, and (from Q6) bundle-manifest inspection. It
ships as a self-contained Tauri `.app` (React + Rust) plus a SwiftBar menubar plugin — **no sibling
clone of any other fleet repo is required** on the operator's machine.

- **Build:** `cd apps/desktop && npm install && npm run build` (or `cargo tauri build`) · dev:
  `npm run dev`
- **Surfaces:** `apps/desktop/` (Tauri app), `menubar-plugin/` (SwiftBar), `design/`.

This file is the **harness-neutral entry point** for *any* coding agent — Claude, Codex/GPT,
Gemini, or any other model. It is the door that opens onto the fleet's shared rules; it does not
restate them. (Claude's harness reads the parent fleet `CLAUDE.md`, which opens the same door.)

---

## Multi-model is the intent — you are a first-class contributor

This fleet is **deliberately model-agnostic**. Codex/GPT and any other model contribute alongside
Claude, for two reasons the human (CIC) wants on purpose: **A/B comparison** (run the same work
through different models and compare) and **token-exhaustion resilience** (when one model's budget
is spent, another keeps the work moving).

**The design principle is: trust the gates, not the model.** A contribution is judged by the CI +
review gates it passes, never by which model produced it. If your PR passes the gates, it is as
legitimate as any other.

---

## Read first — before you write any code

1. **`../.wolf/cerebrum.md`** (fleet root) — learnings store. Check **`## Do-Not-Repeat`**,
   **`## Key Learnings`**, **`## User Preferences`**, **`## Decision Log`**. These bite any agent
   regardless of model.
2. **`../.wolf/buglog.json`** (fleet root) — known bugs + fixes. **Read before fixing anything.**
3. **`../.claude/rules/fleet-conventions.md`** — the **single source of truth** for the fleet's
   working conventions. Despite the `.claude/` path, these are **model-neutral**. Everything below
   is a pointer into it.

> **Single-source rule:** the conventions live **once**, in `fleet-conventions.md` +
> `.wolf/cerebrum.md` + `.wolf/buglog.json`. This `AGENTS.md` is a thin map, not a copy. Two copies
> is the "drift canary" anti-pattern (ADR 0130 A4).

---

## Conventions — the rules that bite any agent

Authoritative source: **`../.claude/rules/fleet-conventions.md`**. The high-frequency ones:

- **Worktree discipline.** Worktrees go under `<repo>/.worktrees/<branch>/` — never `/tmp/`.
- **Commitlint footer-traps (bite EVERY agent):** no `<word>#<digits>` (e.g. `tender#11`, `(#42)`)
  inline in a commit *body* — use a `Refs:` footer; no `@word:` at the start of a body line; wrap
  body lines at ≤100 chars. Pre-flight:
  `git log -1 --format=%B | grep -E '[A-Za-z]#[0-9]|^@[a-z-]+:'`.
- **Conventional-commit format:** `type(scope): subject`. Types: `feat fix chore docs test refactor
  style perf`.
- **Cross-platform exec bits:** on Windows clones, `git config core.filemode false` per-repo (NTFS
  has no POSIX exec-bit; otherwise `*.sh` / `*.ps1` diff-drift). See `fleet-conventions.md`.
- **Beacon protocol:** role-prefixed beacons in `../coordination/inbox/`, timestamp
  `<YYYY-MM-DD>T<HHMM>Z` (UTC, no colons).
- **Workspace currency:** keep ≤25 commits behind `origin/main`; work from a clean worktree.

---

## The gates are the floor — what "model-agnostic" means concretely

Every PR — **no matter which model authored it** — passes the same gates, which key off the **diff
and changed paths**, never the author. That is why any model is first-class: enforcement is on the
change, not the changer.

| Gate | What it checks | Scope |
|---|---|---|
| **commitlint** | conventional-commit format + footer-traps | every PR |
| **Build & Test** | the suite exercising the change runs in CI (ADR 0130 inv-7 / A1) | every PR in scope |
| **CodeRabbit (Layer 0)** | broad/advisory review, keyed off path selectors | every PR |
| **Deep review (`change_type`)** | financial-cluster · audit · security · invoke-sandbox · auth · new-record-type → Admiral dispatches the `code-reviewer` deep pipeline | PRs whose **paths** match a selector |
| **No-diff / scope gate** | diff matches stated intent; no silent scope creep (A6) | every PR |
| **`ux-surface` a11y + design gate** | WCAG 2.2 AA (axe-core) + impeccable design-quality | PRs that ship/change a UI surface (`apps/desktop/**`) |

The single machine-readable checklist both review tiers consume is
**`../shipyard/_shared/engineering/code-review-policy.yaml`** (one source → no drift). The
deep-review trigger + SPOT-CHECK SLA + QM-daemon backstop are documented in `fleet-conventions.md`.
**A PR does not merge until the gates pass.**

---

## ICM pipeline + the UX-design stage (for UI work)

Substantive changes align with the fleet **ICM** pipeline (in `../shipyard/icm/`). **For any change
that ships or materially changes a UI surface** (Tender's tray UI is most of the repo), follow the
**UX-design sub-stage** (`../shipyard/icm/_config/ux-design.md`): a design brief
(`impeccable shape`), a craft pass (`impeccable craft`), and the **required accessibility +
design-quality gate** (`impeccable audit` + `critique` on top of the axe-core WCAG 2.2 AA floor) —
the `ux-surface` gate above.

---

## How to contribute a PR that passes — checklist

1. **Read** `../.wolf/cerebrum.md` (Do-Not-Repeat) + `../.wolf/buglog.json` first.
2. **Branch from clean `origin/main`** into `./.worktrees/<branch>/`.
3. **Scope tightly** — diff matches the PR's stated intent.
4. **Run the gate locally** — `npm run build` in `apps/desktop/`; `impeccable audit` if you touched
   a UI surface.
5. **Commit clean** — conventional subject; mind the footer-traps in the body; wrap ≤100 chars.
6. **Open a PR** stating intent + any `@standing-pattern:` claim (in the description).
7. **Let the gates run** and fix what they surface. Merge on green.
8. **Close the learning loop** — update `../.wolf/cerebrum.md` / `../.wolf/buglog.json` if durable.

---

## Governance reference

The agentic-SDLC governance overlay (three-actor model, CP/AP authority, anti-pattern index, and
the model-agnostic posture) is **ADR 0130** (`../shipyard/docs/adrs/0130-agentic-sdlc-doctrine.md`).
Its gates and governance apply to **any agent, any model** — the gates, not the model, are the
enforcement.
