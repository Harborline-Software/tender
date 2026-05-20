import { useState } from 'react';
import { useTheme } from '../theme/useTheme';
import { MenuShell } from '../components/MenuShell';
import { TabStrip, type TabId } from '../components/TabStrip';
import { Logomark } from '../components/Logomark';
import { FiberDivider } from '../components/FiberDivider';
import { WorkspacePopover } from '../components/popovers/WorkspacePopover';
import { GearPopover } from '../components/popovers/GearPopover';
import { FleetTab } from './tabs/FleetTab';
import { ProjectsTab } from './tabs/ProjectsTab';
import { ServicesTab } from './tabs/ServicesTab';
import { SignalBridgeDetail } from './detail/SignalBridgeDetail';
import { SunfishDetail } from './detail/SunfishDetail';
import { FlightDeckDetail } from './detail/FlightDeckDetail';
import { EngineRoomDetail } from './detail/EngineRoomDetail';
import { DockSettingsDetail } from './detail/DockSettingsDetail';
import { DryDockDetail } from './detail/DryDockDetail';
import { ReleaseNotesDetail } from './detail/ReleaseNotesDetail';
import type { DetailId, Screen } from '../state/types';
import { MOCK_DEVICES } from '../mocks';

type Popover = null | 'workspace' | 'gear';

export function TrayMenu() {
  const { theme: t } = useTheme();
  const a = t.accent;

  const thisDevice = MOCK_DEVICES.find(d => d.isThis)?.hostname ?? 'this-machine';

  const [screen, setScreen]     = useState<Screen>({ kind: 'main' });
  const [activeTab, setActiveTab] = useState<TabId>('fleet');
  const [popover, setPopover]   = useState<Popover>(null);
  const [workspace, setWorkspace] = useState(thisDevice);

  const navigate = (id: DetailId) => { setPopover(null); setScreen({ kind: 'detail', id }); };
  const goBack   = () => setScreen({ kind: 'main' });
  const togglePopover = (p: 'workspace' | 'gear') =>
    setPopover(prev => (prev === p ? null : p));

  if (screen.kind === 'detail') {
    return (
      <MenuShell>
        <DetailScreen id={screen.id} onBack={goBack} />
      </MenuShell>
    );
  }

  return (
    <MenuShell>
      {/* Click-away layer behind popovers */}
      {popover && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9 }}
          onClick={() => setPopover(null)}
        />
      )}

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 12px',
        background: `linear-gradient(180deg, ${t.bgSoft} 0%, ${t.bg} 100%)`,
      }}>
        <Logomark size={24} />
        <span style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 15, fontWeight: 600,
          color: t.text, letterSpacing: 0.5,
        }}>
          Tender
        </span>

        <div style={{ flex: 1 }} />

        {/* Workspace pill */}
        <button
          onClick={() => togglePopover('workspace')}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 8px',
            background: `${a}18`, border: `1px solid ${a}44`,
            borderRadius: 4, color: t.textDim,
            fontSize: 10, cursor: 'pointer',
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: 0.3,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${a}88`; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${a}44`; }}
        >
          <span style={{ width: 5, height: 5, borderRadius: 99, background: a, boxShadow: `0 0 4px ${a}`, flexShrink: 0 }} />
          <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{workspace}</span>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ opacity: 0.6, flexShrink: 0 }}>
            <path d="M1.5 3 L4 5.5 L6.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Gear button */}
        <button
          onClick={() => togglePopover('gear')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 26, height: 26,
            background: popover === 'gear' ? `${a}18` : 'transparent',
            border: `1px solid ${popover === 'gear' ? `${a}44` : 'transparent'}`,
            borderRadius: 4, cursor: 'pointer',
            color: popover === 'gear' ? t.text : t.textDim,
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.color = t.text;
            el.style.background = `${a}12`;
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLButtonElement;
            if (popover !== 'gear') {
              el.style.color = t.textDim;
              el.style.background = 'transparent';
            }
          }}
        >
          <GearIcon />
        </button>
      </div>

      <FiberDivider color={a} />

      {/* ── Tab strip ── */}
      <TabStrip active={activeTab} onChange={setActiveTab} />

      <FiberDivider color={a} dim />

      {/* ── Tab body ── */}
      {activeTab === 'fleet'    && <FleetTab    onNavigate={navigate} />}
      {activeTab === 'projects' && <ProjectsTab />}
      {activeTab === 'services' && <ServicesTab onNavigate={navigate} />}

      {/* ── Popovers (absolute, z:10) ── */}
      {popover === 'workspace' && (
        <WorkspacePopover
          active={workspace}
          onSelect={h => { if (h !== '__manage__') setWorkspace(h); setPopover(null); }}
        />
      )}
      {popover === 'gear' && (
        <GearPopover onNavigate={navigate} />
      )}
    </MenuShell>
  );
}

function DetailScreen({ id, onBack }: { id: DetailId; onBack: () => void }) {
  switch (id) {
    case 'signal-bridge':  return <SignalBridgeDetail  onBack={onBack} />;
    case 'sunfish':        return <SunfishDetail        onBack={onBack} />;
    case 'flight-deck':    return <FlightDeckDetail     onBack={onBack} />;
    case 'engine-room':    return <EngineRoomDetail     onBack={onBack} />;
    case 'dock-settings':  return <DockSettingsDetail   onBack={onBack} />;
    case 'dry-dock':       return <DryDockDetail        onBack={onBack} />;
    case 'release-notes':  return <ReleaseNotesDetail   onBack={onBack} />;
  }
}

function GearIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
      <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.858 2.929 2.929 0 0 1 0 5.858z" />
    </svg>
  );
}
