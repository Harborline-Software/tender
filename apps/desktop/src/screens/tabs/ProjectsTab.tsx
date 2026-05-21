import { useTheme } from '@/theme/ThemeProvider'
import { ConsoleRow } from '@/components/ConsoleRow'
import { FiberDivider } from '@/components/FiberDivider'

const PROJECTS = [
  { name: 'harbor-east',          path: '~/Code/harbor-east',  status: 'active'   },
  { name: 'sunfish-indexer',      path: '~/Code/sunfish-idx',  status: 'active'   },
  { name: 'flight-deck-control',  path: '~/Code/flight-deck',  status: 'active'   },
  { name: 'tender-helm',          path: '~/Code/tender',       status: 'paused'   },
  { name: 'old-sloop-prototype',  path: '~/Code/old-sloop',    status: 'archived' },
]

export function ProjectsTab() {
  const { theme } = useTheme()
  const a = theme.accent

  return (
    <div>
      <div style={{
        padding: '8px 14px 4px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, letterSpacing: 1.4,
          textTransform: 'uppercase', color: theme.textMuted,
        }}>↳ 5 projects · 3 active</span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, color: a, letterSpacing: 0.6, cursor: 'pointer',
        }}>+ new</span>
      </div>

      {PROJECTS.map((p, i) => (
        <div key={p.name}>
          <ConsoleRow
            indicator="grid"
            name={p.name}
            subLabel={p.path}
            meter={p.status.toUpperCase()}
            active={p.status === 'active'}
          />
          {i < PROJECTS.length - 1 && <FiberDivider dim />}
        </div>
      ))}
    </div>
  )
}
