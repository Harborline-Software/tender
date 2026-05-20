# Tender · Specification

Implementation contract for the Tender Windows tray application. This folder
is the source of truth — the prototype (`/index.html`) is the visual source
of truth for materials/composition, but behavior, data shapes, and platform
integration are specified here.

## Contents

| File | Purpose |
|---|---|
| `PRODUCT.md` | What Tender is, who it's for, the full feature list, user stories, success criteria |
| `DESIGN.md` | Visual design system — palette, typography, components, motion, the locked logomark |
| `SCREENS.md` | Every screen and popover, with content, layout dimensions, and interaction details |
| `IMPLEMENTATION.md` | Tech stack, project structure, data shapes, platform integration, build/deploy |

## How these documents relate

```
PRODUCT  ──┐
           ├──> SCREENS ──> IMPLEMENTATION
DESIGN   ──┘
```

- `PRODUCT` defines **what** to build.
- `DESIGN` defines **how it looks**.
- `SCREENS` glues those together — for each user-facing surface, here are
  the elements from DESIGN arranged to serve the features from PRODUCT.
- `IMPLEMENTATION` is **how to build it** in code.

## Conventions used in these docs

- **Tokens** are referenced with `theme.accent`, `theme.bg`, etc. Their
  resolved values are in `DESIGN.md`.
- **Dimensions** are in CSS pixels at 1× DPI. Tender renders at 100% on
  standard Windows DPI; respect Windows scaling for high-DPI displays.
- **State** uses these terms consistently:
  - *active* — service is online + healthy
  - *idle* — service is on but inactive (no traffic / 0 tasks)
  - *offline* — service is not running
  - *paused* — manually stopped, will resume on user action
- "Engine Room" is the palette name. The whole product is named "Tender".
  Don't confuse the two.

## Process for spec changes

If a spec document is unclear or implementation reveals a gap:

1. **Don't guess.** Flag the question in PR review or with the product
   owner.
2. **Update the spec first.** Once a decision is made, update the relevant
   doc and link the PR/decision before merging code.
3. **Prototype is reference, not contract.** If the prototype contradicts
   the spec, the spec wins. Update the prototype to match.
