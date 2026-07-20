import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { MenuShell } from '@/components/MenuShell'
import { DetailHeader } from '@/components/DetailHeader'
import { FiberDivider } from '@/components/FiberDivider'
import { StatusPill } from '@/components/StatusPill'
import { LogViewerSheet } from '@/components/LogViewerSheet'
import {
  controlCoordinationDaemon,
  getCoordinationDaemons,
  getFleetDashboardLink,
  openCoordinationDaemonLog,
  openFleetDashboard,
  type CoordinationDaemonAction,
  type CoordinationDaemonStatus,
  type FleetDashboardLink,
} from '@/ipc/tauri'

interface Props {
  onBack: () => void
}

type DaemonId = CoordinationDaemonStatus['id']

const STATE_COPY: Record<CoordinationDaemonStatus['state'], { label: string; glyph: string }> = {
  loaded: { label: 'Loaded', glyph: '✓' },
  maintenanceHeld: { label: 'Held', glyph: 'Ⅱ' },
  disabled: { label: 'Stopped', glyph: '○' },
  degraded: { label: 'Attention', glyph: '!' },
  notConfigured: { label: 'Not configured', glyph: '—' },
}

function relativeTime(epoch: number | null): string {
  if (epoch == null) return 'No run recorded'
  const seconds = Math.max(0, Math.floor(Date.now() / 1000) - epoch)
  if (seconds < 10) return 'Just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function ActionButton({
  label,
  onClick,
  disabled = false,
  danger = false,
  title,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  title?: string
}) {
  const { theme } = useTheme()
  const tone = danger ? theme.danger : theme.accentBright
  const style: CSSProperties = {
    minHeight: 28,
    padding: '5px 8px',
    borderRadius: 4,
    border: `1px solid ${disabled ? theme.border : `${tone}66`}`,
    background: disabled ? theme.bgSoft : `${tone}14`,
    color: disabled ? theme.textMuted : tone,
    fontFamily: theme.fontRow,
    fontSize: theme.sizeBody,
    cursor: disabled ? 'not-allowed' : 'pointer',
  }
  return <button type="button" style={style} onClick={onClick} disabled={disabled} title={title}>{label}</button>
}

function DaemonCard({
  daemon,
  busy,
  confirming,
  onAction,
  onConfirmStart,
  onViewLog,
  onOpenLog,
}: {
  daemon: CoordinationDaemonStatus
  busy: boolean
  confirming: boolean
  onAction: (action: CoordinationDaemonAction) => void
  onConfirmStart: () => void
  onViewLog: () => void
  onOpenLog: () => void
}) {
  const { theme } = useTheme()
  const stateTone = daemon.state === 'loaded' ? theme.healthy
    : daemon.state === 'degraded' ? theme.warn
      : daemon.state === 'notConfigured' ? theme.textMuted
        : daemon.state === 'maintenanceHeld' ? theme.warn
          : theme.textMuted
  const state = STATE_COPY[daemon.state]
  const controlsLocked = !daemon.controlsEnabled
  const showStart = !daemon.activeFlagPresent && daemon.state !== 'notConfigured'

  return (
    <section aria-label={`${daemon.displayName} daemon`} style={{ padding: '10px 14px 11px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
        <span
          aria-hidden="true"
          style={{
            width: 18,
            height: 18,
            borderRadius: theme.radiusFull,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${stateTone}66`,
            color: stateTone,
            fontFamily: theme.fontMono,
            fontSize: theme.sizeMetric,
            flexShrink: 0,
          }}
        >
          {state.glyph}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <strong style={{ fontFamily: theme.fontRow, fontSize: theme.sizeRowTitle, color: theme.text }}>
              {daemon.displayName}
            </strong>
            <span role="status" aria-label={`Status: ${state.label}`}>
              <StatusPill text={state.label} tone={stateTone} />
            </span>
          </div>
          <div style={{
            marginTop: 3,
            fontFamily: theme.fontMono,
            fontSize: theme.sizeLabel,
            color: theme.textMuted,
            letterSpacing: 0.5,
          }}>
            {daemon.cadence} · last {relativeTime(daemon.lastRunAt).toLowerCase()}
          </div>
        </div>
      </div>

      <p style={{
        margin: '8px 0 0',
        fontFamily: theme.fontRow,
        fontSize: theme.sizeBody,
        color: theme.textDim,
        lineHeight: 1.45,
      }}>
        {daemon.detail}
      </p>

      {daemon.id === 'lane-supervisor' && daemon.capacityMaximum != null && (
        <div
          aria-label={`Lane capacity ${daemon.capacityActive ?? 0} of ${daemon.capacityMaximum}; conn provider ${daemon.connProvider ?? 'unknown'}`}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px 10px',
            marginTop: 7,
            fontFamily: theme.fontMono,
            fontSize: theme.sizeLabel,
            color: theme.textMuted,
          }}
        >
          <span>{daemon.capacityActive ?? 0} / {daemon.capacityMaximum} lanes active</span>
          <span>conn {daemon.connProvider ?? 'unknown'}</span>
          {daemon.nextCandidate && <span>next {daemon.nextCandidate}</span>}
        </div>
      )}

      {daemon.lastLogLine && (
        <div style={{
          marginTop: 7,
          padding: '6px 8px',
          borderRadius: 4,
          background: theme.bgSoft,
          border: `1px solid ${theme.border}`,
          fontFamily: theme.fontMono,
          fontSize: theme.sizeLabel,
          color: theme.textMuted,
          lineHeight: 1.45,
          overflowWrap: 'anywhere',
        }}>
          {daemon.lastLogLine}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
        {showStart && (
          <ActionButton
            label={confirming ? 'Confirm start' : 'Start'}
            disabled={busy || !daemon.canStart}
            onClick={confirming ? () => onAction('start') : onConfirmStart}
            title={controlsLocked
              ? 'Locked until TENDER_ALLOW_COORDINATION_DAEMON_START=1 is set after the safety fix lands'
              : 'Create the active marker and load the existing LaunchAgent'}
          />
        )}
        {daemon.canStop && (
          <ActionButton
            label={busy ? 'Working…' : daemon.loaded ? 'Stop' : 'Hold'}
            danger
            disabled={busy}
            onClick={() => onAction('stop')}
            title="Remove the active marker and unload the LaunchAgent"
          />
        )}
        {!showStart && !daemon.canStop && (
          <ActionButton
            label="Start"
            disabled
            onClick={onConfirmStart}
            title="This daemon is not configured on this device"
          />
        )}
        <ActionButton
          label="Run now"
          disabled={busy || !daemon.canRunNow}
          onClick={() => onAction('runNow')}
          title={controlsLocked ? 'Start controls are safety-locked' : 'Kick the loaded LaunchAgent once'}
        />
        <ActionButton label="View logs" disabled={!daemon.logsAvailable} onClick={onViewLog} />
        <ActionButton label="Open log" disabled={!daemon.logsAvailable} onClick={onOpenLog} />
      </div>
    </section>
  )
}

export function CoordinationDaemonsDetail({ onBack }: Props) {
  const { theme } = useTheme()
  const [daemons, setDaemons] = useState<CoordinationDaemonStatus[] | null>(null)
  const [dashboard, setDashboard] = useState<FleetDashboardLink | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<DaemonId | null>(null)
  const [confirming, setConfirming] = useState<DaemonId | null>(null)
  const [viewingLog, setViewingLog] = useState<CoordinationDaemonStatus | null>(null)

  const load = useCallback(async () => {
    try {
      const [nextDaemons, nextDashboard] = await Promise.all([
        getCoordinationDaemons(),
        getFleetDashboardLink(),
      ])
      setDaemons(nextDaemons)
      setDashboard(nextDashboard)
      setError(null)
    } catch (reason) {
      setError(typeof reason === 'string' ? reason : 'Could not inspect coordination daemons.')
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
  }, [load])

  const runAction = async (daemon: CoordinationDaemonStatus, action: CoordinationDaemonAction) => {
    setBusy(daemon.id)
    setConfirming(null)
    setError(null)
    setNotice(null)
    try {
      const result = await controlCoordinationDaemon(daemon.id, action)
      setNotice(result.detail)
      await load()
    } catch (reason) {
      setError(typeof reason === 'string' ? reason : `${daemon.displayName} action failed.`)
    } finally {
      setBusy(null)
    }
  }

  const openLog = async (daemon: CoordinationDaemonStatus) => {
    try {
      await openCoordinationDaemonLog(daemon.id)
    } catch (reason) {
      setError(typeof reason === 'string' ? reason : 'Could not open daemon log.')
    }
  }

  const loadedCount = daemons?.filter(daemon => daemon.state === 'loaded').length ?? 0
  const attentionCount = daemons?.filter(daemon => daemon.state === 'degraded').length ?? 0

  return (
    <MenuShell>
      <DetailHeader
        title="Coordination Daemons"
        sub={daemons ? `${loadedCount} loaded · ${attentionCount} need attention` : 'Inspecting launchd…'}
        onBack={onBack}
        badge={
          <span role="status" aria-label={`Coordination status: ${attentionCount > 0 ? 'Attention' : loadedCount > 0 ? 'Ready' : 'Held'}`}>
            <StatusPill text={attentionCount > 0 ? 'Attention' : loadedCount > 0 ? 'Ready' : 'Held'}
              tone={attentionCount > 0 ? theme.warn : loadedCount > 0 ? theme.healthy : theme.textMuted} />
          </span>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {(error || notice) && (
          <div
            role={error ? 'alert' : 'status'}
            aria-live="polite"
            style={{
              margin: '10px 14px 0',
              padding: '8px 10px',
              borderRadius: theme.radiusLg,
              border: `1px solid ${error ? theme.danger : theme.healthy}55`,
              color: error ? theme.danger : theme.healthy,
              background: `${error ? theme.danger : theme.healthy}12`,
              fontFamily: theme.fontRow,
              fontSize: theme.sizeBody,
              lineHeight: 1.45,
            }}
          >
            {error ?? notice}
          </div>
        )}

        {daemons === null ? (
          <div role="status" style={{ padding: '24px 14px', color: theme.textMuted, fontFamily: theme.fontMono, fontSize: theme.sizeLabel }}>
            Inspecting LaunchAgents…
          </div>
        ) : daemons.map((daemon, index) => (
          <div key={daemon.id}>
            {index > 0 && <FiberDivider dim />}
            <DaemonCard
              daemon={daemon}
              busy={busy === daemon.id}
              confirming={confirming === daemon.id}
              onAction={(action) => runAction(daemon, action)}
              onConfirmStart={() => setConfirming(daemon.id)}
              onViewLog={() => setViewingLog(daemon)}
              onOpenLog={() => openLog(daemon)}
            />
          </div>
        ))}

        <FiberDivider />
        <section aria-label="Fleet dashboard" style={{ padding: '10px 14px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontFamily: theme.fontRow, fontSize: theme.sizeRowTitle, fontWeight: 600, color: theme.text }}>
                Fleet Dashboard
              </div>
              <div style={{ marginTop: 3, fontFamily: theme.fontRow, fontSize: theme.sizeBody, color: theme.textDim, lineHeight: 1.4 }}>
                {dashboard?.detail ?? 'Reading dashboard configuration…'}
              </div>
            </div>
            <ActionButton
              label="Open"
              disabled={!dashboard?.configured}
              onClick={() => openFleetDashboard().catch((reason: unknown) => {
                setError(typeof reason === 'string' ? reason : 'Could not open fleet dashboard.')
              })}
            />
          </div>
        </section>
      </div>

      {viewingLog && (
        <LogViewerSheet
          serviceId={viewingLog.id}
          serviceLabel={viewingLog.displayName}
          onClose={() => setViewingLog(null)}
        />
      )}
    </MenuShell>
  )
}
