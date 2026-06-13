/**
 * ProjectsTab — local project directory list.
 *
 * Projects are sourced from the Tauri backend (getProjects IPC).
 * Until that command lands, a graceful "not yet configured" empty state
 * is shown rather than hardcoded fictional data.
 *
 * Status encoding is multimodal: active/paused/archived map to HealthState
 * so StatusPill renders glyph+text+color (not color alone — WCAG 1.4.1).
 */
import { useState, useEffect } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { ConsoleRow } from '@/components/ConsoleRow'
import { FiberDivider } from '@/components/FiberDivider'
import { StatusPill } from '@/components/StatusPill'
import type { Project } from '@/state/types'
import type { HealthState } from '@/state/health'

// Projects don't have a "health" in the systems sense, but we map lifecycle
// states to HealthState so StatusPill handles encoding uniformly.
function projectStatusToHealth(status: Project['status']): HealthState {
  switch (status) {
    case 'active': return 'healthy'
    case 'paused': return 'stopped'
    case 'archived': return 'degraded'
  }
}

// Projects IPC is not yet implemented — this hook returns null (loading)
// or throws into an error state. When getProjects is wired, swap this stub.
function useProjects(): { projects: Project[] | null; error: string | null } {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [error] = useState<string | null>(null)
  useEffect(() => {
    // Projects list IPC not yet implemented; surface empty state
    // rather than hardcoded fictional data. Resolved as empty array.
    setProjects([])
  }, [])
  return { projects, error }
}

export function ProjectsTab() {
  const { theme } = useTheme()
  const { projects, error } = useProjects()

  // ── Loading state ────────────────────────────────────────────────────────────
  if (projects === null && !error) {
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

  // ── Error state ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div>
        <SectionHeader />
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
              Projects unavailable
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

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!projects || projects.length === 0) {
    return (
      <div>
        <SectionHeader />
        <div style={{
          padding: '24px 14px', textAlign: 'center',
          fontFamily: theme.fontMono,
          fontSize: theme.sizeLabel, letterSpacing: 1.2, color: theme.textMuted,
          textTransform: 'uppercase',
        }}>
          No projects yet — add one to get started.
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

      {projects.map((p, i) => {
        const health = projectStatusToHealth(p.status)
        return (
          <div key={p.name}>
            <ConsoleRow
              indicator="grid"
              name={p.name}
              subLabel={p.path}
              active={health === 'healthy'}
              badge={<StatusPill health={health} />}
            />
            {i < projects.length - 1 && <FiberDivider dim />}
          </div>
        )
      })}
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
