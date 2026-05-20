import type { CSSProperties } from 'react';

interface Props {
  color: string;
  dim?: boolean;
}

export function FiberDivider({ color, dim = false }: Props) {
  const intensity  = dim ? '55' : 'cc';
  const glowAlpha  = dim ? '22' : '55';
  const duration   = dim ? '5s' : '3s';

  const inner: CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: `linear-gradient(90deg, transparent 0%, ${color}${intensity} 30%, ${color}${intensity} 70%, transparent 100%)`,
    boxShadow: `0 0 ${dim ? '4px' : '6px'} ${color}${glowAlpha}`,
    animation: `consoleFiberPulse ${duration} ease-in-out infinite`,
  };

  return (
    <div style={{ position: 'relative', height: 1, margin: 0 }}>
      <div style={inner} />
    </div>
  );
}
