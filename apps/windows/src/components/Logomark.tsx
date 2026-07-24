import fleurMark from '../assets/fleur-mark.png';
import { useTheme } from '../theme/useTheme';

interface Props {
  size?: number;
  borderRadius?: number;
}

export function Logomark({ size = 26, borderRadius = 5 }: Props) {
  const { theme: t } = useTheme();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius,
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: `0 2px 8px ${t.shadow}, 0 0 10px ${t.accent}33`,
      }}
    >
      <img src={fleurMark} alt="Tender" width={size} height={size} style={{ display: 'block' }} />
    </div>
  );
}
