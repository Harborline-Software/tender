import { useTheme } from '../../theme/useTheme';

interface Props {
  label: string;
  value: number;
  max: number;
  unit?: string;
  tone?: string;
}

export function MeterBar({ label, value, max, unit = '', tone }: Props) {
  const { theme: t } = useTheme();
  const a = tone ?? t.accent;
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ padding: '6px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: t.text }}>{label}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: a, letterSpacing: 0.4 }}>
          {value}{unit}
          <span style={{ color: t.textMuted }}> / {max}{unit}</span>
        </span>
      </div>
      <div style={{
        height: 4, borderRadius: 99,
        background: 'rgba(255,255,255,0.06)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${a}aa, ${a})`,
          boxShadow: `0 0 6px ${a}aa`,
          borderRadius: 99,
        }} />
      </div>
    </div>
  );
}
