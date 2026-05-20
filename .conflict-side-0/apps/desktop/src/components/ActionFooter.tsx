import { useTheme } from '@/theme/ThemeProvider'

interface Props {
  primary?: string
  secondary?: string
  danger?: boolean
  onPrimary?: () => void
  onSecondary?: () => void
}

export function ActionFooter({ primary, secondary, danger = false, onPrimary, onSecondary }: Props) {
  const { theme } = useTheme()
  const a = danger ? theme.danger : theme.accent
  return (
    <div style={{
      padding: '10px 12px',
      borderTop: '1px solid rgba(0,0,0,0.28)',
      background: `linear-gradient(180deg, ${theme.bgSoft} 0%, ${theme.bg} 100%)`,
      display: 'flex', gap: 8,
      flexShrink: 0,
    }}>
      {secondary && (
        <button
          onClick={onSecondary}
          style={{
            flex: 1, padding: '7px 10px',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${theme.border}`,
            color: theme.text,
            borderRadius: 4,
            fontSize: 11, fontFamily: "'Space Grotesk', sans-serif",
            cursor: 'pointer',
          }}
        >
          {secondary}
        </button>
      )}
      {primary && (
        <button
          onClick={onPrimary}
          style={{
            flex: 1, padding: '7px 10px',
            background: `linear-gradient(180deg, ${a}33, ${a}1a)`,
            border: `1px solid ${a}88`,
            color: danger ? theme.danger : theme.accentBright,
            borderRadius: 4,
            fontSize: 11, fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: `0 0 8px ${a}33, inset 0 0 8px ${a}22`,
          }}
        >
          {primary}
        </button>
      )}
    </div>
  )
}
