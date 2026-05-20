import { useTheme } from '@/theme/ThemeProvider'

interface Props {
  text: string
  tone?: string
}

export function StatusPill({ text, tone }: Props) {
  const { theme } = useTheme()
  const c = tone || theme.accent
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 7px',
      borderRadius: 99,
      background: `${c}1a`,
      border: `1px solid ${c}55`,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 9, letterSpacing: 0.8,
      color: c, textTransform: 'uppercase',
      flexShrink: 0,
    }}>
      <span style={{ width: 4, height: 4, borderRadius: 99, background: c, boxShadow: `0 0 4px ${c}` }} />
      {text}
    </div>
  )
}
