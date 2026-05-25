import { useState } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { MenuShell } from '@/components/MenuShell'
import { DetailHeader } from '@/components/DetailHeader'
import { StatusPill } from '@/components/StatusPill'
import { ActionFooter } from '@/components/ActionFooter'
import { FiberDivider } from '@/components/FiberDivider'
import { ConsoleRow } from '@/components/ConsoleRow'
import { LogViewerSheet } from '@/components/LogViewerSheet'
import { useServices } from '@/ipc/useTelemetry'
import { openExternal, emergencyStop } from '@/ipc/tauri'

const WORKERS = [
  { id: 1, util: 88, temp: 71 },
  { id: 2, util: 92, temp: 73 },
  { id: 3, util: 78, temp: 68 },
  { id: 4, util: 95, temp: 76 },
  { id: 5, util: 81, temp: 70 },
  { id: 6, util: 89, temp: 72 },
  { id: 7, util: 83, temp: 69 },
]

interface Props {
  onBack: () => void
}

export function FlightDeckDetail({ onBack }: Props) {
  const { theme } = useTheme()
  const a = theme.accent
  const services = useServices(5000)
  const fd = services?.find((s) => s.id === 'flight-deck')
  const [logsOpen, setLogsOpen] = useState(false)

  const running = fd?.status === 'running'
  const airborne = fd?.airborne ?? 7
  const total = fd?.totalWorkers ?? 7
  const pillText = running ? 'Airborne' : (fd ? 'Grounded' : 'Polling')
  const pillTone = running ? undefined : (fd?.status === 'stopped' ? theme.danger : theme.textMuted)

  if (logsOpen) {
    return (
      <LogViewerSheet
        serviceId="flight-deck"
        serviceLabel="Flight-Deck Logs"
        onClose={() => setLogsOpen(false)}
      />
    )
  }

  return (
    <MenuShell>
      <DetailHeader
        title="Flight-Deck Control"
        sub={`${airborne} of ${total} workers airborne`}
        onBack={onBack}
        badge={<StatusPill text={pillText} tone={pillTone} />}
      />

      <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {WORKERS.map((w) => (
          <div key={w.id} style={{
            padding: '8px 6px 6px',
            background: `linear-gradient(180deg, ${theme.bgSoft} 0%, ${theme.bg} 100%)`,
            border: `1px solid ${running ? a : theme.border}33`,
            borderRadius: 4,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            boxShadow: running ? `inset 0 0 8px ${a}10` : 'none',
            opacity: running ? 1 : 0.45,
          }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: 0.8, color: theme.textMuted }}>GPU·{w.id}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: theme.accentBright, textShadow: running ? `0 0 5px ${a}88` : 'none' }}>
              {w.util}<span style={{ fontSize: 8, opacity: 0.7 }}>%</span>
            </div>
            <div style={{ height: 1.5, width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${w.util}%`, background: a, boxShadow: running ? `0 0 3px ${a}` : 'none' }} />
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 7.5,
              color: w.temp > 75 ? '#f0b370' : theme.textMuted,
              letterSpacing: 0.4,
            }}>{w.temp}&deg;C</div>
          </div>
        ))}
        {/* spare slot */}
        <div style={{
          padding: '8px 6px 6px',
          border: `1px dashed ${theme.border}`,
          borderRadius: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 60,
        }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase' }}>spare</span>
        </div>
      </div>

      <FiberDivider dim />

      <ConsoleRow
        name="View Logs"
        subLabel="Last 200 lines · 5s refresh"
        indicator="port"
        active={false}
        onClick={() => setLogsOpen(true)}
      />

      <ActionFooter
        primary="Open Dashboard"
        secondary="Emergency Stop"
        danger
        onPrimary={() => openExternal('http://localhost:3080').catch(() => {})}
        onSecondary={() => {
          if (window.confirm('Send emergency stop to all Flight-Deck GPU workers?')) {
            emergencyStop().catch(() => {})
          }
        }}
      />
    </MenuShell>
  )
}
