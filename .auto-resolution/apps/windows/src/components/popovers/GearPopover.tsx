import type { DetailId } from '../../state/types';
import { useTheme } from '../../theme/useTheme';

const ITEMS: { id: string; label: string; muted?: boolean; danger?: boolean }[] = [
  { id: 'about',      label: 'About Tender' },
  { id: 'faq',        label: 'FAQ' },
  { id: 'plugins',    label: 'Plugins' },
  { id: 'proxy',      label: 'Proxy settings' },
  { id: 'appearance', label: 'Appearance & behavior' },
  { id: 'account',    label: 'Account · Log out', muted: true },
  { id: 'logs',       label: 'Collect logs & diagnostics' },
  { id: 'dry-dock',   label: 'Dry Dock (shutdown)', danger: true },
];

const NAV_MAP: Record<string, DetailId> = {
  appearance: 'dock-settings',
  logs:       'engine-room',
  'dry-dock': 'dry-dock',
};

interface Props {
  onNavigate: (id: DetailId) => void;
}

export function GearPopover({ onNavigate }: Props) {
  const { theme: t } = useTheme();
  const a = t.accent;

  return (
    <div style={{ position: 'absolute', right: 10, top: 48, zIndex: 10, width: 220, background: t.bg, border: `1px solid ${t.border}`, borderRadius: 5, boxShadow: `0 12px 30px ${t.shadow}, 0 0 16px ${a}33`, overflow: 'hidden', fontFamily: "'Space Grotesk', sans-serif" }}>
      {ITEMS.map((it, i) => (
        <button
          key={it.id}
          onClick={() => { const id = NAV_MAP[it.id]; if (id) onNavigate(id); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '7px 12px', background: 'transparent', border: 'none', borderTop: i > 0 ? `1px solid ${t.border}` : 'none', color: it.danger ? t.danger : (it.muted ? t.textDim : t.text), fontSize: 11, cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget.style.background = it.danger ? `${t.danger}1a` : `${a}1a`)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{ flex: 1 }}>{it.label}</span>
        </button>
      ))}
    </div>
  );
}
