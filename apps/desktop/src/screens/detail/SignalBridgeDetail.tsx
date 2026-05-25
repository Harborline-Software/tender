import { useState } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { MenuShell } from '@/components/MenuShell'
import { DetailHeader } from '@/components/DetailHeader'
import { StatusPill } from '@/components/StatusPill'
import { Sparkline } from '@/components/Sparkline'
import { FiberDivider } from '@/components/FiberDivider'
import { ActionFooter } from '@/components/ActionFooter'
import { ConsoleIndicator } from '@/components/ConsoleIndicator'
import { ConsoleRow } from '@/components/ConsoleRow'
import { LogViewerSheet } from '@/components/LogViewerSheet'
import { useServices } from '@/ipc/useTelemetry'
import { restartSignalBridge } from '@/ipc/tauri'

const FALLBACK_SPARKLINE = [9.1, 10.2, 11.8, 10.5, 12.0, 11.3, 13.4, 12.8, 11.5, 12.1, 13.6, 14.2, 13.0, 12.4, 11.8, 12.9, 13.1, 12.7, 11.9, 12.5, 13.8, 12.6, 12.0, 11.7, 12.4, 13.2, 12.9, 12.1, 11.8, 12.3]
const FALLBACK_LINKS = [
  { name: 'harbor-east.tender.local', up: 4.2, down: 6.8 },
  { name: 'harbor-west.tender.local', up: 2.1, down: 3.4 },
  { name: 'flight-deck.local',        up: 1.9, down: 2.1 },
]

interface Props {
  onBack: () => void
}

export function SignalBridgeDetail({ onBack }: Props) {
  const { theme } = useTheme()
  const a = theme.accent
  const services = useServices(5000)
  const sb = services?.find((s) => s.id === 'signal-bridge')
  const [logsOpen, setLogsOpen] = useState(false)

  const running = sb?.status === 'running'
  const mbps = sb?.throughputMbps ?? 0
  const sparkline = sb?.history?.length ? sb.history : FALLBACK_SPARKLINE
  const pillText = running ? 'Healthy' : (sb ? 'Stopped' : 'Polling')
  const pillTone = running ? undefined : (sb?.status === 'stopped' ? theme.danger : theme.textMuted)

  if (logsOpen) {
    return (
      <LogViewerSheet
        serviceId="signal-bridge"
        serviceLabel="Signal-Bridge Logs"
        onClose={() => setLogsOpen(false)}
      />
    )
  }

  return (
    <MenuShell>
      <DetailHeader
        title="Signal-Bridge Linkage"
        sub={`Fiber-routed services · 3 links`}
        onBack={onBack}
        badge={<StatusPill text={pillText} tone={pillTone} />}
      />

      <div style={{ padding: '12px 14px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: theme.textMuted,
          }}>
            Throughput · 5 min
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, color: theme.accentBright, textShadow: `0 0 6px ${a}88` }}>
            {running ? mbps.toFixed(1) : '—'} <span style={{ fontSize: 9, color: theme.textDim }}>MB/S</span>
          </div>
        </div>
        <Sparkline values={sparkline} color={running ? a : theme.textMuted} width={296} height={56} />
      </div>

      <FiberDivider dim />

      <div style={{ padding: '10px 14px 4px', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: theme.textMuted }}>
        ↳ Active fiber links
      </div>

      {FALLBACK_LINKS.map((l, i) => (
        <div key={l.name} style={{
          padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 9,
          borderBottom: i < FALLBACK_LINKS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          opacity: running ? 1 : 0.4,
        }}>
          <ConsoleIndicator kind="port" color={a} active={running} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: theme.text, letterSpacing: 0.1 }}>{l.name}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, color: theme.textMuted, marginTop: 2, letterSpacing: 0.6 }}>
              ↑ {l.up} mb/s   ↓ {l.down} mb/s
            </div>
          </div>
        </div>
      ))}

      <FiberDivider dim />

      <ConsoleRow
        name="View Logs"
        subLabel="Last 200 lines · 5s refresh"
        indicator="port"
        active={false}
        onClick={() => setLogsOpen(true)}
      />

      <ActionFooter
        primary="Restart Link"
        onPrimary={() => restartSignalBridge().catch(() => {})}
      />
    </MenuShell>
  )
}
