import { useState } from 'react';
import { useTheme } from '../theme/useTheme';
import { Dial } from './Dial';

interface Props {
  uid: string;
  label?: string;
  value: number;
  max: number;
  sub: string;
  reading: string;
  bottomLabel: string;
  updateAvailable?: boolean;
  onClick?: () => void;
}

export function GaugeCard({ uid, value, max, sub, reading, bottomLabel, updateAvailable, onClick }: Props) {
  const { theme: t } = useTheme();
  const [hovered, setHovered] = useState(false);
  const m = t.metalBright;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        flex: 1,
        position: 'relative',
        padding: '4px 4px 6px',
        borderRadius: 6,
        cursor: onClick ? 'pointer' : 'default',
        background: hovered && onClick ? `${t.accent}10` : 'transparent',
        transition: 'background 0.12s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Dial value={value} max={max} reading={reading} sub={sub} accent={t.accent} text={t.text} uid={uid} />

      {updateAvailable && (
        <div
          title="Update available"
          style={{ position: 'absolute', top: 2, right: 6, width: 7, height: 7, borderRadius: 99, background: m, boxShadow: `0 0 4px ${m}, 0 0 8px ${m}aa`, border: `1px solid ${t.bg}` }}
        />
      )}

      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, letterSpacing: 1.2, textTransform: 'uppercase', color: t.textMuted, textAlign: 'center' }}>
        {bottomLabel}
      </div>
    </div>
  );
}
