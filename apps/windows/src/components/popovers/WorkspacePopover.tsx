import { useState } from 'react';
import { useTheme } from '../../theme/useTheme';
import type { Device } from '../../state/types';
import { MOCK_DEVICES } from '../../mocks';

interface Props {
  active: string;
  onSelect: (hostname: string) => void;
}

export function WorkspacePopover({ active, onSelect }: Props) {
  const { theme: t } = useTheme();
  const a = t.accent;
  const [devices] = useState<Device[]>(MOCK_DEVICES);

  const onlineCount = devices.filter(d => d.status === 'online').length;
  const statusColor = (s: Device['status']) =>
    s === 'online' ? a : s === 'idle' ? t.metalBright : t.textMuted;

  return (
    <div style={{ position: 'absolute', right: 78, top: 48, zIndex: 10, width: 268, background: t.bg, border: `1px solid ${t.border}`, borderRadius: 5, boxShadow: `0 12px 30px ${t.shadow}, 0 0 16px ${a}33`, overflow: 'hidden', fontFamily: "'Space Grotesk', sans-serif" }}>
      <div style={{ padding: '8px 12px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: `linear-gradient(180deg, ${t.bgSoft} 0%, ${t.bg} 100%)`, borderBottom: `1px solid ${t.border}` }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, letterSpacing: 1.4, textTransform: 'uppercase', color: t.textMuted }}>Connected Devices</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, color: a, letterSpacing: 0.6 }}>{onlineCount} ONLINE</span>
      </div>

      {devices.map(d => {
        const isActive = d.hostname === active;
        const sc = statusColor(d.status);
        const isOffline = d.status === 'offline';

        return (
          <DeviceRow
            key={d.hostname}
            device={d}
            isActive={isActive}
            isOffline={isOffline}
            statusColor={sc}
            theme={t}
            onSelect={() => onSelect(d.hostname)}
          />
        );
      })}

      <button
        onClick={() => onSelect('__manage__')}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', borderTop: `1px solid ${t.border}`, color: t.textDim, fontSize: 11, cursor: 'pointer' }}
        onMouseEnter={e => (e.currentTarget.style.background = `${a}1a`)}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <circle cx="5.5" cy="5.5" r="2" fill="none" stroke={t.textDim} strokeWidth="1.1" />
          {Array.from({ length: 6 }, (_, i) => {
            const r2 = (Math.PI * 2 * i) / 6;
            return <line key={i} x1={5.5 + Math.cos(r2) * 3.4} y1={5.5 + Math.sin(r2) * 3.4} x2={5.5 + Math.cos(r2) * 4.6} y2={5.5 + Math.sin(r2) * 4.6} stroke={t.textDim} strokeWidth="1.2" strokeLinecap="round" />;
          })}
        </svg>
        <span style={{ flex: 1 }}>Manage devices…</span>
        <span style={{ color: t.textMuted, fontSize: 10 }}>↗</span>
      </button>
    </div>
  );
}

function DeviceRow({ device: d, isActive, isOffline, statusColor, theme: t, onSelect }: {
  device: Device; isActive: boolean; isOffline: boolean; statusColor: string;
  theme: ReturnType<typeof useTheme>['theme']; onSelect: () => void;
}) {
  const a = t.accent;
  return (
    <button
      onClick={onSelect}
      style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left', padding: '8px 12px', background: isActive ? `${a}1a` : 'transparent', border: 'none', borderTop: `1px solid ${t.border}`, color: t.text, fontSize: 11, cursor: 'pointer', opacity: isOffline ? 0.6 : 1 }}
      onMouseEnter={e => (e.currentTarget.style.background = `${a}1a`)}
      onMouseLeave={e => (e.currentTarget.style.background = isActive ? `${a}1a` : 'transparent')}
    >
      <span style={{ width: 7, height: 7, borderRadius: 99, background: statusColor, boxShadow: d.status === 'online' ? `0 0 4px ${statusColor}, 0 0 8px ${statusColor}88` : 'none', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1.1 }}>
          <span style={{ fontSize: 11.5, color: t.text, letterSpacing: 0.1 }}>{d.hostname}</span>
          {d.isThis && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7.5, color: a, background: `${a}22`, border: `1px solid ${a}55`, borderRadius: 2, padding: '1px 4px', letterSpacing: 0.8, textTransform: 'uppercase' }}>this</span>}
          {d.kind === 'server' && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7.5, color: t.textDim, background: `${t.textDim}1a`, border: `1px solid ${t.border}`, borderRadius: 2, padding: '1px 4px', letterSpacing: 0.8, textTransform: 'uppercase' }}>srv</span>}
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, color: t.textMuted, letterSpacing: 0.5, marginTop: 2 }}>
          {isOffline ? `last seen ${d.lastSeen ?? 'unknown'}` : `${d.ip} · ${d.os}`}
        </div>
      </div>
      {!isOffline && (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, color: t.textDim, background: `${t.textDim}14`, border: `1px solid ${t.border}`, borderRadius: 3, padding: '2px 5px', letterSpacing: 0.6 }}>{d.os}</span>
      )}
    </button>
  );
}
