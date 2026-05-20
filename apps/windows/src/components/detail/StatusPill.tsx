import { useTheme } from '../../theme/useTheme';

interface Props {
  text: string;
  tone?: string;
}

export function StatusPill({ text, tone }: Props) {
  const { theme: t } = useTheme();
  const c = tone ?? t.accent;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 7px', borderRadius: 99,
      background: `${c}1a`, border: `1px solid ${c}55`,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase', color: c,
    }}>
      <span style={{ width: 4, height: 4, borderRadius: 99, background: c, boxShadow: `0 0 4px ${c}`, flexShrink: 0 }} />
      {text}
    </div>
  );
}
