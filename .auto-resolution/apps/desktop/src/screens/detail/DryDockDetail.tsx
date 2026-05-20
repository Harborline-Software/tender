import { useTheme } from '@/theme/ThemeProvider'
import { MenuShell } from '@/components/MenuShell'
import { DetailHeader } from '@/components/DetailHeader'
import { StatusPill } from '@/components/StatusPill'
import { FiberDivider } from '@/components/FiberDivider'
import { ActionFooter } from '@/components/ActionFooter'

const WILL_STOP = [
  'Signal-Bridge Linkage',
  'Sunfish Operations',
  'Flight-Deck Control · 7 workers',
  'Fiber trace collector',
  'Tender helm process',
]

interface Props {
  onBack: () => void
}

export function DryDockDetail({ onBack }: Props) {
  const { theme } = useTheme()
  const d = theme.danger

  return (
    <MenuShell>
      <DetailHeader
        title="Dry Dock"
        sub="Graceful shutdown · confirm"
        onBack={onBack}
        badge={<StatusPill text="Standby" tone={d} />}
      />

      <div style={{ padding: '12px 14px 10px', display: 'flex', gap: 10, background: `${d}10` }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
          <path d="M9 1 L 17 16 L 1 16 Z" stroke={d} strokeWidth="1.5" strokeLinejoin="round" />
          <line x1="9" y1="7" x2="9" y2="11" stroke={d} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="9" cy="13.5" r="0.8" fill={d} />
        </svg>
        <div style={{ fontSize: 11.5, color: theme.text, lineHeight: 1.4 }}>
          Stops Tender and all wired Harborline services on this node. Logs and state are preserved.
        </div>
      </div>

      <FiberDivider dim />

      <div style={{ padding: '8px 14px 4px', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: theme.textMuted }}>
        ↳ Will stop
      </div>

      {WILL_STOP.map((s, i) => (
        <div key={s} style={{
          padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 9,
          borderBottom: i < WILL_STOP.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
        }}>
          <span style={{ width: 4, height: 4, borderRadius: 99, background: d, boxShadow: `0 0 4px ${d}aa`, flexShrink: 0 }} />
          <span style={{ flex: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: theme.text, letterSpacing: 0.2 }}>{s}</span>
        </div>
      ))}

      <ActionFooter primary="Confirm Shutdown" secondary="Cancel" danger />
    </MenuShell>
  )
}
