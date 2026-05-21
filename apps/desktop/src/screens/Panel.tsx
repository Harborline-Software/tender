import { useState } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { MenuShell } from '@/components/MenuShell'
import { FiberDivider } from '@/components/FiberDivider'
import { Logomark } from '@/components/Logomark'
import { TabStrip, type TabId } from '@/components/TabStrip'
import { ConsoleRow } from '@/components/ConsoleRow'
import { FleetTab } from './tabs/FleetTab'
import { ProjectsTab } from './tabs/ProjectsTab'
import { ServicesTab } from './tabs/ServicesTab'
import { type Screen, type DetailId } from '@/state/types'

const GEAR_ITEMS = [
  { id: 'about', label: 'About Tender' },
  { id: 'faq', label: 'FAQ' },
  { id: 'plugins', label: 'Plugins' },
  { id: 'proxy', label: 'Proxy settings' },
  { id: 'appearance', label: 'Appearance & behavior' },
  { id: 'account', label: 'Account · Log out', muted: true },
  { id: 'logs', label: 'Collect logs & diagnostics' },
  { id: 'dry-dock', label: 'Dry Dock (shutdown)', danger: true },
] as const

type GearId = (typeof GEAR_ITEMS)[number]['id']

interface Props {
  onNavigate: (screen: Screen) => void
}

export function Panel({ onNavigate }: Props) {
  const { theme } = useTheme()
  const [tab, setTab] = useState<TabId>('fleet')
  const [wsOpen, setWsOpen] = useState(false)
  const [gearOpen, setGearOpen] = useState(false)
  const [workspace, setWorkspace] = useState('Local')

  const a = theme.accent
  const m = theme.metalBright

  const updatesAvailable = 3  // stub; wired to real data in M3

  const closePopovers = () => { setWsOpen(false); setGearOpen(false) }

  const handleTabChange = (id: TabId) => {
    setTab(id)
    closePopovers()
  }

  const handleNavigate = (id: DetailId) => {
    closePopovers()
    onNavigate({ kind: 'detail', id })
  }

  const handleGearSelect = (id: GearId) => {
    closePopovers()
    const map: Partial<Record<GearId, DetailId>> = {
      appearance: 'dock-settings',
      logs: 'engine-room',
      'dry-dock': 'dry-dock',
    }
    const detailId = map[id]
    if (detailId) onNavigate({ kind: 'detail', id: detailId })
  }

  return (
    <MenuShell>
      {/* Header */}
      <div style={{
        padding: '11px 10px 11px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: `linear-gradient(180deg, ${theme.bgSoft} 0%, ${theme.bg} 100%)`,
        flexShrink: 0,
      }}>
        <Logomark size={26} />

        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: 'italic',
          fontSize: 16,
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: 0.2,
          color: theme.text,
          flexShrink: 0,
        }}>
          Tender
        </div>

        <div style={{ flex: 1 }} />

        {/* Workspace dropdown */}
        <button
          onClick={() => { setWsOpen((o) => !o); setGearOpen(false) }}
          style={{
            background: `${a}1a`,
            border: `1px solid ${a}55`,
            borderRadius: 4,
            padding: '4px 7px',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            color: theme.text,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: 0.6,
            cursor: 'pointer',
            boxShadow: `0 0 6px ${a}22, inset 0 0 4px ${a}1a`,
          }}
        >
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: a,
            boxShadow: `0 0 4px ${a}, 0 0 8px ${a}88`,
            animation: 'dotPulse 3s ease-in-out infinite',
          }} />
          {workspace}
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M2 3L4 5L6 3" stroke={theme.text} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Update icon — only when updates pending */}
        {updatesAvailable > 0 && (
          <button
            onClick={() => handleNavigate('release-notes')}
            title={`${updatesAvailable} updates available`}
            style={{
              position: 'relative',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              width: 26,
              height: 26,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${m}22` }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1.5L6.5 8.5M3.5 6L6.5 9L9.5 6" stroke={m} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 11L11 11" stroke={m} strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span style={{
              position: 'absolute', top: 3, right: 3,
              width: 6, height: 6, borderRadius: '50%',
              background: m,
              boxShadow: `0 0 4px ${m}, 0 0 8px ${m}aa`,
              border: `1px solid ${theme.bg}`,
            }} />
          </button>
        )}

        {/* Gear icon */}
        <button
          onClick={() => { setGearOpen((o) => !o); setWsOpen(false) }}
          title="Settings"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            width: 26,
            height: 26,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${a}22` }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2.4" fill="none" stroke={theme.textDim} strokeWidth="1.3" />
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const rad = (Math.PI * 2 * i) / 6
              return (
                <line key={i}
                  x1={7 + Math.cos(rad) * 4.3} y1={7 + Math.sin(rad) * 4.3}
                  x2={7 + Math.cos(rad) * 5.8} y2={7 + Math.sin(rad) * 5.8}
                  stroke={theme.textDim} strokeWidth="1.4" strokeLinecap="round"
                />
              )
            })}
          </svg>
        </button>
      </div>

      <FiberDivider />

      {/* Tab strip */}
      <TabStrip active={tab} onChange={handleTabChange} />

      <FiberDivider />

      {/* Tab body */}
      {tab === 'fleet' && <FleetTab onNavigate={handleNavigate} />}
      {tab === 'projects' && <ProjectsTab />}
      {tab === 'services' && <ServicesTab onNavigate={handleNavigate} />}

      {/* Bottom separator + Dry Dock */}
      <FiberDivider />
      <ConsoleRow
        name="Dry Dock" subLabel="Graceful shutdown" danger
        onClick={() => handleNavigate('dry-dock')}
      />

      {/* Workspace popover */}
      {wsOpen && (
        <div style={{
          position: 'absolute', right: 78, top: 48,
          zIndex: 10, width: 268,
          background: theme.bg,
          border: `1px solid ${theme.border}`,
          borderRadius: 5,
          boxShadow: `0 12px 30px ${theme.shadow}, 0 0 16px ${a}33`,
          overflow: 'hidden',
          fontFamily: "'Space Grotesk', sans-serif",
        }}>
          <div style={{
            padding: '8px 12px 6px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: `linear-gradient(180deg, ${theme.bgSoft} 0%, ${theme.bg} 100%)`,
            borderBottom: `1px solid ${theme.border}`,
          }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, letterSpacing: 1.4, textTransform: 'uppercase', color: theme.textMuted }}>
              Connected Devices
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, color: a, letterSpacing: 0.6 }}>
              1 ONLINE
            </span>
          </div>
          {[
            { name: 'Local', host: 'local-mac', ip: '–', os: 'MAC', status: 'online', isThis: true },
          ].map((d) => (
            <button key={d.name} onClick={() => { setWorkspace(d.name); setWsOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                width: '100%', textAlign: 'left',
                padding: '8px 12px',
                background: d.name === workspace ? `${a}1a` : 'transparent',
                border: 'none', borderTop: `1px solid ${theme.border}`,
                color: theme.text, fontSize: 11, cursor: 'pointer',
              }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: a, boxShadow: `0 0 4px ${a}, 0 0 8px ${a}88`, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11.5 }}>{d.host}</span>
                  {d.isThis && (
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7.5, color: a, background: `${a}22`, border: `1px solid ${a}55`, borderRadius: 2, padding: '1px 4px', letterSpacing: 0.8, textTransform: 'uppercase' }}>this</span>
                  )}
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, color: theme.textMuted, marginTop: 2 }}>{d.os}</div>
              </div>
            </button>
          ))}
          <button onClick={() => setWsOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', borderTop: `1px solid ${theme.border}`, color: theme.textDim, fontSize: 11, cursor: 'pointer' }}>
            <span style={{ flex: 1 }}>Manage devices…</span>
            <span style={{ color: theme.textMuted, fontSize: 10 }}>↗</span>
          </button>
        </div>
      )}

      {/* Gear popover */}
      {gearOpen && (
        <div style={{
          position: 'absolute', right: 10, top: 48,
          zIndex: 10, width: 220,
          background: theme.bg,
          border: `1px solid ${theme.border}`,
          borderRadius: 5,
          boxShadow: `0 12px 30px ${theme.shadow}, 0 0 16px ${a}33`,
          overflow: 'hidden',
          fontFamily: "'Space Grotesk', sans-serif",
        }}>
          {GEAR_ITEMS.map((item, i) => (
            <button
              key={item.id}
              onClick={() => handleGearSelect(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', textAlign: 'left',
                padding: '7px 12px',
                background: 'transparent',
                border: 'none',
                borderTop: i > 0 ? `1px solid ${theme.border}` : 'none',
                color: 'danger' in item && item.danger
                  ? theme.danger
                  : 'muted' in item && item.muted
                    ? theme.textDim
                    : theme.text,
                fontSize: 11, cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'danger' in item && item.danger ? `${theme.danger}1a` : `${a}1a`
              }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <span style={{ flex: 1 }}>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </MenuShell>
  )
}
