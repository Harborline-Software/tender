import fleurMark from '@/assets/fleur-mark.png'
import { useTheme } from '@/theme/ThemeProvider'

interface Props {
  size?: number
  borderRadius?: number
}

export function Logomark({ size = 26, borderRadius = 5 }: Props) {
  const { theme } = useTheme()

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius,
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: `0 2px 8px ${theme.shadow}, 0 0 10px ${theme.accent}33`,
      }}
    >
      <img
        src={fleurMark}
        alt="Tender"
        style={{ width: size, height: size, display: 'block' }}
        draggable={false}
      />
    </div>
  )
}
