# Product

## Register

product

## Users

Fleet operators (today: Chris; post-release: developers running Harborline apps locally). They live in the macOS menu bar — the Toolbox is glanced at between tasks, not dwelt in. Context: quick health checks, starting/stopping services, commissioning apps, reading logs when something is wrong. Sessions are seconds to a couple of minutes.

## Product Purpose

Tender ("Harborline Toolbox") is a tray-resident control panel for the Harborline fleet: install/commission apps, watch service health, inspect model inventory / GPU residency / paid-compute spend, and reach logs fast. Success = an operator can answer "is everything ok, and if not, what's wrong?" in under five seconds from the menu bar.

## Brand Personality

Calm, honest, seaworthy. The UI never fabricates state (fail-soft "not configured"/"unreachable" over guessed values — this is enforced in the Rust layer and must stay visible in the UI). Same design family as the Carrier app: Harborline product tokens (interactive blue, beacon-amber signal, semantic green/amber/red), Inter/system type, lucide icons — but tray-native: dense, compact, dark-leaning, following the macOS appearance.

## Anti-references

- Hacker-terminal aesthetic: green-on-black, scanlines, mono-everything ops-tool cosplay. Mono type is for data values only, never ambience.
- Web-app chrome transplanted into a native tray (oversized cards, hero metrics, gradients).

## Design Principles

1. **Glanceable truth** — status reads correctly from 2 feet away; semantic color (green/amber/red) is the only health channel; blue is action/selection only; amber is live/signal only (One-Accent Rule).
2. **Honest states first-class** — "not configured", "unreachable", "unknown" are designed states with guidance, never error styling or blank space.
3. **Tray-native density** — 360px wide, information-dense, macOS-feeling; match Carrier's tokens and primitives, not its window chrome.
4. **Tokens, never literals** — every color/font/radius flows through theme.* (tokens.ts) with WCAG annotations kept current.

## Accessibility & Inclusion

WCAG 2.2 AA. Contrast ratios annotated in tokens.ts for every accent/status value in both modes (existing discipline — keep it). 8.5px minimum label floor already codified. Follows macOS appearance for dark/light. Reduced-motion fallbacks for any added animation.
