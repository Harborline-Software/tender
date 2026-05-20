import type { ReactNode } from 'react';
import { useTheme } from '../../theme/useTheme';

interface Props {
  title: string;
  sub?: string;
  badge?: ReactNode;
  onBack: () => void;
}

export function DetailHeader({ title, sub, badge, onBack }: Props) {
  const { theme: t } = useTheme();
  const a = t.accent;
  return (
    <div style={{
      padding: '11px 14px 11px 10px',
      display: 'flex', alignItems: 'center', gap: 9,
      background: `linear-gradient(180deg, ${t.bgSoft} 0%, ${t.bg} 100%)`,
      borderBottom: '1px solid rgba(0,0,0,0.28)',
    }}>
      <button
        onClick={onBack}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: 4, borderRadius: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: t.text, flexShrink: 0,
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${a}22`; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2 L4 7 L9 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1, letterSpacing: 0.2, color: t.text }}>
          {title}
        </div>
        {sub && (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8.5, letterSpacing: 1.4, color: t.textMuted,
            marginTop: 4, textTransform: 'uppercase',
          }}>
            {sub}
          </div>
        )}
      </div>

      {badge}
    </div>
  );
}
