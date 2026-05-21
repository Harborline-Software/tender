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
        width: 360,
        minHeight: '100vh',
        position: 'relative',
        background: `linear-gradient(180deg, ${theme.bgSoft}f0 0%, ${theme.bg}f4 100%)`,
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(0,0,0,0.55)',
        borderRadius: 10,
        boxShadow: `0 28px 60px ${theme.shadow}, 0 0 32px ${a}28, 0 0 0 1px ${a}1a`,
        color: theme.text,
        overflow: 'hidden',
        fontFamily: "'Space Grotesk', sans-serif",
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
