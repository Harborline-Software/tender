/**
 * ShipsHostView — the Ships detail pane for one remote host (shipyard#2998).
 *
 * Renders the fleet-relevant service list for a host, classified by the vendored
 * allowlist: reclaimable services get Start/Stop control with transitioning
 * states and a VERIFIED post-state; essential services render status-only (no
 * stop affordance — the allowlist is the guard). Honest unreachable /
 * unclassified states. Stopping asks for confirmation (listing exactly what
 * stops) and, on completion, shows the freed-memory delta — the reclaim reward.
 *
 * All control decisions mirror the Rust guard (`ships.rs`): the UI reads
 * `service.canControl` (true only for reclaimable) and never infers a control.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { Server, MemoryStick, Play, Square, ShieldCheck } from 'lucide-react'
import { useTheme } from '@/theme/ThemeProvider'
import { StatusPill } from '@/components/StatusPill'
import { PaneHeader, SkeletonList } from '../../ui'
import {
  getShipServices,
  setShipService,
  type ShipsSnapshot,
  type ShipService,
  type ShipStatus,
} from '@/ipc/tauri'

const GIB = 1024 ** 3
function fmtGiB(bytes?: number | null): string {
  if (bytes == null) return '—'
  return `${(bytes / GIB).toFixed(1)} GiB`
}

function statusToHealth(s: ShipStatus): 'healthy' | 'stopped' | 'degraded' {
  return s === 'running' ? 'healthy' : s === 'stopped' ? 'stopped' : 'degraded'
}

interface Props {
  hostId: string
  onBack?: () => void
}

type Pending = { name: string; verb: 'start' | 'stop' }

export function ShipsHostView({ hostId, onBack }: Props) {
  const { theme } = useTheme()
  const [snap, setSnap] = useState<ShipsSnapshot | null>(null)
  const [pending, setPending] = useState<Pending[]>([])
  const [confirm, setConfirm] = useState<{ names: string[]; batch: boolean } | null>(null)
  const [reclaim, setReclaim] = useState<{ bytes: number } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const busy = pending.length > 0
  const busyRef = useRef(busy)
  busyRef.current = busy

  const refresh = useCallback(() => {
    // Don't clobber optimistic/transitioning rows while an action is in flight.
    if (busyRef.current) return
    getShipServices(hostId).then(setSnap).catch(() => {})
  }, [hostId])

  useEffect(() => {
    setSnap(null)
    setReclaim(null)
    setActionError(null)
    getShipServices(hostId).then(setSnap).catch(() => {})
  }, [hostId])

  useEffect(() => {
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [refresh])

  const runAction = useCallback(
    async (names: string[], verb: 'start' | 'stop') => {
      setActionError(null)
      setPending(names.map((name) => ({ name, verb })))
      let freed = 0
      let sawFree = false
      try {
        for (const name of names) {
          const outcome = await setShipService(hostId, name, verb)
          if (!outcome.ok) {
            setActionError(`${name}: ${outcome.detail ?? 'action reported not ok'}`)
          }
          if (
            verb === 'stop' &&
            outcome.memFreeBeforeBytes != null &&
            outcome.memFreeAfterBytes != null
          ) {
            freed += outcome.memFreeAfterBytes - outcome.memFreeBeforeBytes
            sawFree = true
          }
          // Reflect the verified post-state immediately.
          setSnap((prev) =>
            prev
              ? {
                  ...prev,
                  services: prev.services.map((s) =>
                    s.name === name ? { ...s, status: outcome.verifiedStatus } : s,
                  ),
                }
              : prev,
          )
        }
        if (verb === 'stop' && sawFree && freed > 0) setReclaim({ bytes: freed })
      } catch (e) {
        setActionError(typeof e === 'string' ? e : 'Action failed')
      } finally {
        setPending([])
        // Re-probe for ground truth (memory totals, any missed transition).
        getShipServices(hostId).then(setSnap).catch(() => {})
      }
    },
    [hostId],
  )

  const pendingFor = (name: string): Pending | undefined => pending.find((p) => p.name === name)

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!snap) {
    return (
      <div>
        <PaneHeader title={hostId} sub="ships · remote services" onBack={onBack} />
        <div style={{ padding: 18 }}>
          <SkeletonList rows={4} />
        </div>
      </div>
    )
  }

  const running = snap.services.filter((s) => s.status === 'running')
  const runningReclaimable = running.filter((s) => s.canControl)
  const controllable = snap.services.filter((s) => s.canControl)
  const essential = snap.services.filter((s) => !s.canControl)

  const headerActions =
    snap.reachable && runningReclaimable.length > 0 ? (
      <button
        type="button"
        onClick={() => setConfirm({ names: runningReclaimable.map((s) => s.name), batch: true })}
        disabled={busy}
        style={dangerButton(theme, busy)}
      >
        <Square size={12} aria-hidden />
        Stop reclaimable ({runningReclaimable.length})
      </button>
    ) : undefined

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <PaneHeader
        title={snap.displayName}
        sub={`ships · ${snap.sshTarget}`}
        onBack={onBack}
        actions={headerActions}
      />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {/* Memory + provenance strip */}
        <HostSummaryStrip snap={snap} reclaim={reclaim} />

        {actionError && (
          <div style={{ padding: '0 18px 12px' }}>
            <div role="alert" style={calloutStyle(theme, theme.danger)}>
              {actionError}
            </div>
          </div>
        )}

        {/* Unreachable — honest designed state, never a fabricated empty list. */}
        {!snap.reachable ? (
          <UnreachableState detail={snap.detail} target={snap.sshTarget} />
        ) : !snap.classified ? (
          <UnclassifiedState />
        ) : snap.services.length === 0 ? (
          <div style={{ padding: '0 18px' }}>
            <div style={calloutStyle(theme, theme.textMuted)}>
              No fleet-classified services are present on this host right now.
            </div>
          </div>
        ) : (
          <>
            {controllable.length > 0 && (
              <ServiceGroup label="Reclaimable — controllable">
                {controllable.map((s) => (
                  <ServiceRow
                    key={s.name}
                    service={s}
                    pending={pendingFor(s.name)}
                    onStart={() => runAction([s.name], 'start')}
                    onStop={() => setConfirm({ names: [s.name], batch: false })}
                    disabledAll={busy}
                  />
                ))}
              </ServiceGroup>
            )}
            {essential.length > 0 && (
              <ServiceGroup label="Essential — status only">
                {essential.map((s) => (
                  <ServiceRow key={s.name} service={s} essential />
                ))}
              </ServiceGroup>
            )}
          </>
        )}
      </div>

      {confirm && (
        <StopConfirmDialog
          names={confirm.names}
          batch={confirm.batch}
          hostName={snap.displayName}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const names = confirm.names
            setConfirm(null)
            runAction(names, 'stop')
          }}
        />
      )}
    </div>
  )
}

// ── Host summary (memory + provenance + reclaim reward) ───────────────────────

function HostSummaryStrip({
  snap,
  reclaim,
}: {
  snap: ShipsSnapshot
  reclaim: { bytes: number } | null
}) {
  const { theme } = useTheme()
  const usedPct =
    snap.memFreeBytes != null && snap.memTotalBytes != null && snap.memTotalBytes > 0
      ? Math.round(((snap.memTotalBytes - snap.memFreeBytes) / snap.memTotalBytes) * 100)
      : null
  return (
    <div style={{ padding: '14px 18px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <MetricCard
          icon={<MemoryStick size={13} aria-hidden />}
          label="Host memory free"
          value={fmtGiB(snap.memFreeBytes)}
          sub={
            snap.memTotalBytes != null
              ? `of ${fmtGiB(snap.memTotalBytes)}${usedPct != null ? ` · ${usedPct}% used` : ''}`
              : undefined
          }
        />
        <MetricCard
          icon={<Server size={13} aria-hidden />}
          label="Reachable"
          value={snap.reachable ? 'Yes' : 'No'}
          tone={snap.reachable ? 'healthy' : 'danger'}
        />
      </div>

      {reclaim && reclaim.bytes > 0 && (
        <div role="status" style={calloutStyle(theme, theme.healthy)}>
          Reclaimed {fmtGiB(reclaim.bytes)} of host memory. The Bridge ship row should match on its
          next refresh.
        </div>
      )}

      {snap.classificationSource && (
        <div
          style={{
            fontFamily: theme.fontMono,
            fontSize: theme.sizeLabel,
            letterSpacing: 0.6,
            color: theme.textMuted,
            lineHeight: 1.5,
          }}
        >
          Classified by vendored{' '}
          <span style={{ color: theme.textDim }}>{snap.classificationSource}</span> — a point-in-time
          copy of the fleet allowlist; may lag the source.
        </div>
      )}
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  tone?: 'healthy' | 'danger'
}) {
  const { theme } = useTheme()
  const valueColor = tone ? theme[tone] : theme.text
  return (
    <div
      style={{
        flex: '1 1 180px',
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radiusLg,
        padding: '10px 14px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: theme.textMuted,
          marginBottom: 6,
        }}
      >
        {icon}
        <span
          style={{
            fontFamily: theme.fontMono,
            fontSize: theme.sizeLabel,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{ fontFamily: theme.fontMono, fontSize: 16, fontWeight: 600, color: valueColor }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: theme.fontMono,
            fontSize: theme.sizeLabel,
            letterSpacing: 0.6,
            color: theme.textMuted,
            marginTop: 3,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  )
}

// ── Service group + row ───────────────────────────────────────────────────────

function ServiceGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const { theme } = useTheme()
  return (
    <div>
      <div
        style={{
          padding: '10px 18px 6px',
          fontFamily: theme.fontMono,
          fontSize: theme.sizeLabel,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          color: theme.textMuted,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}

function ServiceRow({
  service,
  essential,
  pending,
  onStart,
  onStop,
  disabledAll,
}: {
  service: ShipService
  essential?: boolean
  pending?: Pending
  onStart?: () => void
  onStop?: () => void
  disabledAll?: boolean
}) {
  const { theme } = useTheme()
  const transitioning = pending != null
  const transitionLabel = pending?.verb === 'stop' ? 'Stopping…' : 'Starting…'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 18px',
        borderBottom: `1px solid ${theme.border}`,
        minHeight: 50,
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: theme.sizeRowTitle,
            fontWeight: 600,
            color: theme.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {service.name}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 4,
          }}
        >
          {essential ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontFamily: theme.fontMono,
                fontSize: theme.sizeLabel,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                color: theme.textMuted,
              }}
            >
              <ShieldCheck size={11} aria-hidden />
              Essential
            </span>
          ) : (
            <span
              style={{
                fontFamily: theme.fontMono,
                fontSize: theme.sizeLabel,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                color: theme.textMuted,
              }}
            >
              Reclaimable
            </span>
          )}
        </span>
      </span>

      {/* Status — semantic health channel (glyph + label + color). */}
      {transitioning ? (
        <span
          role="status"
          aria-live="polite"
          style={{
            fontFamily: theme.fontMono,
            fontSize: theme.sizeLabel,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            color: theme.signal,
          }}
        >
          {transitionLabel}
        </span>
      ) : (
        <StatusPill
          health={statusToHealth(service.status)}
          label={
            service.status === 'running'
              ? 'Running'
              : service.status === 'stopped'
                ? 'Stopped'
                : 'Unknown'
          }
        />
      )}

      {/* Control — reclaimable only; essential rows carry no affordance. */}
      {!essential && (
        <div style={{ width: 92, display: 'flex', justifyContent: 'flex-end' }}>
          {service.status === 'running' ? (
            <button
              type="button"
              onClick={onStop}
              disabled={disabledAll || transitioning}
              aria-label={`Stop ${service.name}`}
              style={dangerButton(theme, disabledAll || transitioning)}
            >
              <Square size={12} aria-hidden />
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={onStart}
              disabled={disabledAll || transitioning}
              aria-label={`Start ${service.name}`}
              style={accentButton(theme, disabledAll || transitioning)}
            >
              <Play size={12} aria-hidden />
              Start
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Confirm-before-stop dialog (lists exactly what stops) ─────────────────────

function StopConfirmDialog({
  names,
  batch,
  hostName,
  onCancel,
  onConfirm,
}: {
  names: string[]
  batch: boolean
  hostName: string
  onCancel: () => void
  onConfirm: () => void
}) {
  const { theme } = useTheme()
  const confirmRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div
      role="presentation"
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stop-confirm-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(90vw, 420px)',
          background: theme.bg,
          border: `1px solid ${theme.border}`,
          borderRadius: 10,
          boxShadow: `0 28px 60px ${theme.shadow}`,
          padding: 20,
        }}
      >
        <div
          id="stop-confirm-title"
          style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 6 }}
        >
          {batch ? `Stop ${names.length} services on ${hostName}?` : `Stop ${names[0]}?`}
        </div>
        <div
          style={{
            fontFamily: theme.fontRow,
            fontSize: theme.sizeBody,
            color: theme.textDim,
            lineHeight: 1.6,
            marginBottom: 12,
          }}
        >
          This stops the following on <strong>{hostName}</strong>. In-flight work is interrupted;
          the service can be started again from here.
        </div>
        <ul
          style={{
            listStyle: 'none',
            margin: '0 0 16px',
            padding: 0,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radiusLg,
            overflow: 'hidden',
          }}
        >
          {names.map((n, i) => (
            <li
              key={n}
              style={{
                padding: '8px 12px',
                fontFamily: theme.fontMono,
                fontSize: theme.sizeBody,
                color: theme.text,
                borderTop: i > 0 ? `1px solid ${theme.border}` : 'none',
                background: theme.surface,
              }}
            >
              {n}
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onCancel} style={ghostButton(theme)}>
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            style={{ ...dangerButton(theme, false), padding: '7px 14px' }}
          >
            <Square size={12} aria-hidden />
            {batch ? `Stop ${names.length}` : 'Stop'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Honest states ─────────────────────────────────────────────────────────────

function UnreachableState({ detail, target }: { detail?: string | null; target: string }) {
  const { theme } = useTheme()
  return (
    <div style={{ padding: '4px 18px 18px' }}>
      <div style={calloutStyle(theme, theme.danger)}>
        <div
          style={{
            fontFamily: theme.fontMono,
            fontSize: theme.sizeLabel,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: theme.danger,
            marginBottom: 5,
          }}
        >
          Host unreachable
        </div>
        <div style={{ fontFamily: theme.fontRow, fontSize: theme.sizeBody, color: theme.textDim, lineHeight: 1.6 }}>
          Could not reach <span style={{ fontFamily: theme.fontMono }}>{target}</span> over ssh.
          Service status can't be read, so no controls are shown.
          {detail ? (
            <div style={{ marginTop: 8, fontFamily: theme.fontMono, fontSize: theme.sizeLabel, color: theme.textMuted }}>
              {detail}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function UnclassifiedState() {
  const { theme } = useTheme()
  return (
    <div style={{ padding: '4px 18px 18px' }}>
      <div style={calloutStyle(theme, theme.textMuted)}>
        <div
          style={{
            fontFamily: theme.fontMono,
            fontSize: theme.sizeLabel,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: theme.textMuted,
            marginBottom: 5,
          }}
        >
          No ship classification
        </div>
        <div style={{ fontFamily: theme.fontRow, fontSize: theme.sizeBody, color: theme.textDim, lineHeight: 1.6 }}>
          This host is allow-listed for ssh but has no vendored classification file, so — by the
          fail-safe — every service is treated as essential and nothing is controllable from here.
          Add a <span style={{ fontFamily: theme.fontMono }}>ship-essential-&lt;host&gt;.json</span>{' '}
          to enable control.
        </div>
      </div>
    </div>
  )
}

// ── Shared inline styles (product register; tokens only) ──────────────────────

type T = ReturnType<typeof useTheme>['theme']

function baseButton(theme: T): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 10px',
    borderRadius: 6,
    fontFamily: theme.fontRow,
    fontSize: theme.sizeBody,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 150ms ease, opacity 150ms ease',
  }
}

function accentButton(theme: T, disabled: boolean): React.CSSProperties {
  return {
    ...baseButton(theme),
    background: `${theme.accent}1f`,
    border: `1px solid ${theme.accent}66`,
    color: theme.accentText,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'default' : 'pointer',
  }
}

function dangerButton(theme: T, disabled: boolean): React.CSSProperties {
  return {
    ...baseButton(theme),
    background: `${theme.danger}1a`,
    border: `1px solid ${theme.danger}66`,
    color: theme.danger,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'default' : 'pointer',
  }
}

function ghostButton(theme: T): React.CSSProperties {
  return {
    ...baseButton(theme),
    background: 'transparent',
    border: `1px solid ${theme.border}`,
    color: theme.text,
    padding: '7px 14px',
  }
}

function calloutStyle(theme: T, color: string): React.CSSProperties {
  return {
    background: `${color}14`,
    border: `1px solid ${color}44`,
    borderRadius: theme.radiusLg,
    padding: '10px 12px',
    fontFamily: theme.fontRow,
    fontSize: theme.sizeBody,
    color: theme.textDim,
    lineHeight: 1.5,
  }
}
