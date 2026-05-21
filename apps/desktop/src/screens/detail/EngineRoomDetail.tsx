import { useTheme } from '@/theme/ThemeProvider'
import { MenuShell } from '@/components/MenuShell'
import { DetailHeader } from '@/components/DetailHeader'
import { StatusPill } from '@/components/StatusPill'
import { FiberDivider } from '@/components/FiberDivider'
import { MeterBar } from '@/components/MeterBar'
import { ActionFooter } from '@/components/ActionFooter'
import { useSystemStats } from '@/ipc/useTelemetry'
import { quitApp, collectDiagnostics, openExternal } from '@/ipc/tauri'

function fmtMem(bytes: number) {
  const g = bytes / 1e9
  return g >= 1 ? `${g.toFixed(1)}G` : `${Math.round(bytes / 1e6)}M`
}

interface Props {
  onBack: () => void
}

export function EngineRoomDetail({ onBack }: Props) {
  const { theme } = useTheme()
  const a = theme.accent
  const stats = useSystemStats(3000)

  const cpu = stats ? Math.round(stats.cpu) : 0
  const memUsed = stats ? stats.memUsedBytes / 1e9 : 0
  const memTotal = stats ? stats.memTotalBytes / 1e9 : 16
  const diskUsed = stats ? stats.diskUsedBytes / 1e9 : 0
  const diskTotal = stats ? stats.diskTotalBytes / 1e9 : 1000
  const netMbps = stats ? stats.netMbps : 0

  const procs = stats?.topProcesses ?? []

  return (
    <MenuShell>
      <DetailHeader
        title="Engine Room"
        sub="Local node · steamtide-mac"
        onBack={onBack}
        badge={<StatusPill text={stats ? 'Live' : 'Polling'} />}
      />

      <MeterBar label="CPU"     value={cpu}     max={100}          unit="%" />
      <MeterBar label="Memory"  value={memUsed}  max={memTotal}    unit=" G" />
      <MeterBar label="Disk"    value={diskUsed} max={diskTotal}   unit=" G" />
      <MeterBar label="Network" value={netMbps}  max={stats?.netMaxMbps ?? 1000} unit=" mb/s" />

      <FiberDivider dim />

      <div style={{ padding: '8px 14px 4px', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: theme.textMuted }}>
        ↳ Top processes
      </div>

      {procs.map((p, i) => (
        <div key={p.name + i} style={{
          padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: i < procs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
        }}>
          <span style={{
            flex: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: p.isHarborline ? theme.accentBright : theme.text,
            letterSpacing: 0.2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{p.name}</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: a, letterSpacing: 0.3, width: 36, textAlign: 'right' }}>{p.cpu.toFixed(1)}%</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: theme.textDim, letterSpacing: 0.3, width: 44, textAlign: 'right' }}>{fmtMem(p.memBytes)}</span>
        </div>
      ))}

      {procs.length === 0 && (
        <div style={{ padding: '10px 14px', fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: theme.textMuted, textAlign: 'center' }}>
          Polling…
        </div>
      )}

      <ActionFooter
        primary="Full Diagnostics"
        secondary="Restart Tender"
        onPrimary={() => collectDiagnostics().then((path) => openExternal(path)).catch(() => {})}
        onSecondary={() => quitApp().catch(() => {})}
      />
    </MenuShell>
  )
}
