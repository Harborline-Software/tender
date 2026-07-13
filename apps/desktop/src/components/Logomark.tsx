// Harborline mark, consumed from the central brand repository per its
// consumer contract (named variants, never recolored via CSS): the white-wave
// `on-dark` cut on dark surfaces, the cobalt `on-light` cut on light surfaces.
// Vendored copies + provenance in assets/brand/README.md. INTERIM MARK —
// a future final-mark swap should grep for "INTERIM MARK" across this repo.
import markOnDark from '@/assets/brand/harborline-mark-on-dark.svg'
import markOnLight from '@/assets/brand/harborline-mark-on-light.svg'
import { useTheme } from '@/theme/ThemeProvider'

interface Props {
  size?: number
  borderRadius?: number
}

export function Logomark({ size = 26, borderRadius = 5 }: Props) {
  const { theme, mode } = useTheme()

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
        src={mode === 'dark' ? markOnDark : markOnLight}
        alt="Harborline Toolbox"
        style={{ width: size, height: size, display: 'block' }}
        draggable={false}
      />
    </div>
  )
}
