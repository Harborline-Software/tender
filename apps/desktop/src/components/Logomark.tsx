import logomark from '@/assets/logomark.png'
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
        src={logomark}
        alt="Harborline Toolbox"
        style={{ width: size, height: size, display: 'block' }}
        draggable={false}
      />
    </div>
  )
}
