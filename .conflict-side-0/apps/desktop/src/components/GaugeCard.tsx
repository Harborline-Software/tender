import { useState } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { Dial } from './Dial'

interface Props {
  label: string         // e.g. "LINK"
  value: number
  max: number
  sub: string           // e.g. "MB/S"
  reading: string       // center text on dial, e.g. "12.3"
  bottom: string        // service name below card, e.g. "Signal-Bridge"
  updateAvailable?: boolean
  onClick?: () => void
}

export function GaugeCard({ label, value, max, sub, reading, bottom, updateAvailable = false, onClick }: Props) {
  const { theme } = useTheme()
  const [hovered, setHovered] = useState(false)
  const a = theme.accent

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick?.() : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '10px 8px',
        borderRadius: 6,
        background: hovered ? `${a}10` : 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 120ms ease',
      }}
    >
      {/* Gauge label above dial */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 8.5,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        color: theme.textMuted,
      }}>
        {label}
      </div>

      <Dial value={value} max={max} label={reading} sub={sub} updateAvailable={updateAvailable} />

      {/* Service name below dial */}
      <div style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 10,
        color: theme.textDim,
        letterSpacing: 0.3,
        textAlign: 'center',
      }}>
        {bottom}
      </div>
    </div>
  )
}
