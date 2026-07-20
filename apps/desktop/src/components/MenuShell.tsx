/**
 * MenuShell — outer container for all Tender views.
 *
 * Two modes, chosen from the window hash so no prop threading is needed (every
 * screen wraps in MenuShell):
 *  - TRAY (default): the 384px floating menu-bar dropdown, height-clamped to the
 *    viewport, blurred/floating chrome. Hides on focus loss.
 *  - FULL (`index.html#full`): a resizable, decorated window (opened via the
 *    header expand button → `open_full_window`). Fills the window, solid chrome,
 *    content centered at a readable max width. Fixes the tray's inherent
 *    width-clipping for dense views (logs, inventories, ledgers). Refresh #98.
 *
 * F1.2: tray height clamps to calc(100vh - 44px) so the panel never runs off the
 * bottom of the screen when anchored to a macOS menu bar (~24px) plus a margin.
 */
import React from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { FiberDivider } from './FiberDivider'

interface Props {
  children: React.ReactNode
}

/** The window renders the full-size view when its URL hash is `#full`. */
export function isFullWindow(): boolean {
  return typeof window !== 'undefined' && window.location.hash.replace(/^#/, '') === 'full'
}

export function MenuShell({ children }: Props) {
  const { theme } = useTheme()
  const a = theme.accent

  // FULL-window variant: fill the resizable window, solid chrome, centered
  // column at a readable max width so the tray-designed rows aren't stretched.
  if (isFullWindow()) {
    return (
      <div
        style={{
          width: '100%',
          height: '100vh',
          background: theme.bg,
          color: theme.text,
          fontFamily: theme.fontRow,
          display: 'flex',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 680,
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            borderLeft: `1px solid ${theme.border}`,
            borderRight: `1px solid ${theme.border}`,
          }}
        >
          <FiberDivider />
          {children}
        </div>
      </div>
    )
  }

  // TRAY variant (default): the floating 384px menu-bar dropdown.
  return (
    <div
      style={{
        width: theme.panelWidth,
        // F1.2: clamp to viewport minus menubar height; panel hangs below ~24px bar
        maxHeight: 'calc(100vh - 44px)',
        minHeight: 200,
        position: 'relative',
        background: `linear-gradient(180deg, ${theme.bgSoft}f0 0%, ${theme.bg}f4 100%)`,
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(0,0,0,0.55)',
        borderRadius: 10,
        boxShadow: `0 28px 60px ${theme.shadow}, 0 0 32px ${a}28, 0 0 0 1px ${a}1a`,
        color: theme.text,
        overflow: 'hidden',
        fontFamily: theme.fontRow,
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <FiberDivider />
      {children}
    </div>
  )
}
