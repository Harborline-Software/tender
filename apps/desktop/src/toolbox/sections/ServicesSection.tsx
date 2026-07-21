import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Activity, Cpu, HardDrive, Network, Server, Ship } from 'lucide-react'
import { useTheme } from '@/theme/ThemeProvider'
import {
  getLocalServices,
  getSystemStats,
  getShipHosts,
  type ProcessData,
  type StatsData,
  type ShipHostSummary,
} from '@/ipc/tauri'
import { MasterRow, MasterHeader, PaneHeader, EmptyState, SkeletonList, DetailPlaceholder } from '../ui'
import { ShipsHostView } from './ships/ShipsHostView'

function fmtBytes(n: number): string {
  if (n <= 0) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)))
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${u[i]}`
}

const PROC_KEY = (p: ProcessData) => `${p.name}:${p.pid ?? 'n'}`

type View = 'node' | 'ships'

interface Props {
  narrow: boolean
  query: string
  focusItem: string | null
  /** Portal target in the shell's navigation region (CIC design amendment,
   *  tender#103) — see FleetSection for the pattern. */
  masterSlotEl: HTMLElement | null
}

export function ServicesSection({ narrow, query, focusItem, masterSlotEl }: Props) {
  // ── View toggle: local processes ("This node") vs remote hosts ("Ships"). ──
  // Ships (shipyard#2998) adds per-host remote service control; "This node" is
  // the pre-existing local process view, unchanged.
  const [view, setView] = useState<View>('node')

  const [procs, setProcs] = useState<ProcessData[] | null>(null)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const [hosts, setHosts] = useState<ShipHostSummary[] | null>(null)
  const [shipHost, setShipHost] = useState<string | null>(null)

  const refresh = useCallback(() => {
    getLocalServices().then((p) => setProcs(p)).catch(() => setProcs((prev) => prev ?? []))
    getSystemStats().then((s) => setStats(s)).catch(() => {})
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 4000)
    return () => clearInterval(id)
  }, [refresh])

  // Load the ship-host allowlist once the operator opens the Ships view.
  useEffect(() => {
    if (view !== 'ships' || hosts !== null) return
    getShipHosts()
      .then((h) => {
        setHosts(h)
        if (h.length > 0) setShipHost((cur) => cur ?? h[0].id)
      })
      .catch(() => setHosts([]))
  }, [view, hosts])

  useEffect(() => {
    if (focusItem) {
      setView('node')
      setSelected(focusItem)
    }
  }, [focusItem])

  const filtered = useMemo(() => {
    if (!procs) return null
    const q = query.trim().toLowerCase()
    const base = q ? procs.filter((p) => p.name.toLowerCase().includes(q)) : procs
    // Harborline services first, then by CPU.
    return [...base].sort((a, b) => Number(b.isHarborline) - Number(a.isHarborline) || b.cpu - a.cpu)
  }, [procs, query])

  const filteredHosts = useMemo(() => {
    if (!hosts) return null
    const q = query.trim().toLowerCase()
    return q ? hosts.filter((h) => h.displayName.toLowerCase().includes(q)) : hosts
  }, [hosts, query])

  const selectedProc = filtered?.find((p) => PROC_KEY(p) === selected) ?? null

  // ── Master (portaled into the shell's navigation region) ───────────────────
  const master = (
    <div>
      <ViewToggle view={view} onChange={setView} />
      {view === 'node' ? (
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
      ) : (
        <div>
          <MasterHeader label="Ships" count={filteredHosts ? `${filteredHosts.length}` : undefined} />
          {filteredHosts === null && <SkeletonList rows={2} />}
          {filteredHosts !== null && filteredHosts.length === 0 && (
            <EmptyState title="No hosts" hint="No remote hosts are allow-listed for ship service control." />
          )}
          {filteredHosts?.map((h) => (
            <MasterRow
              key={h.id}
              icon={<Server size={15} />}
              title={h.displayName}
              sub={h.classified ? h.sshTarget : `${h.sshTarget} · no classification`}
              selected={h.id === shipHost}
              onClick={() => setShipHost(h.id)}
            />
          ))}
        </div>
      )}
    </div>
  )

  // ── Detail (rendered in the shell's main region) ───────────────────────────
  let detail: ReactNode
  if (view === 'ships') {
    detail = shipHost ? (
      <ShipsHostView
        key={shipHost}
        hostId={shipHost}
        onBack={narrow ? () => setShipHost(null) : undefined}
      />
    ) : (
      <DetailPlaceholder
        icon={<Ship size={28} />}
        sectionTitle="Ships"
        sectionHint="remote service control"
        message="Select a host to view its fleet services and reclaim non-essential ones."
      />
    )
  } else if (selectedProc) {
    detail = (
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
    )
  } else {
    detail = <SystemOverview stats={stats} />
  }

  return (
    <>
      {masterSlotEl && createPortal(master, masterSlotEl)}
      {detail}
    </>
  )
}

// ── View toggle (segmented control) ───────────────────────────────────────────

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const { theme } = useTheme()
  const opts: { id: View; label: string; icon: ReactNode }[] = [
    { id: 'node', label: 'This node', icon: <Cpu size={12} aria-hidden /> },
    { id: 'ships', label: 'Ships', icon: <Ship size={12} aria-hidden /> },
  ]
  return (
    <div
      role="tablist"
      aria-label="Services view"
      style={{
        display: 'flex',
        gap: 4,
        padding: '8px 10px',
        borderBottom: `1px solid ${theme.border}`,
      }}
    >
      {opts.map((o) => {
        const active = view === o.id
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '6px 8px',
              borderRadius: 6,
              cursor: 'pointer',
              background: active ? `${theme.accent}1f` : 'transparent',
              border: `1px solid ${active ? `${theme.accent}66` : theme.border}`,
              color: active ? theme.accentText : theme.textMuted,
              fontFamily: theme.fontRow,
              fontSize: theme.sizeBody,
              fontWeight: 600,
              transition: 'background 150ms ease',
            }}
          >
            {o.icon}
            {o.label}
          </button>
        )
      })}
    </div>
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
        Select a process in the Services list for its per-service metrics.
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
