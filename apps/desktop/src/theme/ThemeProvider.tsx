import React, { createContext, useContext, useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { type Theme, dark, light } from './tokens'
import { getAppearance } from '@/ipc/tauri'

/**
 * Theme PREFERENCE (CIC amendment, tender#103 fix pass 4 — avatar-menu theme
 * segmented control): 'system' keeps the original tray-app behavior
 * (mode source = macOS appearance via IPC); 'light'/'dark' PIN the mode
 * regardless of what IPC reports. Distinct from `mode` (the resolved
 * dark/light the app actually renders) and from the existing
 * `STORAGE_KEY`-backed pre-paint fallback (below), which continues to cache
 * whatever the last RESOLVED mode was for first-paint, unaffected by this.
 */
export type ThemePreference = 'light' | 'system' | 'dark'

interface ThemeContextValue {
  theme: Theme
  mode: 'dark' | 'light'
  preference: ThemePreference
  setPreference: (next: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: dark,
  mode: 'dark',
  preference: 'system',
  setPreference: () => {},
})

const STORAGE_KEY = 'tender-theme'
const PREFERENCE_KEY = 'tender-theme-preference'

function storedMode(): 'dark' | 'light' | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

function storedPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(PREFERENCE_KEY)
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
  } catch {
    return 'system'
  }
}

/**
 * Product theme convention (mirrors Carrier's useCarrierTheme): the resolved
 * mode is stamped as a `.dark`/`.light` class on `documentElement` and
 * persisted to localStorage, and the token set is exported as semantic
 * kebab-case CSS custom properties (`--color-bg`, `--color-accent`, …) so
 * stylesheets can consume the same values as the typed `theme.*` object.
 * The mode SOURCE stays the macOS appearance via IPC — a tray app follows
 * the system; localStorage is the pre-IPC first-paint fallback.
 */
function applyMode(mode: 'dark' | 'light') {
  const root = document.documentElement
  root.classList.toggle('dark', mode === 'dark')
  root.classList.toggle('light', mode === 'light')
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // storage unavailable (private mode) — class stamping still applies
  }
  const t = mode === 'light' ? light : dark
  const vars: Record<string, string> = {
    '--color-bg': t.bg,
    '--color-bg-soft': t.bgSoft,
    '--color-surface': t.surface,
    '--color-text': t.text,
    '--color-text-dim': t.textDim,
    '--color-text-muted': t.textMuted,
    '--color-border': t.border,
    '--color-shadow': t.shadow,
    '--color-accent': t.accent,
    '--color-accent-bright': t.accentBright,
    '--color-signal': t.signal,
    '--color-healthy': t.healthy,
    '--color-warn': t.warn,
    '--color-danger': t.danger,
    '--font-display': t.fontDisplay,
    '--font-row': t.fontRow,
    '--font-mono': t.fontMono,
    '--radius-lg': `${t.radiusLg}px`,
    '--radius-full': `${t.radiusFull}px`,
  }
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // systemMode = what macOS appearance actually is (IPC-driven, unchanged from
  // before). preference = the user's explicit choice (Light / System / Dark),
  // new in fix pass 4. `mode` (the resolved value everything else consumes) is
  // systemMode UNLESS the user pinned a preference — pinning ignores IPC
  // updates until the user switches back to System.
  const [systemMode, setSystemMode] = useState<'dark' | 'light'>(() => storedMode() ?? 'dark')
  const [preference, setPreferenceState] = useState<ThemePreference>(() => storedPreference())

  useEffect(() => {
    getAppearance().then(setSystemMode).catch(() => {})

    let unlisten: (() => void) | undefined
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      listen<string>('appearance-changed', (e) => {
        setSystemMode(e.payload === 'light' ? 'light' : 'dark')
      }).then((fn) => { unlisten = fn })
    }

    return () => { unlisten?.() }
  }, [])

  const mode = preference === 'system' ? systemMode : preference

  useEffect(() => { applyMode(mode) }, [mode])

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next)
    try {
      localStorage.setItem(PREFERENCE_KEY, next)
    } catch {
      // storage unavailable — the choice still applies for this session
    }
  }

  const theme = mode === 'light' ? light : dark

  return (
    <ThemeContext.Provider value={{ theme, mode, preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
