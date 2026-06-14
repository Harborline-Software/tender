# Cerebrum

> OpenWolf's learning memory. Updated automatically as the AI learns from interactions.
> Do not edit manually unless correcting an error.
> Last updated: —

## User Preferences

<!-- How the user likes things done. Code style, tools, patterns, communication. -->

## Key Learnings

<!-- Project-specific conventions discovered during development. -->

- [2026-06-14] OpenWolf scan scope = its own `exclude_patterns` (in `.wolf/config.json`), NOT `.gitignore`. Tender keeps 12+ stale git worktrees under `.worktrees/` (gitignored per fleet convention); they must ALSO be in `exclude_patterns` or `openwolf scan` indexes every worktree copy. `.worktrees` is now in the exclude list — keep it there.

## Do-Not-Repeat

<!-- Mistakes made and corrected. Each entry prevents the same mistake recurring. -->
<!-- Format: [YYYY-MM-DD] Description of what went wrong and what to do instead. -->

- [2026-06-14] Don't trust an `openwolf scan` result without verifying the canonical `apps/` tree is present (`grep '^## apps/' .wolf/anatomy.md`) and worktree refs are zero (`grep -c '.worktrees' .wolf/anatomy.md` → 0). With `.worktrees` un-excluded, the 12 stale worktrees (~480 files) exhausted `max_files:500` before the walker reached `apps/`, so the real source tree was silently missing from anatomy. Fix was adding `.worktrees` to `exclude_patterns` + re-scan (see buglog bug-001).

## Decision Log

<!-- Significant technical decisions with rationale. Why X was chosen over Y. -->
