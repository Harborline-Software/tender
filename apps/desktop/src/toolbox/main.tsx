// Toolbox main-window entry (dual-surface, shipyard #2973).
//
// A SEPARATE document/bundle from the 360px tray popup (src/index.tsx).
// @shipyard/workspace-shell's stylesheet (imported transitively by the
// WorkspaceShell component) — including any chrome reset — is scoped to THIS
// bundle only, so it can never reach the popup's bespoke inline-styled bundle.
// The popup's pixel-role is preserved by construction.
import React from 'react'
import ReactDOM from 'react-dom/client'
import '@/animations.css'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { ShellThemeBridge } from './ShellThemeBridge'
import { ToolboxApp } from './ToolboxApp'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ShellThemeBridge />
      <ToolboxApp />
    </ThemeProvider>
  </React.StrictMode>,
)
