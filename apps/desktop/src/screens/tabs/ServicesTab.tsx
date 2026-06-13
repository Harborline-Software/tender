/**
 * ServicesTab — local process list with real health.
 *
 * BUG FIX (F5.1): the prior implementation passed `active={s.hl}` where
 * `hl` means "is Harborline-owned" — ownership, NOT health. This meant the
 * dot reflected brand ownership and "all healthy" was a hardcoded literal.
 * Fixed: `active` now reflects the process running state (pid present),
 * and the health summary derives from actual process data.
 *
 * Wires to live process data via useLocalServices. Falls back to skeleton
 * rows while loading and shows a proper error block on failure.
 */
import { useState, useEffect, useRef } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { ConsoleRow } from '@/components/ConsoleRow'
import { FiberDivider } from '@/components/FiberDivider'
import { StatusPill } from '@/components/StatusPill'
import { getLocalServices, type ProcessData } from '@/ipc/tauri'
import { healthSummary, worstHealth, type HealthState } from '@/state/health'
import { type DetailId } from '@/state/types'

// A local process is "running" if its pid is set; "stopped" otherwise.
// Error is not surfaced at the process list level — that's EngineRoom territory.
function processToHealth(p: ProcessData): HealthState {
  return p.pid != null ? 'healthy' : 'stopped'
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
}

interface Props {
  onNavigate: (id: DetailId) => void
}

export function ServicesTab({ onNavigate }: Props) {
  const { theme } = useTheme()

  const [processes, setProcesses] = useState<ProcessData[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Poll local services every 5s — same cadence as useTelemetry
  useEffect(() => {
    let alive = true
    const poll = () => {
      getLocalServices()
        .then((r) => { if (alive) { setProcesses(r); setError(null) } })
        .catch((e: unknown) => {
          if (alive) setError(typeof e === 'string' ? e : 'Could not read local services')
        })
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  // Pulse animation on health transitions
  const prevHealthMap = useRef<Map<string, HealthState>>(new Map())
  const [pulsing, setPulsing] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (!processes) return
    const transitions: string[] = []
    processes.forEach(p => {
      const cur = processToHealth(p)
      const prev = prevHealthMap.current.get(p.name)
      if (prev !== undefined && prev !== cur) transitions.push(p.name)
      prevHealthMap.current.set(p.name, cur)
    })
    if (transitions.length === 0) return
    setPulsing(prev => new Set([...prev, ...transitions]))
    const timer = setTimeout(() => {
      setPulsing(prev => {
        const next = new Set(prev)
        transitions.forEach(n => next.delete(n))
        return next
      })
    }, 2000)
    return () => clearTimeout(timer)
  }, [processes])

  // ── Loading state ──────────────────────────────────────────────────────────
  if (processes === null && !error) {
    return (
      <div>
        <SectionHeader count="…" summary="loading" summaryColor={theme.textMuted} />
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <SkeletonRow />
            {i < 3 && <FiberDivider dim />}
          </div>
        ))}
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div>
        <SectionHeader count="?" summary="error" summaryColor={theme.danger} />
        <div style={{ padding: '10px 14px' }}>
          <div
            role="alert"
            style={{
              background: `${theme.danger}1a`,
              border: `1px solid ${theme.danger}44`,
              borderRadius: 5,
              padding: '10px 12px',
            }}
          >
            <div style={{
              fontFamily: theme.fontMono,
              fontSize: theme.sizeLabel, letterSpacing: 1.2, color: theme.danger,
              textTransform: 'uppercase', marginBottom: 5,
            }}>
              Services unavailable
            </div>
            <div style={{
              fontFamily: theme.fontRow,
              fontSize: theme.sizeBody, color: theme.textDim, lineHeight: 1.5,
            }}>
              {error}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!processes || processes.length === 0) {
    return (
      <div>
        <SectionHeader count="0" summary="no services" summaryColor={theme.textMuted} />
        <div style={{
          padding: '24px 14px', textAlign: 'center',
          fontFamily: theme.fontMono,
          fontSize: theme.sizeLabel, letterSpacing: 1.2, color: theme.textMuted,
          textTransform: 'uppercase',
        }}>
          No services detected on this node.
        </div>
      </div>
    )
  }

  // ── Live state ─────────────────────────────────────────────────────────────
  const healthStates = processes.map(processToHealth)
  const worst = worstHealth(healthStates)
  const summary = healthSummary(healthStates)
  const summaryColor = worst === 'healthy' ? theme.healthy
    : worst === 'degraded' ? theme.warn
    : worst === 'stopped' ? theme.textMuted
    : theme.danger

  return (
    <div>
      <SectionHeader
        count={String(processes.length)}
        summary={summary}
        summaryColor={summaryColor}
        summaryLabel={worst}
      />
      {processes.map((p, i) => {
        const health = processToHealth(p)
        return (
          <div key={p.name}>
            <ConsoleRow
              indicator="cpu"
              name={p.name}
              subLabel={`cpu ${p.cpu.toFixed(1)}% · mem ${fmtBytes(p.memBytes)}`}
              active={health === 'healthy'}
              danger={health === 'error'}
              pulsing={pulsing.has(p.name)}
              badge={<StatusPill health={health} glyphOnly />}
              onClick={() => onNavigate('engine-room')}
            />
            {i < processes.length - 1 && <FiberDivider dim />}
          </div>
        )
      })}
    </div>
  )
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function SectionHeader({
  count, summary, summaryColor, summaryLabel,
}: {
  count: string
  summary: string
  summaryColor: string
  summaryLabel?: HealthState
}) {
  const { theme } = useTheme()
  return (
    <div style={{
      padding: '8px 14px 4px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <span style={{
        fontFamily: theme.fontMono,
        fontSize: theme.sizeLabel, letterSpacing: 1.4,
        textTransform: 'uppercase', color: theme.textMuted,
      }}>
        ↳ {count} services · this node
      </span>
      {summaryLabel ? (
        <StatusPill health={summaryLabel} label={summary} />
      ) : (
        <span style={{
          fontFamily: theme.fontMono,
          fontSize: theme.sizeLabel, color: summaryColor, letterSpacing: 0.6,
        }}>
          {summary}
        </span>
      )}
    </div>
  )
}

function SkeletonRow() {
  const { theme } = useTheme()
  return (
    <div
      role="status"
      aria-label="Loading service…"
      style={{
        padding: '11px 14px 11px 12px',
        display: 'flex', alignItems: 'center', gap: 11,
        minHeight: 46,
      }}
    >
      <div style={{ width: 11, height: 11, borderRadius: 3, background: theme.border }} />
      <div style={{ flex: 1 }}>
        <div style={{ width: '50%', height: 10, borderRadius: 3, background: theme.border, marginBottom: 5 }} />
        <div style={{ width: '35%', height: 8, borderRadius: 3, background: `${theme.border}88` }} />
      </div>
    </div>
  )
}
