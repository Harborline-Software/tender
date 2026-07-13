import React, { createContext, useContext, useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { type Theme, dark, light } from './tokens'
import { getAppearance } from '@/ipc/tauri'

interface ThemeContextValue {
  theme: Theme
  mode: 'dark' | 'light'
}

const ThemeContext = createContext<ThemeContextValue>({ theme: dark, mode: 'dark' })

const STORAGE_KEY = 'tender-theme'

function storedMode(): 'dark' | 'light' | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
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
  const [mode, setMode] = useState<'dark' | 'light'>(() => storedMode() ?? 'dark')

  useEffect(() => {
    getAppearance().then(setMode).catch(() => {})

    let unlisten: (() => void) | undefined
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      listen<string>('appearance-changed', (e) => {
        setMode(e.payload === 'light' ? 'light' : 'dark')
      }).then((fn) => { unlisten = fn })
    }

    return () => { unlisten?.() }
  }, [])

  useEffect(() => { applyMode(mode) }, [mode])

  const theme = mode === 'light' ? light : dark

  return (
    <ThemeContext.Provider value={{ theme, mode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
