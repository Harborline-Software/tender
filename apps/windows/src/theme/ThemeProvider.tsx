import { createContext, useState, useEffect, type ReactNode } from 'react';
import { THEMES, type Theme, type ThemeMode } from './tokens';

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: THEMES.dark,
  mode: 'dark',
  setMode: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  // Sync with OS preference on mount.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setMode(mq.matches ? 'dark' : 'light');
    const handler = (e: MediaQueryListEvent) => setMode(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggle = () => setMode(m => (m === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme: THEMES[mode], mode, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
