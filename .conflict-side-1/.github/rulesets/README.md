# GitHub Rulesets — tender

Branch and tag rulesets for the tender (tray toolbox) repo.

## Files

| File | Target | Purpose |
|---|---|---|
| `main-branch.json` | `~DEFAULT_BRANCH` | Gate merges into `main` behind PR review + lightweight CI |
| `release-tags.json` | `refs/tags/v*` | Prevent deletion or rewriting of release tags |

## Apply

```bash
gh api -X POST repos/Harborline-Software/tender/rulesets \
  --input .github/rulesets/main-branch.json

gh api -X POST repos/Harborline-Software/tender/rulesets \
  --input .github/rulesets/release-tags.json
```

## Required checks

- **Lint PR commits** — `.github/workflows/commitlint.yml`
- **Scan workflows for banned triggers** — `.github/workflows/ban-pull-request-target.yml`
- **Shellcheck menubar plugin scripts** — `.github/workflows/shellcheck.yml`
