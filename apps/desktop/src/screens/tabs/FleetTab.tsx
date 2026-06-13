/**
 * FleetTab — installed Harborline tools list.
 *
 * Wires to live telemetry via useServices. Each row shows a multimodal
 * StatusPill (color + glyph + text) so health is never conveyed by color
 * alone (WCAG 1.4.1). The header summary derives from actual state.
 */
import { useTheme } from '@/theme/ThemeProvider'
import { ConsoleRow } from '@/components/ConsoleRow'
import { FiberDivider } from '@/components/FiberDivider'
import { StatusPill } from '@/components/StatusPill'
import { useServices } from '@/ipc/useTelemetry'
import { serviceStatusToHealth, worstHealth, healthSummary } from '@/state/health'
import { type DetailId } from '@/state/types'

const DETAIL_MAP: Record<string, DetailId> = {
  'signal-bridge': 'signal-bridge',
  sunfish: 'sunfish',
  'flight-deck': 'flight-deck',
}

interface Props {
  onNavigate: (id: DetailId) => void
}

export function FleetTab({ onNavigate }: Props) {
  const { theme } = useTheme()
  const services = useServices()

  // ── Loading state ────────────────────────────────────────────────────────────
  if (services === null) {
    return (
      <div>
        <SectionHeader label="Installed · …" actionLabel="+ install" />
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <SkeletonRow />
            {i < 2 && <FiberDivider dim />}
          </div>
        ))}
      </div>
    )
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (services.length === 0) {
    return (
      <div>
        <SectionHeader label="Installed · 0 tools" actionLabel="+ install" />
        <EmptyState message="No Harborline tools detected on this node." />
      </div>
    )
  }

  // ── Live state ───────────────────────────────────────────────────────────────
  const healthStates = services.map(s => serviceStatusToHealth(s.status))
  const worst = worstHealth(healthStates)
  const summary = healthSummary(healthStates)
  const summaryColor = worst === 'healthy' ? theme.healthy
    : worst === 'degraded' ? theme.warn
    : worst === 'stopped' ? theme.textMuted
    : theme.danger

  return (
    <div>
      <div style={{
        padding: '10px 14px 4px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: theme.fontMono,
          fontSize: theme.sizeLabel, letterSpacing: 1.4,
          textTransform: 'uppercase', color: theme.textMuted,
        }}>
          ↳ Installed · {services.length} {services.length === 1 ? 'tool' : 'tools'}
        </span>
        <span style={{
          fontFamily: theme.fontMono,
          fontSize: theme.sizeLabel, color: summaryColor, letterSpacing: 0.6,
        }}>
          {summary}
        </span>
      </div>

      {services.map((s, i) => {
        const health = serviceStatusToHealth(s.status)
        const detailId = DETAIL_MAP[s.id] ?? 'engine-room'

        // Derive metric label — show something meaningful per service type
        const metricLabel = s.activeTasks != null
          ? `${s.activeTasks} tasks`
          : s.airborne != null && s.totalWorkers != null
            ? `${s.airborne}/${s.totalWorkers} airborne`
            : s.throughputMbps != null
              ? `${s.throughputMbps.toFixed(1)} MB/s`
              : undefined

        return (
          <div key={s.id}>
            <ConsoleRow
              indicator="port"
              name={s.displayName}
              subLabel={`v${s.version} · ${s.status}`}
              meter={metricLabel}
              active={health === 'healthy'}
              danger={health === 'error'}
              badge={
                <StatusPill health={health} glyphOnly />
              }
              onClick={() => onNavigate(detailId)}
            />
            {i < services.length - 1 && <FiberDivider dim />}
          </div>
        )
      })}
    </div>
  )
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function SectionHeader({ label, actionLabel }: { label: string; actionLabel: string }) {
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
      }}>{label}</span>
      <span style={{
        fontFamily: theme.fontMono,
        fontSize: theme.sizeLabel, color: theme.accent, letterSpacing: 0.6, cursor: 'pointer',
      }}>{actionLabel}</span>
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
      <div style={{ width: 10, height: 10, borderRadius: 99, background: theme.border }} />
      <div style={{ flex: 1 }}>
        <div style={{ width: '45%', height: 10, borderRadius: 3, background: theme.border, marginBottom: 5 }} />
        <div style={{ width: '30%', height: 8, borderRadius: 3, background: `${theme.border}88` }} />
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  const { theme } = useTheme()
  return (
    <div style={{
      padding: '24px 14px',
      textAlign: 'center',
      fontFamily: theme.fontMono,
      fontSize: theme.sizeLabel, letterSpacing: 1.2, color: theme.textMuted,
      textTransform: 'uppercase',
    }}>
      {message}
    </div>
  )
}
