import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Ship, Play } from 'lucide-react'
import { useTheme } from '@/theme/ThemeProvider'
import { getFleet, launchApp, type FleetEntry } from '@/ipc/tauri'
import { MasterRow, MasterHeader, PaneHeader, DetailPlaceholder, EmptyState, SkeletonList } from '../ui'
import { StatusPill } from '@/components/StatusPill'
import { SignalBridgeDetail } from '@/screens/detail/SignalBridgeDetail'
import { SunfishDetail } from '@/screens/detail/SunfishDetail'
import { FlightDeckDetail } from '@/screens/detail/FlightDeckDetail'

/** Apps with a dedicated live detail screen (reused from the popup). */
const DETAIL: Record<string, (onBack: () => void) => ReactNode> = {
  'signal-bridge': (onBack) => <SignalBridgeDetail onBack={onBack} />,
  sunfish: (onBack) => <SunfishDetail onBack={onBack} />,
  'flight-deck': (onBack) => <FlightDeckDetail onBack={onBack} />,
}

function toneFor(e: FleetEntry): 'healthy' | 'warn' | 'danger' | undefined {
  if (e.manifest.availability === 'planned' || !e.installed) return undefined
  if (e.status === 'running') return 'healthy'
  return 'warn'
}

function subFor(e: FleetEntry): string {
  const av = e.manifest.availability
  if (av === 'planned') return 'planned · no package'
  if (!e.installed) return `${av} · not installed`
  const v = e.version && e.version !== 'unknown' && e.version !== '' ? `v${e.version}` : '—'
  return `${v} · ${e.status}`
}

interface Props {
  narrow: boolean
  query: string
  focusItem: string | null
  /** Portal target in the shell's navigation region (CIC design amendment,
   *  tender#103) — the master list renders there via `createPortal`, the
   *  detail pane renders in place (the shell's `main` region). */
  masterSlotEl: HTMLElement | null
}

export function FleetSection({ narrow, query, focusItem, masterSlotEl }: Props) {
  const [fleet, setFleet] = useState<FleetEntry[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const refresh = useCallback(() => {
    getFleet().then((f) => setFleet(f)).catch(() => setFleet((prev) => prev ?? []))
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [refresh])
  useEffect(() => { if (focusItem) setSelected(focusItem) }, [focusItem])

  const filtered = useMemo(() => {
    if (!fleet) return null
    const q = query.trim().toLowerCase()
    if (!q) return fleet
    return fleet.filter((e) => e.manifest.displayName.toLowerCase().includes(q))
  }, [fleet, query])

  const selectedEntry = filtered?.find((e) => e.manifest.id === selected) ?? null
  const clear = () => setSelected(null)

  const master = (
    <div>
      <MasterHeader label="Fleet" count={filtered ? `${filtered.length}` : undefined} />
      {filtered === null && <SkeletonList />}
      {filtered !== null && filtered.length === 0 && (
        <EmptyState title="No apps in catalog" hint="Tender found no app manifests. Check tender-settings.json, or commission an app from the tray popup." />
      )}
      {filtered?.map((e) => (
        <MasterRow
          key={e.manifest.id}
          icon={<Ship size={15} />}
          title={e.manifest.displayName}
          sub={subFor(e)}
          tone={toneFor(e)}
          selected={e.manifest.id === selected}
          onClick={() => setSelected(e.manifest.id)}
        />
      ))}
    </div>
  )

  let detail: ReactNode
  if (!selectedEntry) {
    const running = filtered?.filter((e) => e.status === 'running').length ?? 0
    detail = (
      <DetailPlaceholder
        icon={<Ship size={28} />}
        message="Select an app to see its live status, links, and metrics. Running apps open their full instrument panel."
        sectionTitle="Fleet"
        sectionHint="Harborline apps"
        statusChip={filtered && <StatusPill text={`${running}/${filtered.length} running`} />}
      />
    )
  } else if (selectedEntry.installed && DETAIL[selectedEntry.manifest.id]) {
    detail = DETAIL[selectedEntry.manifest.id](clear)
  } else {
    detail = <FleetInfoPane entry={selectedEntry} narrow={narrow} onBack={clear} onLaunched={refresh} />
  }

  return (
    <>
      {masterSlotEl && createPortal(master, masterSlotEl)}
      {detail}
    </>
  )
}

function FleetInfoPane({ entry, narrow, onBack, onLaunched }: { entry: FleetEntry; narrow: boolean; onBack: () => void; onLaunched: () => void }) {
  const { theme } = useTheme()
  const canLaunch = entry.installed && entry.status !== 'running'
  const [busy, setBusy] = useState(false)

  const launch = async () => {
    setBusy(true)
    try { await launchApp(entry.manifest.id); onLaunched() } catch { /* IPC absent / launch failed — honest no-op */ }
    finally { setBusy(false) }
  }

  return (
    <div>
      <PaneHeader
        title={entry.manifest.displayName}
        sub={subFor(entry)}
        onBack={narrow ? onBack : undefined}
        actions={canLaunch ? (
          <button
            onClick={launch}
            disabled={busy}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: `${theme.accent}1a`, border: `1px solid ${theme.accent}55`,
              // accentText (design-review D1, tender#103): this IS the label
              // text — accent-as-fill/-border above stays on plain `accent`.
              borderRadius: 4, color: theme.accentText,
              fontFamily: theme.fontMono, fontSize: theme.sizeLabel,
              letterSpacing: 1.1, textTransform: 'uppercase', padding: '5px 10px',
              cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
            }}
          >
            <Play size={12} /> Launch
          </button>
        ) : undefined}
      />
      <div style={{ padding: '16px 18px' }}>
        <div
          style={{
            fontFamily: theme.fontRow,
            fontSize: theme.sizeBody,
            color: theme.textDim,
            lineHeight: 1.6,
            marginBottom: entry.manifest.caveats.length ? 14 : 0,
          }}
        >
          {entry.manifest.availability === 'planned'
            ? 'This app is planned — no package is available yet. It will appear here to commission once packaged.'
            : !entry.installed
              ? 'This app is available but not installed. Commission it from the tray popup to place its bundle and launch it.'
              : 'This app is installed and at rest. Launch it to bring it online.'}
        </div>
        {entry.manifest.caveats.map((c) => (
          <div
            key={c.id}
            style={{
              display: 'flex', gap: 6, marginTop: 6,
              fontFamily: theme.fontMono, fontSize: 10, lineHeight: 1.5, letterSpacing: 0.3,
              color: c.severity === 'blocker' ? theme.danger : c.severity === 'warning' ? theme.warn : theme.textMuted,
            }}
          >
            <span aria-hidden style={{ fontWeight: 600 }}>!</span>
            <span>{c.summary}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
