import { useState, useEffect, useCallback } from 'react'
import { listen } from '@tauri-apps/api/event'
import { WorkspaceShell, WorkspaceShellPanelToggle } from '@shipyard/workspace-shell'
import { Search, Sparkles, Ship, FolderGit2, Activity, TerminalSquare } from 'lucide-react'
import { useTheme } from '@/theme/ThemeProvider'
import { Logomark } from '@/components/Logomark'
import { ModuleSwitcher, type ModuleSwitcherSection } from './ModuleSwitcher'
import { FleetSection } from './sections/FleetSection'
import { ProjectsSection } from './sections/ProjectsSection'
import { ServicesSection } from './sections/ServicesSection'
import { ConsoleSection } from './sections/ConsoleSection'
import './toolbox.css'

type SectionId = 'fleet' | 'projects' | 'services' | 'console'

const SHELL_ID = 'toolbox'
const NAVIGATION_ID = `${SHELL_ID}-navigation`

const SECTIONS: ModuleSwitcherSection[] = [
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
  // Portal target for the active module's master list (CIC design amendment,
  // tender#103): the shell's `navigation` region now holds the ModuleSwitcher +
  // whichever module is active's own list — mirroring Carrier's
  // switcher-atop-SideNav composition — while `main` holds ONLY the detail pane.
  // A ref-callback (not useRef) so the portal target is available on first
  // render, before any effect runs.
  const [masterSlotEl, setMasterSlotEl] = useState<HTMLDivElement | null>(null)

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

  const selectSection = useCallback((id: string) => {
    setSection(id as SectionId)
    setFocusItem(null)
    setQuery('')
  }, [])

  const navigation = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ModuleSwitcher sections={SECTIONS} activeId={section} onSwitch={selectSection} />
      {/* Portal target for the active module's master list. The shell's own
          navigation region is `overflow: hidden` by design (it clips to the rail
          width while the consumer supplies its own inner scroller) — this div is
          that inner scroller, exactly as Carrier's own sideNavEl wraps its
          SideNav in a `flex-1 overflow-y-auto` div for the same reason. */}
      <div ref={setMasterSlotEl} style={{ flex: 1, minHeight: 0, overflowY: 'auto' }} />
    </div>
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

  // narrow/back-affordance signal is now the shell's OWN nav-collapse state, not
  // a hand-rolled fold — kept false here; see ModuleSwitcher + the shell's own
  // rail/overlay responsive behavior for narrow-viewport handling.
  const sectionProps = { narrow: false, query, focusItem, masterSlotEl }

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
      panelSizes={{ navigation: 260 }}
      navigationLabel="Toolbox modules"
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
