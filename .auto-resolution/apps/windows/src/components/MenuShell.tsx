import type { ReactNode } from 'react';
import { useTheme } from '../theme/useTheme';
import { FiberDivider } from './FiberDivider';

interface Props {
  children: ReactNode;
  width?: number;
}

export function MenuShell({ children, width = 360 }: Props) {
  const { theme: t } = useTheme();
  const a = t.accent;

  return (
    <div
      className="panel-enter"
      style={{
        width,
        position: 'relative',
        background: `linear-gradient(180deg, ${t.bgSoft} 0%, ${t.bg} 100%)`,
        border: '1px solid rgba(0,0,0,0.55)',
        borderRadius: 8,
        boxShadow: `0 28px 70px ${t.shadow}, 0 0 32px ${a}28, 0 0 0 1px ${a}1a`,
        color: t.text,
        overflow: 'hidden',
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <FiberDivider color={a} />
      {children}
    </div>
  );
}
