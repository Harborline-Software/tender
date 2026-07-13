import { useEffect, useState } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { MenuShell } from '@/components/MenuShell'
import { DetailHeader } from '@/components/DetailHeader'
import { StatusPill } from '@/components/StatusPill'
import { FiberDivider } from '@/components/FiberDivider'
import { ActionFooter } from '@/components/ActionFooter'
import { getServices, emergencyStop, quitApp, type ServiceData } from '@/ipc/tauri'

interface Props {
  onBack: () => void
}

type Phase = 'idle' | 'stopping' | 'error'

export function DryDockDetail({ onBack }: Props) {
  const { theme } = useTheme()
  const d = theme.danger

  // Live will-stop list — honest-states principle: never a hardcoded roster.
  // null = still querying the node.
  const [running, setRunning] = useState<ServiceData[] | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getServices()
      .then((all) => {
        if (!cancelled) setRunning(all.filter((s) => s.installed && s.status === 'running'))
      })
      .catch(() => {
        if (!cancelled) setRunning([])
      })
    return () => { cancelled = true }
  }, [])

  const confirmShutdown = async () => {
    if (phase === 'stopping') return
    setPhase('stopping')
    setError(null)
    // Wired services stop via the Flight-Deck admin endpoint; skipped when
    // nothing is running so an idle node doesn't error on an absent
    // Flight-Deck. The Toolbox itself exits only after that succeeds — if
    // services couldn't be stopped, the operator must see it, not lose the
    // panel mid-failure.
    if (running && running.length > 0) {
      try {
        await emergencyStop()
      } catch (e) {
        setPhase('error')
        setError(`wired services were NOT stopped: ${e instanceof Error ? e.message : String(e)}`)
        return
      }
    }
    try {
      await quitApp()
    } catch (e) {
      setPhase('error')
      setError(`services stopped, but the Toolbox itself failed to exit: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const stopping = phase === 'stopping'

  return (
    <MenuShell>
      <DetailHeader
        title="Dry Dock"
        sub="Graceful shutdown · confirm"
        onBack={onBack}
        badge={<StatusPill text={stopping ? 'Stopping' : 'Standby'} tone={d} />}
      />

      <div style={{ padding: '12px 14px 10px', display: 'flex', gap: 10, background: `${d}10` }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
          <path d="M9 1 L 17 16 L 1 16 Z" stroke={d} strokeWidth="1.5" strokeLinejoin="round" />
          <line x1="9" y1="7" x2="9" y2="11" stroke={d} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="9" cy="13.5" r="0.8" fill={d} />
        </svg>
        <div style={{ fontSize: 11.5, color: theme.text, lineHeight: 1.4 }}>
          Stops Harborline Toolbox and all wired Harborline services on this node. Logs and state are preserved.
        </div>
      </div>

      <FiberDivider dim />

      <div style={{ padding: '8px 14px 4px', fontFamily: theme.fontMono, fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: theme.textMuted }}>
        ↳ Will stop
      </div>

      {running === null ? (
        <div style={{ padding: '5px 14px 8px', fontFamily: theme.fontMono, fontSize: 10, color: theme.textMuted, letterSpacing: 0.2 }}>
          querying node…
        </div>
      ) : (
        <>
          {running.map((s) => (
            <div key={s.id} style={{
              padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 9,
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}>
              <span style={{ width: 4, height: 4, borderRadius: 99, background: d, boxShadow: `0 0 4px ${d}aa`, flexShrink: 0 }} />
              <span style={{ flex: 1, fontFamily: theme.fontMono, fontSize: 10, color: theme.text, letterSpacing: 0.2 }}>
                {s.displayName}
              </span>
            </div>
          ))}
          {running.length === 0 && (
            <div style={{ padding: '5px 14px 3px', fontFamily: theme.fontMono, fontSize: 10, color: theme.textDim, letterSpacing: 0.2 }}>
              no wired services running on this node
            </div>
          )}
          {/* The Toolbox itself always stops last */}
          <div style={{ padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 4, height: 4, borderRadius: 99, background: d, boxShadow: `0 0 4px ${d}aa`, flexShrink: 0 }} />
            <span style={{ flex: 1, fontFamily: theme.fontMono, fontSize: 10, color: theme.text, letterSpacing: 0.2 }}>
              Harborline Toolbox helm process
            </span>
          </div>
        </>
      )}

      {phase === 'error' && (
        <div style={{ padding: '8px 14px', display: 'flex', gap: 8, background: `${d}10` }}>
          <div style={{ fontSize: 10.5, fontFamily: theme.fontMono, color: theme.danger, lineHeight: 1.5, letterSpacing: 0.2 }}>
            Shutdown aborted — {error}. The Toolbox stays up so you can retry
            or stop services manually.
          </div>
        </div>
      )}

      <ActionFooter
        primary={stopping ? 'Stopping…' : phase === 'error' ? 'Retry Shutdown' : 'Confirm Shutdown'}
        secondary="Cancel"
        danger
        onPrimary={confirmShutdown}
        onSecondary={onBack}
      />
    </MenuShell>
  )
}
