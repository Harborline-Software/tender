import React, { useState } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { ConsoleIndicator, type IndicatorKind } from './ConsoleIndicator'

interface Props {
  name: string
  subLabel?: string
  meter?: string
  indicator?: IndicatorKind
  active?: boolean
  danger?: boolean
  pulsing?: boolean
  badge?: React.ReactNode
  onClick?: () => void
  children?: React.ReactNode
}

export function ConsoleRow({ name, subLabel, meter, indicator, active = false, danger = false, pulsing = false, badge, onClick, children }: Props) {
  const { theme } = useTheme()
  const [hovered, setHovered] = useState(false)
  const a = theme.accent
  const dc = danger ? theme.danger : a

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '8px 14px 8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        background: hovered
          ? `linear-gradient(180deg, ${theme.surface} 0%, ${theme.bgSoft} 100%)`
          : `linear-gradient(180deg, ${theme.bgSoft} 0%, ${theme.bg} 100%)`,
        borderTop: '1px solid rgba(255,255,255,0.025)',
        borderBottom: '1px solid rgba(0,0,0,0.28)',
        boxShadow: hovered ? `inset 0 0 16px ${dc}14, inset 2px 0 0 ${dc}` : undefined,
        cursor: onClick ? 'pointer' : 'default',
        minHeight: 46,
        transition: 'background 120ms ease, box-shadow 120ms ease',
        flexShrink: 0,
      }}
    >
      {/* Indicator column — 14px wide */}
      <div style={{
        width: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        ...(pulsing ? {
          animation: 'statusTransition 2s ease-out 1 forwards',
          '--status-color': dc,
          borderRadius: '50%',
        } as React.CSSProperties : {}),
      }}>
        {indicator ? (
          <ConsoleIndicator kind={indicator} color={dc} active={active || danger} dimColor={theme.textMuted} />
        ) : (
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: active || danger ? dc : theme.textMuted,
            boxShadow: active || danger ? `0 0 4px ${dc}, 0 0 8px ${dc}88` : undefined,
          }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: danger ? theme.danger : theme.text, letterSpacing: 0.1, lineHeight: 1.2 }}>
          {name}
        </div>
        {subLabel && (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8.5,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: theme.textMuted,
            marginTop: 3,
          }}>
            {subLabel}
          </div>
        )}
        {children}
      </div>

      {/* Meter */}
      {meter && (
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          letterSpacing: 0.4,
          color: active || danger ? dc : theme.textDim,
          textShadow: active && !danger ? `0 0 5px ${a}aa` : undefined,
          flexShrink: 0,
        }}>
          {meter}
        </div>
      )}

      {/* Badge slot */}
      {badge}

      {/* Chevron */}
      {onClick && (
        <svg width="6" height="10" viewBox="0 0 6 10" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
          <path d="M1 1l4 4-4 4" stroke={theme.text} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}
