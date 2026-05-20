import { useTheme } from '@/theme/ThemeProvider'

interface Props {
  on: boolean
  onClick?: () => void
}

export function ToggleSwitch({ on, onClick }: Props) {
  const { theme } = useTheme()
  const a = theme.accent
  return (
    <div
      onClick={onClick}
      role="switch"
      aria-checked={on}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      style={{
        width: 26, height: 14, borderRadius: 99,
        background: on ? `${a}55` : 'rgba(255,255,255,0.08)',
        border: `1px solid ${on ? a : theme.border}`,
        boxShadow: on ? `0 0 8px ${a}55, inset 0 0 4px ${a}33` : 'none',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 150ms, box-shadow 150ms',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        left: on ? 13 : 1, top: 1,
        width: 10, height: 10, borderRadius: 99,
        background: on ? theme.accentBright : theme.textDim,
        transition: 'left 150ms',
        boxShadow: on ? `0 0 4px ${a}` : 'none',
      }} />
    </div>
  )
}
