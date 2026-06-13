/**
 * TabStrip — top-level tab navigation.
 *
 * R8 Console tab added (design-review F1.3 + F6): operator management
 * surfaces (Bundles, Backups, Sync/Relay, Diagnostics) now live in the
 * Console tab instead of the gear menu grab-bag. Four tabs fit 360px at
 * 90px each without cramping.
 */
import { useTheme } from '@/theme/ThemeProvider'

export type TabId = 'fleet' | 'projects' | 'services' | 'console'

const TABS: { id: TabId; label: string }[] = [
  { id: 'fleet',    label: 'Fleet' },
  { id: 'projects', label: 'Projects' },
  { id: 'services', label: 'Services' },
  { id: 'console',  label: 'Console' },
]

interface Props {
  active: TabId
  onChange: (id: TabId) => void
}

export function TabStrip({ active, onChange }: Props) {
  const { theme } = useTheme()
  const a = theme.accent

  return (
    <div
      style={{
        display: 'flex',
        height: 38,
        flexShrink: 0,
        background: `linear-gradient(180deg, ${theme.bgSoft} 0%, ${theme.bg} 100%)`,
      }}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              borderBottom: isActive ? `2px solid ${a}` : '2px solid transparent',
              boxShadow: isActive ? `0 2px 6px ${a}88, 0 2px 10px ${a}55` : undefined,
              color: isActive ? theme.text : theme.textDim,
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 12,
              fontWeight: isActive ? 600 : 500,
              cursor: 'pointer',
              transition: 'color 120ms ease',
              paddingBottom: 2,
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
