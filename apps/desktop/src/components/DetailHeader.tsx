import React from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { FiberDivider } from './FiberDivider'

interface Props {
  title: string
  sub?: string
  onBack: () => void
  badge?: React.ReactNode
}

export function DetailHeader({ title, sub, onBack, badge }: Props) {
  const { theme } = useTheme()
  const a = theme.accent
  return (
    <>
      <div style={{
        padding: '11px 14px 11px 10px',
        display: 'flex', alignItems: 'center', gap: 9,
        background: `linear-gradient(180deg, ${theme.bgSoft} 0%, ${theme.bg} 100%)`,
        borderBottom: '1px solid rgba(0,0,0,0.28)',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: 4, borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: theme.text,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${a}22` }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          title="Back"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2 L 4 7 L 9 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1, letterSpacing: 0.2, color: theme.text }}>
            {title}
          </div>
          {sub && (
            <div style={{
              fontFamily: theme.fontMono,
              fontSize: 8.5, letterSpacing: 1.4, color: theme.textMuted,
              marginTop: 4, textTransform: 'uppercase',
            }}>
              {sub}
            </div>
          )}
        </div>

        {badge}
      </div>
      <FiberDivider />
    </>
  )
}
