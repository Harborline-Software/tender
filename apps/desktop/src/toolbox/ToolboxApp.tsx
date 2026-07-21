import { useState, useEffect, useCallback } from 'react'
import { listen } from '@tauri-apps/api/event'
import { WorkspaceShell, WorkspaceShellPanelToggle } from '@shipyard/workspace-shell'
import { Search, Sparkles, Ship, FolderGit2, Activity, TerminalSquare } from 'lucide-react'
import { useTheme } from '@/theme/ThemeProvider'
import { Logomark } from '@/components/Logomark'
import { useMediaQuery, NARROW_QUERY } from './useMediaQuery'
import { FleetSection } from './sections/FleetSection'
import { ProjectsSection } from './sections/ProjectsSection'
import { ServicesSection } from './sections/ServicesSection'
import { ConsoleSection } from './sections/ConsoleSection'
import './toolbox.css'

type SectionId = 'fleet' | 'projects' | 'services' | 'console'

const SHELL_ID = 'toolbox'
const NAVIGATION_ID = `${SHELL_ID}-navigation`

const SECTIONS: { id: SectionId; label: string; hint: string; icon: typeof Ship }[] = [
  { id: 'fleet', label: 'Fleet', hint: 'Harborline apps', icon: Ship },
  { id: 'projects', label: 'Projects', hint: 'Local repos', icon: FolderGit2 },
  { id: 'services', label: 'Services', hint: 'Processes & system', icon: Activity },
  { id: 'console', label: 'Console', hint: 'Operator management', icon: TerminalSquare },
]

const SECTION_IDS = new Set<string>(SECTIONS.map((s) => s.id))

export function ToolboxApp() {
  const { theme, mode } = useTheme()
  const [section, setSection] = useState<SectionId>('fleet')
  const [focusItem, setFocusItem] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const narrow = useMediaQuery(NARROW_QUERY)

  // Deep-link navigation from the tray popup (Rust emits `toolbox-navigate` with
  // `<section>` or `<section>:<item>`). The section consumes `focusItem` to
  // pre-select the deep-linked row.
  useEffect(() => {
    let unlisten: (() => void) | undefined
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      listen<string>('toolbox-navigate', (e) => {
        const [sec, item] = e.payload.split(':')
        if (SECTION_IDS.has(sec)) {
          setSection(sec as SectionId)
          setFocusItem(item ?? null)
          setQuery('')
        }
      }).then((fn) => { unlisten = fn })
    }
    return () => { unlisten?.() }
  }, [])

  const selectSection = useCallback((id: SectionId) => {
    setSection(id)
    setFocusItem(null)
    setQuery('')
  }, [])

  const navigation = (
    <nav aria-label="Toolbox sections" style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {SECTIONS.map((s) => {
        const Icon = s.icon
        const active = s.id === section
        return (
          <button
            key={s.id}
            onClick={() => selectSection(s.id)}
            aria-current={active ? 'page' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 11px',
              borderRadius: 7,
              border: `1px solid ${active ? `${theme.accent}55` : 'transparent'}`,
              background: active ? `${theme.accent}1f` : 'transparent',
              color: active ? theme.text : theme.textDim,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: theme.fontRow,
              transition: 'background 150ms ease',
            }}
            onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = `${theme.accent}0d` }}
            onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <Icon size={17} aria-hidden style={{ color: active ? theme.accent : theme.textMuted, flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: theme.sizeRowTitle, fontWeight: 600 }}>{s.label}</span>
              <span style={{ display: 'block', fontFamily: theme.fontMono, fontSize: theme.sizeLabel, letterSpacing: 0.6, color: theme.textMuted, marginTop: 1 }}>
                {s.hint}
              </span>
            </span>
          </button>
        )
      })}
    </nav>
  )

  const headerTitle = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <Logomark size={22} />
      <span style={{ fontFamily: theme.fontDisplay, fontSize: 15, fontWeight: 600, letterSpacing: -0.2, color: theme.text }}>
        Harborline Toolbox
      </span>
    </span>
  )

  const headerTrailing = (
    <div className="toolbox-header-trailing">
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: 'min(38vw, 26rem)',
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: 6,
          padding: '6px 10px',
        }}
      >
        <Search size={15} aria-hidden style={{ color: theme.textMuted, flexShrink: 0 }} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Filter ${SECTIONS.find((s) => s.id === section)?.label ?? ''}…`}
          aria-label={`Filter ${section}`}
          style={{
            flex: 1,
            minWidth: 0,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: theme.text,
            fontFamily: theme.fontRow,
            fontSize: theme.sizeBody,
          }}
        />
      </label>

      {/* Pilot slot — the shipyard chrome's assistant seam. Pilot is not wired
          into the Toolbox surface; an honest, designed "not available here" state
          (quiet, never error-styled), not a dead button pretending to work. */}
      <button
        type="button"
        aria-disabled="true"
        title="Pilot is not available in the Toolbox surface."
        onClick={(e) => e.preventDefault()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'transparent',
          border: `1px solid ${theme.border}`,
          borderRadius: 6,
          padding: '6px 10px',
          color: theme.textMuted,
          fontFamily: theme.fontRow,
          fontSize: theme.sizeBody,
          cursor: 'default',
        }}
      >
        <Sparkles size={14} aria-hidden />
        Pilot
      </button>

      <span
        aria-hidden
        title={`Following system appearance · ${mode}`}
        style={{
          fontFamily: theme.fontMono,
          fontSize: theme.sizeLabel,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: theme.textMuted,
          padding: '0 2px',
        }}
      >
        {mode}
      </span>
    </div>
  )

  const sectionProps = { narrow, query, focusItem }

  return (
    <WorkspaceShell
      id={SHELL_ID}
      className="toolbox-frame"
      headerClassName="toolbox-header"
      contextTitle="Harborline Toolbox"
      contextHref="#"
      headerTitle={headerTitle}
      headerLeading={
        <WorkspaceShellPanelToggle
          shellId={SHELL_ID}
          panel="navigation"
          controls={NAVIGATION_ID}
          label="Toggle sections"
        />
      }
      headerTrailing={headerTrailing}
      switcher={null}
      navigation={navigation}
      inspector={null}
      utility={null}
      inspectorMode="hidden"
      utilityMode="hidden"
      panelSizes={{ navigation: 240 }}
      navigationLabel="Toolbox sections"
      mainLabel="Toolbox content"
      showShortcuts={false}
      labels={{ navigation: 'Toggle sections' }}
    >
      <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', background: theme.bg }}>
        {section === 'fleet' && <FleetSection {...sectionProps} />}
        {section === 'projects' && <ProjectsSection {...sectionProps} />}
        {section === 'services' && <ServicesSection {...sectionProps} />}
        {section === 'console' && <ConsoleSection {...sectionProps} />}
      </div>
    </WorkspaceShell>
  )
}
