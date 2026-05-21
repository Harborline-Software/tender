import React, { createContext, useContext, useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { type Theme, dark, light } from './tokens'
import { getAppearance } from '@/ipc/tauri'

interface ThemeContextValue {
  theme: Theme
  mode: 'dark' | 'light'
}

const ThemeContext = createContext<ThemeContextValue>({ theme: dark, mode: 'dark' })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    getAppearance().then(setMode).catch(() => setMode('dark'))

    // Listen for appearance-changed events from the Rust backend (M2+).
    let unlisten: (() => void) | undefined
    listen<string>('appearance-changed', (e) => {
      setMode(e.payload === 'light' ? 'light' : 'dark')
    }).then((fn) => { unlisten = fn })

    return () => { unlisten?.() }
  }, [])

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
