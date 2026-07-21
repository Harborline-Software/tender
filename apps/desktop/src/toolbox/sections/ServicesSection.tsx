import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { Activity, Cpu, HardDrive, Network } from 'lucide-react'
import { useTheme } from '@/theme/ThemeProvider'
import { getLocalServices, getSystemStats, type ProcessData, type StatsData } from '@/ipc/tauri'
import { MasterDetail, MasterRow, MasterHeader, PaneHeader, EmptyState, SkeletonList } from '../ui'

function fmtBytes(n: number): string {
  if (n <= 0) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)))
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${u[i]}`
}

const PROC_KEY = (p: ProcessData) => `${p.name}:${p.pid ?? 'n'}`

export function ServicesSection({ narrow, query, focusItem }: { narrow: boolean; query: string; focusItem: string | null }) {
  const [procs, setProcs] = useState<ProcessData[] | null>(null)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const refresh = useCallback(() => {
    getLocalServices().then((p) => setProcs(p)).catch(() => setProcs((prev) => prev ?? []))
    getSystemStats().then((s) => setStats(s)).catch(() => {})
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 4000)
    return () => clearInterval(id)
  }, [refresh])
  useEffect(() => { if (focusItem) setSelected(focusItem) }, [focusItem])

  const filtered = useMemo(() => {
    if (!procs) return null
    const q = query.trim().toLowerCase()
    const base = q ? procs.filter((p) => p.name.toLowerCase().includes(q)) : procs
    // Harborline services first, then by CPU.
    return [...base].sort((a, b) => Number(b.isHarborline) - Number(a.isHarborline) || b.cpu - a.cpu)
  }, [procs, query])

  const selectedProc = filtered?.find((p) => PROC_KEY(p) === selected) ?? null

  const master = (
    <div>
      <MasterHeader label="Services" count={filtered ? `${filtered.length}` : undefined} />
      {filtered === null && <SkeletonList />}
      {filtered !== null && filtered.length === 0 && (
        <EmptyState title="No processes" hint="No local services are running, or process listing is unavailable on this host." />
      )}
      {filtered?.map((p) => (
        <MasterRow
          key={PROC_KEY(p)}
          icon={<Activity size={15} />}
          title={p.name}
          sub={`${p.cpu.toFixed(0)}% CPU · ${fmtBytes(p.memBytes)}${p.isHarborline ? ' · Harborline' : ''}`}
          tone={p.isHarborline ? 'healthy' : undefined}
          selected={PROC_KEY(p) === selected}
          onClick={() => setSelected(PROC_KEY(p))}
        />
      ))}
    </div>
  )

  const detail = selectedProc ? (
    <div>
      <PaneHeader
        title={selectedProc.name}
        sub={selectedProc.isHarborline ? 'Harborline service' : 'local process'}
        onBack={narrow ? () => setSelected(null) : undefined}
      />
      <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <Metric label="CPU" value={`${selectedProc.cpu.toFixed(1)}%`} />
        <Metric label="Memory" value={fmtBytes(selectedProc.memBytes)} />
        <Metric label="PID" value={selectedProc.pid != null ? String(selectedProc.pid) : '—'} />
      </div>
    </div>
  ) : (
    <SystemOverview stats={stats} />
  )

  return (
    <MasterDetail
      master={master}
      detail={detail}
      narrow={narrow}
      hasSelection={!!selectedProc}
      masterLabel="Services list"
    />
  )
}

function SystemOverview({ stats }: { stats: StatsData | null }) {
  const { theme } = useTheme()
  return (
    <div>
      <PaneHeader title="System" sub="live host metrics" />
      {!stats ? (
        <div style={{ padding: 18 }}><SkeletonList rows={2} /></div>
      ) : (
        <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <Metric label="CPU" value={`${stats.cpu.toFixed(0)}%`} icon={<Cpu size={14} />} />
          <Metric label="Memory" value={`${fmtBytes(stats.memUsedBytes)} / ${fmtBytes(stats.memTotalBytes)}`} icon={<Activity size={14} />} />
          <Metric label="Disk" value={`${fmtBytes(stats.diskUsedBytes)} / ${fmtBytes(stats.diskTotalBytes)}`} icon={<HardDrive size={14} />} />
          <Metric label="Network" value={`${stats.netMbps.toFixed(1)} Mbps`} icon={<Network size={14} />} />
        </div>
      )}
      <div style={{ padding: '0 18px 18px', fontFamily: theme.fontMono, fontSize: theme.sizeLabel, letterSpacing: 0.6, color: theme.textMuted, lineHeight: 1.6 }}>
        Select a process on the left for its per-service metrics.
      </div>
    </div>
  )
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  const { theme } = useTheme()
  return (
    <div
      style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radiusLg,
        padding: '12px 14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: theme.textMuted, marginBottom: 8 }}>
        {icon}
        <span style={{ fontFamily: theme.fontMono, fontSize: theme.sizeLabel, letterSpacing: 1.2, textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontFamily: theme.fontMono, fontSize: 18, fontWeight: 600, color: theme.text, letterSpacing: 0.4 }}>{value}</div>
    </div>
  )
}
