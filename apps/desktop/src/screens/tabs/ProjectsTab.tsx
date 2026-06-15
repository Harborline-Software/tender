/**
 * ProjectsTab — local project directory list.
 *
 * Projects are sourced from the Tauri backend (getProjects IPC) via
 * useProjects hook in useTelemetry. Resolution order:
 *   1. ~/Library/Application Support/Tender/projects.json (curated list)
 *   2. Autodiscovery: git repos under ~/Projects/ (depth ≤ 2)
 *
 * Status shows the project's honest lifecycle (ACTIVE / PAUSED / ARCHIVED) —
 * NOT a health pill (a project isn't "degraded"; it's archived). Label + colour
 * (text is always shown, so it's not colour-alone — WCAG 1.4.1).
 */
import { useTheme } from '@/theme/ThemeProvider'
import { ConsoleRow } from '@/components/ConsoleRow'
import { FiberDivider } from '@/components/FiberDivider'
import { useProjects } from '@/ipc/useTelemetry'
import type { ProjectData } from '@/ipc/tauri'

// Honest lifecycle label + tone per project status.
const STATUS_LABEL: Record<ProjectData['status'], string> = {
  active: 'ACTIVE',
  paused: 'PAUSED',
  archived: 'ARCHIVED',
}

function ProjectStatusPill({ status }: { status: ProjectData['status'] }) {
  const { theme } = useTheme()
  const color = status === 'active' ? theme.accent
    : status === 'paused' ? theme.textMuted
    : theme.textDim
  return (
    <div style={{
      fontFamily: theme.fontMono,
      fontSize: theme.sizeLabel,
      letterSpacing: 1.1,
      textTransform: 'uppercase',
      color,
      background: `${color}14`,
      border: `1px solid ${color}44`,
      borderRadius: 99,
      padding: '2px 8px',
      flexShrink: 0,
    }}>
      {STATUS_LABEL[status]}
    </div>
  )
}

export function ProjectsTab() {
  const { theme } = useTheme()
  const projects = useProjects()

  // ── Loading state ────────────────────────────────────────────────────────────
  if (projects === null) {
    return (
      <div>
        <SectionHeader />
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
  if (projects.length === 0) {
    return (
      <div>
        <SectionHeader />
        <div style={{
          padding: '24px 14px', textAlign: 'center',
          fontFamily: theme.fontMono,
          fontSize: theme.sizeLabel, letterSpacing: 1.2, color: theme.textMuted,
          textTransform: 'uppercase',
        }}>
          No projects yet — add repos to ~/Library/Application Support/Tender/projects.json
        </div>
      </div>
    )
  }

  // ── Live state ───────────────────────────────────────────────────────────────
  const activeCount = projects.filter(p => p.status === 'active').length
  return (
    <div>
      <div style={{
        padding: '8px 14px 4px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: theme.fontMono,
          fontSize: theme.sizeLabel, letterSpacing: 1.4,
          textTransform: 'uppercase', color: theme.textMuted,
        }}>
          ↳ {projects.length} projects · {activeCount} active
        </span>
        <span style={{
          fontFamily: theme.fontMono,
          fontSize: theme.sizeLabel, color: theme.accent, letterSpacing: 0.6, cursor: 'pointer',
        }}>
          + new
        </span>
      </div>

      {projects.map((p, i) => (
        <div key={p.name}>
          <ConsoleRow
            indicator="grid"
            name={p.name}
            subLabel={p.path}
            active={p.status === 'active'}
            badge={<ProjectStatusPill status={p.status} />}
          />
          {i < projects.length - 1 && <FiberDivider dim />}
        </div>
      ))}
    </div>
  )
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function SectionHeader() {
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
        ↳ Projects
      </span>
      <span style={{
        fontFamily: theme.fontMono,
        fontSize: theme.sizeLabel, color: theme.accent, letterSpacing: 0.6, cursor: 'pointer',
      }}>
        + new
      </span>
    </div>
  )
}

function SkeletonRow() {
  const { theme } = useTheme()
  return (
    <div
      role="status"
      aria-label="Loading project…"
      style={{
        padding: '11px 14px 11px 12px',
        display: 'flex', alignItems: 'center', gap: 11,
        minHeight: 46,
      }}
    >
      <div style={{ width: 11, height: 11, borderRadius: 2, background: theme.border }} />
      <div style={{ flex: 1 }}>
        <div style={{ width: '40%', height: 10, borderRadius: 3, background: theme.border, marginBottom: 5 }} />
        <div style={{ width: '60%', height: 8, borderRadius: 3, background: `${theme.border}88` }} />
      </div>
    </div>
  )
}
