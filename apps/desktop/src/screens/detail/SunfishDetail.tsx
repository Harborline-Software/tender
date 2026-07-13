import { useState } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { MenuShell } from '@/components/MenuShell'
import { DetailHeader } from '@/components/DetailHeader'
import { StatusPill } from '@/components/StatusPill'
import { FiberDivider } from '@/components/FiberDivider'
import { ActionFooter } from '@/components/ActionFooter'
import { ConsoleRow } from '@/components/ConsoleRow'
import { LogViewerSheet } from '@/components/LogViewerSheet'
import { useServices } from '@/ipc/useTelemetry'

const TASKS = [
  { name: 'sunfish.crawler/12',   status: 'running', pct: 78 },
  { name: 'sunfish.indexer/03',   status: 'running', pct: 42 },
  { name: 'sunfish.ingest/north', status: 'running', pct: 61 },
  { name: 'sunfish.reducer/main', status: 'running', pct: 24 },
  { name: 'sunfish.dedupe/aux',   status: 'queued',  pct: 0  },
]

interface Props {
  onBack: () => void
}

export function SunfishDetail({ onBack }: Props) {
  const { theme } = useTheme()
  const a = theme.accent
  const services = useServices(5000)
  const sf = services?.find((s) => s.id === 'sunfish')
  const [logsOpen, setLogsOpen] = useState(false)

  const running = sf?.status === 'running'
  const activeTasks = sf?.activeTasks ?? 7
  const pillText = running ? 'Running' : (sf ? 'Stopped' : 'Polling')
  const pillTone = running ? undefined : (sf?.status === 'stopped' ? theme.danger : theme.textMuted)

  if (logsOpen) {
    return (
      <LogViewerSheet
        serviceId="sunfish"
        serviceLabel="Sunfish Logs"
        onClose={() => setLogsOpen(false)}
      />
    )
  }

  return (
    <MenuShell>
      <DetailHeader
        title="Sunfish Operations"
        sub={`${activeTasks} active · 12 queued`}
        onBack={onBack}
        badge={<StatusPill text={pillText} tone={pillTone} />}
      />

      <div style={{ padding: '10px 14px 6px', display: 'flex', gap: 16 }}>
        {[
          { label: 'tasks/min', value: running ? '↑ 38' : '—', tone: theme.accentBright },
          { label: 'errors',    value: '0',                      tone: theme.text },
          { label: 'queue',     value: '12',                     tone: theme.text },
        ].map((m) => (
          <div key={m.label}>
            <div style={{ fontFamily: theme.fontMono, fontSize: 9, letterSpacing: 1.4, color: theme.textMuted, textTransform: 'uppercase' }}>{m.label}</div>
            <div style={{ fontFamily: theme.fontMono, fontSize: 18, color: m.tone, lineHeight: 1.1, textShadow: m.tone === theme.accentBright ? `0 0 6px ${a}88` : undefined }}>{m.value}</div>
          </div>
        ))}
      </div>

      <FiberDivider dim />

      {TASKS.map((t, i) => (
        <div key={t.name} style={{
          padding: '7px 14px',
          borderBottom: i < TASKS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          opacity: running ? 1 : 0.4,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontFamily: theme.fontMono, fontSize: 10, color: theme.text, letterSpacing: 0.3 }}>{t.name}</span>
            <span style={{ fontFamily: theme.fontMono, fontSize: 9, color: t.status === 'queued' ? theme.textMuted : a, letterSpacing: 0.6, textTransform: 'uppercase' }}>{t.status}</span>
          </div>
          <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${t.pct}%`, background: `linear-gradient(90deg, ${a}88, ${a})`, boxShadow: `0 0 4px ${a}aa` }} />
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

      <ActionFooter primary="Open Workspace" secondary="Pause All" />
    </MenuShell>
  )
}
