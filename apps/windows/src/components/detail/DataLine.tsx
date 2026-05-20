import { useTheme } from '../../theme/useTheme';

interface Props {
  label: string;
  value: string;
  tone?: string;
  mono?: boolean;
}

export function DataLine({ label, value, tone, mono = true }: Props) {
  const { theme: t } = useTheme();
  return (
    <div style={{ padding: '5px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: t.textMuted,
      }}>{label}</span>
      <span style={{
        fontFamily: mono ? "'JetBrains Mono', monospace" : "'Space Grotesk', sans-serif",
        fontSize: 11, color: tone ?? t.text, letterSpacing: 0.3,
      }}>{value}</span>
    </div>
  );
}
