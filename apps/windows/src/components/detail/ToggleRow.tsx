import { useTheme } from '../../theme/useTheme';

interface Props {
  label: string;
  on: boolean;
  onChange?: (v: boolean) => void;
  borderTop?: boolean;
}

export function ToggleRow({ label, on, onChange, borderTop = true }: Props) {
  const { theme: t } = useTheme();
  const a = t.accent;
  return (
    <div
      style={{
        padding: '8px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        borderTop: borderTop ? `1px solid rgba(255,255,255,0.04)` : 'none',
        cursor: onChange ? 'pointer' : 'default',
      }}
      onClick={() => onChange?.(!on)}
    >
      <span style={{ flex: 1, fontSize: 11.5, color: t.text }}>{label}</span>
      <div style={{
        width: 26, height: 14, borderRadius: 99,
        background: on ? `${a}55` : 'rgba(255,255,255,0.08)',
        border: `1px solid ${on ? a : t.border}`,
        boxShadow: on ? `0 0 8px ${a}55, inset 0 0 4px ${a}33` : 'none',
        position: 'relative', flexShrink: 0,
        transition: 'background 0.15s, border-color 0.15s',
      }}>
        <div style={{
          position: 'absolute',
          left: on ? 13 : 1, top: 1,
          width: 10, height: 10, borderRadius: 99,
          background: on ? t.accentBright : t.textDim,
          boxShadow: on ? `0 0 4px ${a}` : 'none',
          transition: 'left 0.15s',
        }} />
      </div>
    </div>
  );
}
