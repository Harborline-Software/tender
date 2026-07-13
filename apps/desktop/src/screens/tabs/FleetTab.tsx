/**
 * FleetTab — state-driven fleet view (CFG-3a).
 *
 * Renders every app from get_fleet() in its honest state:
 *   planned       → dimmed, "Planned · no package", no action
 *   packaged/released + !installed → dimmed + Commission button (with caveats)
 *   installed + stopped            → at rest + Launch button
 *   installed + running            → live row → navigate to detail
 *
 * Commission flow: inline text input for local path → recommend_profile() →
 * install_app_local() → launch_app(). Per-step progress. Caveats surfaced
 * on completion. Voice: competent, terse, nautical-industrial (§7).
 *
 * Loading: muted placeholder rows (no spinner), per SCREENS.md.
 * WCAG 1.4.1: status never conveyed by color alone — glyph + text always shown.
 */
import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { ConsoleRow } from '@/components/ConsoleRow'
import { FiberDivider } from '@/components/FiberDivider'
import { getFleet, recommendProfile, installAppLocal, launchApp } from '@/ipc/tauri'
import type { FleetEntry, InstallRequest, Caveat } from '@/state/types'
import type { DetailId } from '@/state/types'

interface Props {
  onNavigate: (id: DetailId) => void
}

// ── Commission flow state machine ─────────────────────────────────────────────

type CommissionStep =
  | { kind: 'idle' }
  | { kind: 'input'; path: string }
  | { kind: 'probing' }
  | { kind: 'installing'; step: string }
  | { kind: 'done'; caveats: Caveat[]; error?: string }
  | { kind: 'error'; message: string }

interface CommissionState {
  appId: string
  step: CommissionStep
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatVersion(v: string): string {
  if (!v || v === 'unknown') return '—'
  return v
}

function availabilityLabel(entry: FleetEntry): string {
  const { availability } = entry.manifest
  if (availability === 'planned') return 'planned · no package'
  if (!entry.installed) return `${availability} · not installed`
  // Honest version: prefix "v" only when we actually know it (avoid "v—").
  const v = formatVersion(entry.version)
  return v === '—' ? `— · ${entry.status}` : `v${v} · ${entry.status}`
}

function isActionable(entry: FleetEntry): boolean {
  return entry.manifest.availability !== 'planned'
}

function isInstallable(entry: FleetEntry): boolean {
  return (
    isActionable(entry) &&
    !entry.installed &&
    (entry.manifest.availability === 'packaged' || entry.manifest.availability === 'released')
  )
}

function isRunning(entry: FleetEntry): boolean {
  return entry.installed && entry.status === 'running'
}

function isStopped(entry: FleetEntry): boolean {
  return entry.installed && entry.status === 'stopped'
}

function fleetSummary(entries: FleetEntry[]): string {
  const available = entries.filter(e => isInstallable(e) || isRunning(e) || isStopped(e)).length
  const planned = entries.filter(e => e.manifest.availability === 'planned').length
  const parts: string[] = []
  if (available > 0) parts.push(`${available} available`)
  if (planned > 0) parts.push(`${planned} planned`)
  return parts.join(' · ') || '0 apps'
}

/** Map a running FleetEntry's id to a DetailId for navigation. */
const DETAIL_MAP: Partial<Record<string, DetailId>> = {
  'signal-bridge': 'signal-bridge',
  sunfish: 'sunfish',
  'flight-deck': 'flight-deck',
}

// ── Commission inline flow ────────────────────────────────────────────────────

interface CommissionFlowProps {
  entry: FleetEntry
  state: CommissionStep
  onPathChange: (path: string) => void
  onCommit: () => void
  onCancel: () => void
}

function CommissionFlow({ entry, state, onPathChange, onCommit, onCancel }: CommissionFlowProps) {
  const { theme } = useTheme()
  const accent = theme.accent
  const mono = theme.fontMono

  if (state.kind === 'input') {
    return (
      <div style={{ padding: '8px 14px 10px 36px' }}>
        <div style={{
          fontFamily: mono,
          fontSize: theme.sizeLabel,
          color: theme.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 1.1,
          marginBottom: 6,
        }}>
          Commission {entry.manifest.displayName} — local path
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            autoFocus
            type="text"
            placeholder="/path/to/app.bundle"
            value={state.path}
            onChange={e => onPathChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && state.path.trim()) onCommit()
              if (e.key === 'Escape') onCancel()
            }}
            style={{
              flex: 1,
              background: theme.surface,
              border: `1px solid ${accent}44`,
              borderRadius: 3,
              color: theme.text,
              fontFamily: mono,
              fontSize: theme.sizeMetric,
              padding: '4px 8px',
              letterSpacing: 0.3,
            }}
          />
          <button
            onClick={onCommit}
            disabled={!state.path.trim()}
            style={{
              background: state.path.trim() ? `${accent}22` : 'transparent',
              border: `1px solid ${state.path.trim() ? accent + '66' : theme.border}`,
              borderRadius: 3,
              color: state.path.trim() ? accent : theme.textMuted,
              fontFamily: mono,
              fontSize: theme.sizeLabel,
              letterSpacing: 1.1,
              textTransform: 'uppercase',
              padding: '4px 10px',
              cursor: state.path.trim() ? 'pointer' : 'default',
            }}
          >
            Commission
          </button>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.textMuted,
              fontFamily: mono,
              fontSize: theme.sizeLabel,
              cursor: 'pointer',
              padding: '4px 6px',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (state.kind === 'probing' || state.kind === 'installing') {
    const steps = [
      { label: 'Probe hardware', done: state.kind === 'installing' },
      { label: state.kind === 'installing' ? state.step : '…', done: false },
    ]
    return (
      <div style={{ padding: '8px 14px 10px 36px' }}>
        <div style={{
          fontFamily: mono,
          fontSize: theme.sizeLabel,
          color: theme.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 1.1,
          marginBottom: 6,
        }}>
          Commissioning {entry.manifest.displayName}…
        </div>
        {steps.map((s, i) => (
          <div key={i} style={{
            fontFamily: mono,
            fontSize: theme.sizeLabel,
            color: s.done ? theme.healthy : theme.textDim,
            letterSpacing: 0.8,
            marginBottom: 2,
          }}>
            {s.done ? '✓' : '·'} {s.label}
          </div>
        ))}
      </div>
    )
  }

  if (state.kind === 'done') {
    const hasCaveats = state.caveats.length > 0
    return (
      <div style={{ padding: '8px 14px 10px 36px' }}>
        <div style={{
          fontFamily: mono,
          fontSize: theme.sizeLabel,
          color: state.error ? theme.danger : theme.healthy,
          textTransform: 'uppercase',
          letterSpacing: 1.1,
          marginBottom: 4,
        }}>
          {state.error ? `Commission failed: ${state.error}` : `${entry.manifest.displayName} commissioned.`}
        </div>
        {hasCaveats && state.caveats.map(c => (
          <div key={c.id} style={{
            fontFamily: mono,
            fontSize: theme.sizeLabel,
            color: c.severity === 'blocker' ? theme.danger : theme.warn,
            letterSpacing: 0.8,
            marginBottom: 2,
          }}>
            ! {c.summary}
          </div>
        ))}
      </div>
    )
  }

  if (state.kind === 'error') {
    return (
      <div style={{ padding: '8px 14px 10px 36px' }}>
        <div style={{
          fontFamily: mono,
          fontSize: theme.sizeLabel,
          color: theme.danger,
          letterSpacing: 0.8,
        }}>
          {state.message}
        </div>
      </div>
    )
  }

  return null
}

// ── Action button ─────────────────────────────────────────────────────────────

interface ActionButtonProps {
  label: string
  onClick: () => void
  tone?: 'accent' | 'muted'
}

function ActionButton({ label, onClick, tone = 'accent' }: ActionButtonProps) {
  const { theme } = useTheme()
  const color = tone === 'muted' ? theme.textMuted : theme.accent
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      style={{
        background: `${color}1a`,
        border: `1px solid ${color}55`,
        borderRadius: 3,
        color,
        fontFamily: theme.fontMono,
        fontSize: theme.sizeLabel,
        letterSpacing: 1.1,
        textTransform: 'uppercase',
        padding: '3px 9px',
        cursor: 'pointer',
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

// ── Caveat line ───────────────────────────────────────────────────────────────
// A full-width note BELOW the row (not crammed into the row badge — that
// overflowed the 360px panel + wrapped the app name). Wraps cleanly; the
// indent aligns it under the row's title column.

function CaveatLine({ caveat }: { caveat: Caveat }) {
  const { theme } = useTheme()
  const color = caveat.severity === 'blocker' ? theme.danger
    : caveat.severity === 'warning' ? theme.warn
    : theme.textDim
  return (
    <div style={{
      display: 'flex', gap: 5,
      padding: '0 14px 8px 37px',
      fontFamily: theme.fontMono,
      fontSize: 9,
      lineHeight: 1.45,
      letterSpacing: 0.3,
      color,
    }}>
      <span aria-hidden="true" style={{ flexShrink: 0, fontWeight: 600 }}>!</span>
      <span>{caveat.summary}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function FleetTab({ onNavigate }: Props) {
  const { theme } = useTheme()
  const [fleet, setFleet] = useState<FleetEntry[] | null>(null)
  const [commission, setCommission] = useState<CommissionState | null>(null)

  // Poll fleet state every 5 s; fail-soft (no Tauri in browser dev)
  const fetchFleet = useCallback(() => {
    getFleet()
      .then(entries => setFleet(entries))
      .catch(() => setFleet(prev => prev ?? []))
  }, [])

  useEffect(() => {
    fetchFleet()
    const id = setInterval(fetchFleet, 5000)
    return () => clearInterval(id)
  }, [fetchFleet])

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (fleet === null) {
    return (
      <div>
        <SectionHeader label="Fleet · …" />
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <SkeletonRow />
            {i < 2 && <FiberDivider dim />}
          </div>
        ))}
      </div>
    )
  }

  // ── Empty ───────────────────────────────────────────────────────────────────
  if (fleet.length === 0) {
    return (
      <div>
        <SectionHeader label="Fleet · 0 apps" />
        <div style={{
          padding: '24px 14px',
          textAlign: 'center',
          fontFamily: theme.fontMono,
          fontSize: theme.sizeLabel, letterSpacing: 1.2, color: theme.textMuted,
          textTransform: 'uppercase',
        }}>
          No apps in catalog. Check tender-settings.json.
        </div>
      </div>
    )
  }

  const summary = fleetSummary(fleet)

  // Commission action handlers
  const handleStartCommission = (appId: string) => {
    setCommission({ appId, step: { kind: 'input', path: '' } })
  }

  const handlePathChange = (path: string) => {
    if (!commission) return
    setCommission({ ...commission, step: { kind: 'input', path } })
  }

  const handleCommissionCommit = async () => {
    if (!commission || commission.step.kind !== 'input') return
    const inputPath = commission.step.path.trim()
    const entry = fleet.find(e => e.manifest.id === commission.appId)
    if (!entry || !inputPath) return

    setCommission({ ...commission, step: { kind: 'probing' } })

    let profile
    try {
      const rec = await recommendProfile()
      profile = rec.recommended
    } catch (err) {
      setCommission({
        ...commission,
        step: {
          kind: 'error',
          message: `Hardware probe failed. Check system access. (${String(err)})`,
        },
      })
      return
    }

    setCommission({ ...commission, step: { kind: 'installing', step: 'Place bundle' } })

    const version = entry.version && entry.version !== 'unknown' && entry.version !== ''
      ? entry.version
      : '0.1.0'

    const request: InstallRequest = {
      appId: entry.manifest.id,
      version,
      source: { kind: entry.manifest.install.sourceKind, path: inputPath },
      profile,
    }

    let installOutcome
    try {
      installOutcome = await installAppLocal(request)
    } catch (err) {
      setCommission({
        ...commission,
        step: {
          kind: 'error',
          message: `Install failed. ${String(err)}`,
        },
      })
      return
    }

    if (installOutcome.status === 'failed') {
      setCommission({
        ...commission,
        step: {
          kind: 'done',
          caveats: entry.manifest.caveats,
          error: installOutcome.detail ?? 'Install returned failed status.',
        },
      })
      return
    }

    setCommission({ ...commission, step: { kind: 'installing', step: 'Launch (hand-off)' } })

    try {
      await launchApp(entry.manifest.id)
    } catch (err) {
      setCommission({
        ...commission,
        step: {
          kind: 'done',
          caveats: entry.manifest.caveats,
          error: `Launch failed. ${String(err)}`,
        },
      })
      return
    }

    // Success — show caveats, then re-fetch fleet so row flips state
    setCommission({
      ...commission,
      step: { kind: 'done', caveats: entry.manifest.caveats },
    })
    // Small delay so the user sees the "commissioned" message, then refresh
    setTimeout(() => {
      fetchFleet()
      setCommission(null)
    }, 2800)
  }

  const handleCancelCommission = () => setCommission(null)

  const handleLaunch = async (entry: FleetEntry) => {
    try {
      await launchApp(entry.manifest.id)
      fetchFleet()
    } catch {
      // Silently ignore; IPC may not be present in dev browser
    }
  }

  return (
    <div>
      <SectionHeader label={`↳ Fleet · ${summary.toUpperCase()}`} />

      {fleet.map((entry, i) => {
        const { manifest } = entry
        const isCommissioning = commission?.appId === manifest.id
        const commStep = isCommissioning ? commission!.step : ({ kind: 'idle' } as CommissionStep)
        const dim = manifest.availability === 'planned' || !entry.installed
        const hasCaveats = manifest.caveats.length > 0
        const detailId = DETAIL_MAP[manifest.id] ?? 'engine-room'

        // Sub-label text
        const subLabel = availabilityLabel(entry)

        // Row click — only navigates when running
        const handleRowClick = isRunning(entry) && !isCommissioning
          ? () => onNavigate(detailId)
          : undefined

        return (
          <div key={manifest.id} style={dim ? { opacity: 0.55 } : undefined}>
            {/* Main row */}
            <ConsoleRow
              indicator="port"
              name={manifest.displayName}
              subLabel={subLabel}
              active={isRunning(entry)}
              onClick={handleRowClick}
              badge={
                !isCommissioning && (isInstallable(entry) || isStopped(entry)) ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {isInstallable(entry) && (
                      <ActionButton label="Commission" onClick={() => handleStartCommission(manifest.id)} />
                    )}
                    {isStopped(entry) && (
                      <ActionButton label="Launch" onClick={() => handleLaunch(entry)} />
                    )}
                  </div>
                ) : undefined
              }
            />

            {/* Caveat — full-width line below the row (wraps cleanly; never crammed
                into the row badge). Shown for installable or running apps. */}
            {hasCaveats && !isCommissioning && (isInstallable(entry) || isRunning(entry)) && (
              <CaveatLine caveat={manifest.caveats[0]} />
            )}

            {/* Commission inline flow */}
            {isCommissioning && commStep.kind !== 'idle' && (
              <div style={{
                background: theme.bgSoft,
                borderBottom: `1px solid ${theme.border}`,
              }}>
                <CommissionFlow
                  entry={entry}
                  state={commStep}
                  onPathChange={handlePathChange}
                  onCommit={handleCommissionCommit}
                  onCancel={handleCancelCommission}
                />
              </div>
            )}

            {i < fleet.length - 1 && <FiberDivider dim />}
          </div>
        )
      })}
    </div>
  )
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  const { theme } = useTheme()
  return (
    <div style={{
      padding: '10px 14px 4px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <span style={{
        fontFamily: theme.fontMono,
        fontSize: theme.sizeLabel, letterSpacing: 1.4,
        textTransform: 'uppercase', color: theme.textMuted,
      }}>
        {label}
      </span>
    </div>
  )
}

function SkeletonRow() {
  const { theme } = useTheme()
  return (
    <div
      role="status"
      aria-label="Loading app…"
      style={{
        padding: '11px 14px 11px 12px',
        display: 'flex', alignItems: 'center', gap: 11,
        minHeight: 46,
      }}
    >
      <div style={{ width: 10, height: 10, borderRadius: 99, background: theme.border }} />
      <div style={{ flex: 1 }}>
        <div style={{ width: '45%', height: 10, borderRadius: 3, background: theme.border, marginBottom: 5 }} />
        <div style={{ width: '30%', height: 8, borderRadius: 3, background: `${theme.border}88` }} />
      </div>
    </div>
  )
}
