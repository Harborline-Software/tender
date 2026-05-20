import { useTheme } from '@/theme/ThemeProvider'
import { ConsoleRow } from '@/components/ConsoleRow'
import { FiberDivider } from '@/components/FiberDivider'
import { UpdateCountBadge } from '@/components/UpdateCountBadge'
import { type DetailId } from '@/state/types'

interface Props {
  onNavigate: (id: DetailId) => void
}

export function FleetTab({ onNavigate }: Props) {
  const { theme } = useTheme()
  const a = theme.accent

  return (
    <div>
      <div style={{
        padding: '10px 14px 4px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, letterSpacing: 1.4,
          textTransform: 'uppercase', color: theme.textMuted,
        }}>↳ Installed · 3 tools</span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, color: a, letterSpacing: 0.6, cursor: 'pointer',
        }}>+ install</span>
      </div>

      <ConsoleRow
        indicator="port"
        name="Signal-Bridge"
        subLabel="v2.3.1 · running"
        meter="link healthy"
        active
        badge={<UpdateCountBadge count={1} />}
        onClick={() => onNavigate('signal-bridge')}
      />
      <FiberDivider dim />
      <ConsoleRow
        indicator="port"
        name="Sunfish"
        subLabel="v1.8.4 · running"
        meter="7 tasks"
        active
        badge={<UpdateCountBadge count={1} />}
        onClick={() => onNavigate('sunfish')}
      />
      <FiberDivider dim />
      <ConsoleRow
        indicator="port"
        name="Flight-Deck"
        subLabel="v3.0.0 · running"
        meter="7/7 airborne"
        active
        onClick={() => onNavigate('flight-deck')}
      />
    </div>
  )
}
