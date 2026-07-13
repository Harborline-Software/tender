import { useTheme } from '@/theme/ThemeProvider'

interface Props {
  label: string
  value: string
  tone?: string
  mono?: boolean
}

export function DataLine({ label, value, tone, mono = true }: Props) {
  const { theme } = useTheme()
  return (
    <div style={{ padding: '5px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{
        fontFamily: theme.fontMono,
        fontSize: 9, letterSpacing: 1.2,
        textTransform: 'uppercase', color: theme.textMuted,
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: mono ? theme.fontMono : "'Space Grotesk', sans-serif",
        fontSize: 11, color: tone || theme.text, letterSpacing: 0.3,
      }}>
        {value}
      </span>
    </div>
  )
}
