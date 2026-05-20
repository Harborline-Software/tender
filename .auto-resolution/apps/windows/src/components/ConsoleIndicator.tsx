export type IndicatorKind = 'port' | 'grid' | 'wave' | 'cpu' | 'cog' | 'power' | 'yard' | 'comms';

interface Props {
  kind: IndicatorKind;
  color: string;
  active?: boolean;
  dimColor?: string;
}

export function ConsoleIndicator({ kind, color, active, dimColor }: Props) {
  const dim  = active ? color : (dimColor ?? 'rgba(220,230,240,0.32)');
  const glow = active ? `0 0 6px ${color}` : 'none';

  switch (kind) {
    case 'port':
      return (
        <div style={{ width: 10, height: 10, borderRadius: 99, border: `1px solid ${dim}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: glow }}>
          <div style={{ width: 3.5, height: 3.5, borderRadius: 99, background: dim, boxShadow: glow }} />
        </div>
      );

    case 'grid':
      return (
        <svg width="11" height="11" viewBox="0 0 11 11">
          <rect x="0.5" y="0.5" width="4" height="4" fill={dim} />
          <rect x="6.5" y="0.5" width="4" height="4" fill={dim} opacity="0.6" />
          <rect x="0.5" y="6.5" width="4" height="4" fill={dim} opacity="0.6" />
          <rect x="6.5" y="6.5" width="4" height="4" fill={dim} />
        </svg>
      );

    case 'wave':
      return (
        <svg width="12" height="11" viewBox="0 0 12 11" fill="none">
          <path d="M0 2 Q 3 0.3 6 2 T 12 2"   stroke={dim} strokeWidth="1.1" strokeLinecap="round" />
          <path d="M0 5.5 Q 3 3.8 6 5.5 T 12 5.5" stroke={dim} strokeWidth="1.1" strokeLinecap="round" />
          <path d="M0 9 Q 3 7.3 6 9 T 12 9"   stroke={dim} strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      );

    case 'cpu':
      return (
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <rect x="2.5" y="2.5" width="6" height="6" fill="none" stroke={dim} strokeWidth="1" />
          <rect x="4.2" y="4.2" width="2.6" height="2.6" fill={dim} opacity="0.5" />
          {[0, 1, 2].map(i => (
            <g key={i}>
              <line x1="0"   y1={3.5 + i * 1.6} x2="2.5" y2={3.5 + i * 1.6} stroke={dim} strokeWidth="1" />
              <line x1="8.5" y1={3.5 + i * 1.6} x2="11"  y2={3.5 + i * 1.6} stroke={dim} strokeWidth="1" />
              <line x1={3.5 + i * 1.6} y1="0"   x2={3.5 + i * 1.6} y2="2.5" stroke={dim} strokeWidth="1" />
              <line x1={3.5 + i * 1.6} y1="8.5" x2={3.5 + i * 1.6} y2="11"  stroke={dim} strokeWidth="1" />
            </g>
          ))}
        </svg>
      );

    case 'cog': {
      const teeth = Array.from({ length: 6 }, (_, i) => {
        const r = (Math.PI * 2 * i) / 6;
        return { x1: 5.5 + Math.cos(r) * 3.6, y1: 5.5 + Math.sin(r) * 3.6, x2: 5.5 + Math.cos(r) * 5, y2: 5.5 + Math.sin(r) * 5 };
      });
      return (
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <circle cx="5.5" cy="5.5" r="2.4" fill="none" stroke={dim} strokeWidth="1.1" />
          {teeth.map((t, i) => <line key={i} {...t} stroke={dim} strokeWidth="1.2" strokeLinecap="round" />)}
        </svg>
      );
    }

    case 'power':
      return (
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path d="M5.5 1.5 L 5.5 5.5" stroke={dim} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M2.5 4 A 4 4 0 1 0 8.5 4" stroke={dim} strokeWidth="1.4" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'yard':
      return (
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <rect x="1.5" y="5" width="8" height="5" fill="none" stroke={dim} strokeWidth="1.1" />
          <path d="M5.5 1 L 5.5 5" stroke={dim} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M3.8 2.5 L 5.5 1 L 7.2 2.5" stroke={dim} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'comms':
      return (
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path d="M1.5 2.5 L 9.5 2.5 L 9.5 7.5 L 6 7.5 L 4 9.5 L 4 7.5 L 1.5 7.5 Z" stroke={dim} strokeWidth="1.1" fill="none" strokeLinejoin="round" />
          <circle cx="4"   cy="5" r="0.6" fill={dim} />
          <circle cx="5.5" cy="5" r="0.6" fill={dim} />
          <circle cx="7"   cy="5" r="0.6" fill={dim} />
        </svg>
      );

    default:
      return null;
  }
}
