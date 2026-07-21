import { useEffect } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { shellVars } from './shellTheme'

/**
 * Applies the tender→WorkspaceShell palette bridge as documentElement inline
 * custom properties whenever the resolved mode flips, so the shipyard workspace
 * chrome renders in the Harborline palette rather than the system fallback.
 *
 * tender's ThemeProvider already stamps `.dark` / `.light` (and the
 * workspace-shell stylesheet is `.dark` / `[data-theme=dark]`-aware), so one
 * theme source drives both the tender content layer and the shell chrome; this
 * component only adds the `--eco-*` / `--brand-*` colour inputs.
 */
export function ShellThemeBridge() {
  const { mode } = useTheme()
  useEffect(() => {
    const root = document.documentElement
    // WorkspaceShell's stylesheet keys dark styling off [data-theme]; mirror the
    // ThemeProvider's `.dark`/`.light` class onto it so both selectors agree.
    root.setAttribute('data-theme', mode)
    const vars = shellVars[mode]
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  }, [mode])
  return null
}
