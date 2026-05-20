import { useTheme } from '../theme/useTheme';

interface Props { count: number }

export function UpdateCountBadge({ count }: Props) {
  const { theme: t } = useTheme();
  const m = t.metalBright;
  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: m, background: `${m}22`, border: `1px solid ${m}66`, borderRadius: 99, padding: '1px 7px', display: 'inline-flex', alignItems: 'center', gap: 2, letterSpacing: 0.6, boxShadow: `0 0 4px ${m}44` }}>
      ↑{count}
    </div>
  );
}
