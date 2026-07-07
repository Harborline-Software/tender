// INTERIM MARK (2026-07-07, provisional per CIC — bw03-sun-wave-cut; see
// harborline-www/src/assets/logo-mark.svg in the harborline-www repo for the full
// adoption note). assets/logomark.png is the sun-over-wave badge (cobalt bg
// #06489c, orange sun #e97c48, white wave), matching the same badge treatment used
// by shipyard carrier's HarborlineMark.tsx and this app's own OS icon set
// (src-tauri/icons/) for cross-product consistency. Provisional — a future
// final-mark swap should grep for "INTERIM MARK" across this repo.
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
