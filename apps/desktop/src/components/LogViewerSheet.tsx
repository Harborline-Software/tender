import { useEffect, useRef, useState, useCallback } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { getLogTail } from '@/ipc/tauri'

interface Props {
  serviceId: string
  serviceLabel: string
  onClose: () => void
}

const REFRESH_INTERVAL_MS = 5000
const LINE_COUNT = 200

export function LogViewerSheet({ serviceId, serviceLabel, onClose }: Props) {
  const { theme } = useTheme()
  const a = theme.accent
  const [lines, setLines] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  const fetchLogs = useCallback(async () => {
    try {
      const result = await getLogTail(serviceId, LINE_COUNT)
      if (!mountedRef.current) return
      setLines(result)
      setError(null)
      setLastRefresh(new Date())
    } catch (err) {
      if (!mountedRef.current) return
      setError(String(err))
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [serviceId])

  // Initial fetch + auto-refresh while sheet is mounted
  useEffect(() => {
    mountedRef.current = true
    setLoading(true)
    fetchLogs()

    intervalRef.current = setInterval(fetchLogs, REFRESH_INTERVAL_MS)

    return () => {
      mountedRef.current = false
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [fetchLogs])

  // Scroll to bottom whenever lines update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const timeLabel = lastRefresh
    ? lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      background: `linear-gradient(180deg, ${theme.bgSoft}f8 0%, ${theme.bg}fc 100%)`,
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px 8px',
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
        background: `linear-gradient(180deg, ${theme.surface} 0%, ${theme.bgSoft} 100%)`,
      }}>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            padding: '2px 4px',
            cursor: 'pointer',
            color: theme.textMuted,
            fontSize: 14,
            lineHeight: 1,
            flexShrink: 0,
          }}
          aria-label="Close log viewer"
        >
          ←
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12.5,
            color: theme.text,
            letterSpacing: 0.1,
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {serviceLabel}
          </div>
          <div style={{
            fontFamily: theme.fontMono,
            fontSize: 8,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: theme.textMuted,
            marginTop: 2,
          }}>
            Log · last {LINE_COUNT} lines · refreshes every 5s
          </div>
        </div>

        <div style={{
          fontFamily: theme.fontMono,
          fontSize: 8.5,
          color: theme.textMuted,
          letterSpacing: 0.4,
          flexShrink: 0,
        }}>
          {timeLabel}
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          style={{
            background: `${a}18`,
            border: `1px solid ${a}44`,
            borderRadius: 3,
            padding: '3px 8px',
            cursor: loading ? 'default' : 'pointer',
            color: loading ? theme.textMuted : theme.accentBright,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 10,
            flexShrink: 0,
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

      {/* Log body */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '8px 0',
      }}>
        {error ? (
          <div style={{
            padding: '12px 14px',
            fontFamily: theme.fontMono,
            fontSize: 10,
            color: theme.danger,
            letterSpacing: 0.3,
          }}>
            Error: {error}
          </div>
        ) : loading && lines.length === 0 ? (
          <div style={{
            padding: '12px 14px',
            fontFamily: theme.fontMono,
            fontSize: 10,
            color: theme.textMuted,
            letterSpacing: 0.3,
          }}>
            Loading…
          </div>
        ) : lines.length === 0 ? (
          <div style={{
            padding: '12px 14px',
            fontFamily: theme.fontMono,
            fontSize: 10,
            color: theme.textMuted,
            letterSpacing: 0.3,
          }}>
            No log output yet.
          </div>
        ) : (
          lines.map((line, i) => (
            <div
              key={i}
              style={{
                padding: '1px 14px',
                fontFamily: theme.fontMono,
                fontSize: 9.5,
                color: lineColor(line, theme),
                letterSpacing: 0.2,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                borderBottom: i < lines.length - 1 ? '1px solid rgba(255,255,255,0.02)' : 'none',
              }}
            >
              {line}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// Colour-code lines by content: errors red, warnings amber, rest default.
function lineColor(line: string, theme: import('@/theme/tokens').Theme): string {
  const l = line.toLowerCase()
  if (l.includes('error') || l.includes('exception') || l.includes('fatal') || l.includes('fail')) {
    return theme.danger
  }
  if (l.includes('warn') || l.includes('warning')) {
    return theme.warn
  }
  return theme.textDim
}
