/**
 * MenuShell — outer container for all Tender panel views.
 *
 * F1.2: clamp height to calc(100vh - 44px) so the panel never runs off the
 * bottom of the screen when anchored to a macOS menu bar (~24px) plus a safe
 * margin. Content scrolls inside; the header + Dry Dock stay pinned.
 */
import React from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { FiberDivider } from './FiberDivider'

interface Props {
  children: React.ReactNode
}

export function MenuShell({ children }: Props) {
  const { theme } = useTheme()
  const a = theme.accent

  return (
    <div
      style={{
        // CIC amendment (tender#103 fix pass 2): widened 360 -> 440. At 360px the
        // header's workspace/host chip (e.g. "MacBook Pro 2016") wrapped to 3
        // lines and crowded the row. This supersedes the card's original "popup
        // pixel-role unchanged" clause for WIDTH specifically — density/role
        // (dense rows, tray-native chrome, unchanged bundle) is otherwise intact.
        width: 440,
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
