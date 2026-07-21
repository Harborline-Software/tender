// Palette bridge: tender product tokens → @shipyard/workspace-shell chrome tokens
// (dual-surface toolbox, shipyard #2973).
//
// WorkspaceShell's stylesheet reads `--shell-*` tokens that fall back to the
// `--eco-*` / `--brand-*` chrome tokens, which in turn fall back to system colors
// (Canvas / CanvasText). We define the `--eco-*` / `--brand-*` inputs from the
// tender palette so the shipyard workspace chrome wears the Harborline identity
// instead of the generic system fallback.
//
// One-Accent Rule: `--brand-primary` / `--eco-focus` = the interactive BLUE only.
// Beacon-amber (signal) is deliberately NOT mapped onto any chrome token.
import { dark, light, type Theme } from '@/theme/tokens'

function bridge(t: Theme): Record<string, string> {
  return {
    // Surfaces the shell derives --shell-surface / --shell-raised / --shell-text
    // / --shell-border / --shell-focus from:
    '--eco-surface': t.bg,
    '--eco-surface-raised': t.bgSoft,
    '--eco-text': t.text,
    '--eco-border': t.border,
    '--eco-focus': t.accent,
    // Brand accent — action/selection blue (One-Accent Rule).
    '--brand-primary': t.accent,
    '--brand-primary-on-dark': t.accentBright,
    '--brand-border': t.border,
  }
}

export const shellVars = {
  dark: bridge(dark),
  light: bridge(light),
} as const
