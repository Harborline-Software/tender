interface Props {
  value: number;
  max: number;
  reading: string;
  sub: string;
  accent: string;
  text: string;
  uid: string;
}

export function Dial({ value, max, reading, sub, accent, text, uid }: Props) {
  const r = 22, cx = 28, cy = 28;
  const startA = -210, endA = 30;
  const valA = startA + (Math.min(value, max) / Math.max(max, 1)) * (endA - startA);

  const polar = (deg: number): [number, number] => {
    const a = (deg * Math.PI) / 180;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };

  const [x1, y1] = polar(startA);
  const [x2, y2] = polar(endA);
  const [xv, yv] = polar(valA);
  const large = valA - startA > 180 ? 1 : 0;

  const filterId = `dial-glow-${uid}`;

  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="28" cy="28" r="25" fill="rgba(0,0,0,0.4)" stroke={`${accent}55`} strokeWidth="1" />

      {/* Background arc */}
      <path d={`M${x1} ${y1} A${r} ${r} 0 1 1 ${x2} ${y2}`} stroke={`${text}22`} strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Value arc */}
      <path d={`M${x1} ${y1} A${r} ${r} 0 ${large} 1 ${xv} ${yv}`} stroke={accent} strokeWidth="2.5" fill="none" strokeLinecap="round" filter={`url(#${filterId})`} />

      {/* Tick marks */}
      {[0, 1, 2, 3, 4].map(i => {
        const a = startA + (i / 4) * (endA - startA);
        const ar = (a * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={cx + Math.cos(ar) * (r - 3)} y1={cy + Math.sin(ar) * (r - 3)}
            x2={cx + Math.cos(ar) * (r - 7)} y2={cy + Math.sin(ar) * (r - 7)}
            stroke={`${text}66`} strokeWidth="0.7"
          />
        );
      })}

      <text x="28" y="30" textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontSize="11" fontWeight="600" fill={text}>{reading}</text>
      <text x="28" y="40" textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontSize="6" letterSpacing="1" fill={accent}>{sub}</text>
    </svg>
  );
}
