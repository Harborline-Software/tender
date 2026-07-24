import { useState, type ReactNode } from 'react';
import { useTheme } from '../theme/useTheme';
import { ConsoleIndicator, type IndicatorKind } from './ConsoleIndicator';

// Chevron glyph
function Chev({ color, opacity = 0.45 }: { color: string; opacity?: number }) {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" opacity={opacity}>
      <path d="M3 1.5 L6.5 5 L3 8.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface Props {
  indicator: IndicatorKind;
  name: string;
  subLabel?: string;
  nested?: string;
  meter?: string;
  active?: boolean;
  danger?: boolean;
  badge?: ReactNode;
  onClick?: () => void;
}

export function ConsoleRow({ indicator, name, subLabel, nested, meter, active, danger, badge, onClick }: Props) {
  const { theme: t } = useTheme();
  const [hovered, setHovered] = useState(false);
  const a = t.accent;

  const nameColor  = danger ? t.danger : t.text;
  const meterColor = danger ? t.danger : (active ? t.accentBright : t.textDim);

  const bg = hovered
    ? `linear-gradient(180deg, ${t.surface} 0%, ${t.bgSoft} 100%)`
    : `linear-gradient(180deg, ${t.bgSoft} 0%, ${t.bg} 100%)`;

  const boxShadow = hovered ? `inset 0 0 16px ${a}14, inset 2px 0 0 ${danger ? t.danger : a}` : 'none';

  return (
    <div
      style={{ padding: '8px 14px 8px 12px', display: 'flex', alignItems: 'center', gap: 11, background: bg, borderTop: '1px solid rgba(255,255,255,0.025)', borderBottom: '1px solid rgba(0,0,0,0.28)', cursor: onClick ? 'pointer' : 'default', position: 'relative', boxShadow, transition: 'background 0.12s, box-shadow 0.12s' }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ width: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ConsoleIndicator kind={indicator} color={danger ? t.danger : a} active={active || danger} dimColor={t.textMuted} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: nameColor, letterSpacing: 0.1, lineHeight: 1.15 }}>{name}</div>
        {subLabel && (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, letterSpacing: 1.2, textTransform: 'uppercase', color: danger ? 'rgba(232,117,96,0.65)' : t.textMuted, marginTop: 2 }}>{subLabel}</div>
        )}
        {nested && (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, letterSpacing: 0.8, textTransform: 'uppercase', color: t.textMuted, marginTop: 1.5 }}>⤷ {nested}</div>
        )}
      </div>

      {meter && (
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: meterColor, textShadow: active && !danger ? `0 0 6px ${a}88` : 'none', padding: '2px 7px', background: active && !danger ? `${a}1a` : 'transparent', border: active && !danger ? `1px solid ${a}55` : '1px solid transparent', borderRadius: 3, letterSpacing: 0.4 }}>
          {meter}
        </div>
      )}

      {badge}

      <Chev color={danger ? t.danger : t.textDim} opacity={danger ? 0.7 : 0.6} />
    </div>
  );
}
