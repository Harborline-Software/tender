import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { FolderGit2, ExternalLink } from 'lucide-react'
import { useTheme } from '@/theme/ThemeProvider'
import { getProjects, openExternal, type ProjectData } from '@/ipc/tauri'
import { MasterRow, MasterHeader, PaneHeader, DetailPlaceholder, EmptyState, SkeletonList } from '../ui'

const STATUS_TONE: Record<ProjectData['status'], 'healthy' | 'warn' | 'danger' | undefined> = {
  active: 'healthy',
  paused: 'warn',
  archived: undefined,
}

interface Props {
  narrow: boolean
  query: string
  focusItem: string | null
  /** Portal target in the shell's navigation region (CIC design amendment,
   *  tender#103) — see FleetSection for the pattern. */
  masterSlotEl: HTMLElement | null
}

export function ProjectsSection({ narrow, query, focusItem, masterSlotEl }: Props) {
  const { theme } = useTheme()
  const [projects, setProjects] = useState<ProjectData[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const fetchProjects = useCallback(() => {
    getProjects().then((p) => setProjects(p)).catch(() => setProjects((prev) => prev ?? []))
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])
  useEffect(() => { if (focusItem) setSelected(focusItem) }, [focusItem])

  const filtered = useMemo(() => {
    if (!projects) return null
    const q = query.trim().toLowerCase()
    if (!q) return projects
    return projects.filter((p) => p.name.toLowerCase().includes(q) || p.path.toLowerCase().includes(q))
  }, [projects, query])

  const selectedProject = filtered?.find((p) => p.path === selected) ?? null

  const master = (
    <div>
      <MasterHeader label="Projects" count={filtered ? `${filtered.length}` : undefined} />
      {filtered === null && <SkeletonList />}
      {filtered !== null && filtered.length === 0 && (
        <EmptyState
          title="No projects discovered"
          hint="Tender lists repos from ~/Library/Application Support/Tender/projects.json, else git repos under ~/Projects. Add one to see it here."
        />
      )}
      {filtered?.map((p) => (
        <MasterRow
          key={p.path}
          icon={<FolderGit2 size={15} />}
          title={p.name}
          sub={p.status.toUpperCase()}
          tone={STATUS_TONE[p.status]}
          selected={p.path === selected}
          onClick={() => setSelected(p.path)}
        />
      ))}
    </div>
  )

  const detail = selectedProject ? (
    <div>
      <PaneHeader
        title={selectedProject.name}
        sub={selectedProject.status}
        onBack={narrow ? () => setSelected(null) : undefined}
        actions={
          <button
            onClick={() => openExternal(selectedProject.path).catch(() => {})}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: `${theme.accent}1a`,
              border: `1px solid ${theme.accent}55`,
              borderRadius: 4,
              // accentText (design-review D1, tender#103): this IS the label
              // text — accent-as-fill/-border above stays on plain `accent`.
              color: theme.accentText,
              fontFamily: theme.fontMono,
              fontSize: theme.sizeLabel,
              letterSpacing: 1.1,
              textTransform: 'uppercase',
              padding: '5px 10px',
              cursor: 'pointer',
            }}
          >
            <ExternalLink size={12} /> Reveal
          </button>
        }
      />
      <dl style={{ padding: '16px 18px', margin: 0, display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '10px 18px' }}>
        <Field label="Path" value={selectedProject.path} mono />
        <Field label="Status" value={selectedProject.status} />
        <Field label="Last opened" value={selectedProject.lastOpened ?? 'unknown'} mono={!!selectedProject.lastOpened} />
      </dl>
    </div>
  ) : (
    <DetailPlaceholder icon={<FolderGit2 size={28} />} message="Select a project to see its path, status, and reveal it in Finder." />
  )

  return (
    <>
      {masterSlotEl && createPortal(master, masterSlotEl)}
      {detail}
    </>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const { theme } = useTheme()
  return (
    <>
      <dt
        style={{
          fontFamily: theme.fontMono,
          fontSize: theme.sizeLabel,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: theme.textMuted,
          alignSelf: 'baseline',
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          margin: 0,
          fontFamily: mono ? theme.fontMono : theme.fontRow,
          fontSize: mono ? theme.sizeMetric : theme.sizeBody,
          color: theme.text,
          wordBreak: 'break-all',
        }}
      >
        {value}
      </dd>
    </>
  )
}
