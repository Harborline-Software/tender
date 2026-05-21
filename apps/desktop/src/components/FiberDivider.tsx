import { useTheme } from '@/theme/ThemeProvider'

interface Props {
  dim?: boolean
}

export function FiberDivider({ dim = false }: Props) {
  const { theme } = useTheme()
  const a = theme.accent

  return (
    <div
      style={{
        height: 1,
        background: `linear-gradient(90deg, transparent, ${a}${dim ? '55' : 'aa'}, transparent)`,
        boxShadow: `0 0 ${dim ? 4 : 8}px ${a}${dim ? '44' : '88'}`,
        animation: `${dim ? 'consoleFiberPulseDim' : 'consoleFiberPulse'} ${dim ? 5 : 3}s ease-in-out infinite`,
        flexShrink: 0,
      }}
    />
  )
}
