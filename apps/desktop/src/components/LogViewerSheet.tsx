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
/** Distance from the bottom (px) still counted as "pinned to the tail". */
const TAIL_THRESHOLD_PX = 28

export function LogViewerSheet({ serviceId, serviceLabel, onClose }: Props) {
  const { theme } = useTheme()
  const a = theme.accent
  const [lines, setLines] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  // Whether new lines have arrived while the user is scrolled up reading.
  const [behind, setBehind] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  // Ref (not state) so the refresh loop reads the live value without re-subscribing.
  const pinnedRef = useRef(true)
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

  const isPinned = () => {
    const el = scrollRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight <= TAIL_THRESHOLD_PX
  }

  const jumpToLatest = () => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
    pinnedRef.current = true
    setBehind(false)
  }

  const handleScroll = () => {
    pinnedRef.current = isPinned()
    if (pinnedRef.current && behind) setBehind(false)
  }

  // Follow the tail ONLY when the reader is already pinned to the bottom.
  // If they've scrolled up to read, keep their position and surface a quiet
  // "new lines" affordance instead of yanking them down (the old auto-collapse).
  // Instant, not smooth: a 5s refresh cadence + smooth-scroll animation fight.
  useEffect(() => {
    if (pinnedRef.current) {
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
      setBehind(false)
    } else {
      setBehind(true)
    }
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
        padding: `${theme.space[4]}px ${theme.space[5]}px ${theme.space[3]}px`,
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: theme.space[4],
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
            fontSize: theme.sizeRowTitle,
            lineHeight: 1,
            flexShrink: 0,
          }}
          aria-label="Close log viewer"
        >
          ←
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: theme.sizeBody,
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
            fontSize: theme.sizeLabel,
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
          fontSize: theme.sizeLabel,
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
            borderRadius: theme.radiusLg / 2,
            padding: '3px 9px',
            cursor: loading ? 'default' : 'pointer',
            color: loading ? theme.textMuted : theme.accentBright,
            fontFamily: theme.fontRow,
            fontSize: theme.sizeMetric,
            flexShrink: 0,
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

      {/* Log body */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          position: 'relative',
          flex: 1,
          overflow: 'auto',
          padding: `${theme.space[3]}px 0`,
        }}
      >
        {error ? (
          <div style={{ padding: `${theme.space[4]}px ${theme.space[5]}px`, fontFamily: theme.fontMono, fontSize: theme.sizeMetric, color: theme.danger, letterSpacing: 0.3 }}>
            Error: {error}
          </div>
        ) : loading && lines.length === 0 ? (
          <div style={{ padding: `${theme.space[4]}px ${theme.space[5]}px`, fontFamily: theme.fontMono, fontSize: theme.sizeMetric, color: theme.textMuted, letterSpacing: 0.3 }}>
            Loading…
          </div>
        ) : lines.length === 0 ? (
          <div style={{ padding: `${theme.space[4]}px ${theme.space[5]}px`, fontFamily: theme.fontMono, fontSize: theme.sizeMetric, color: theme.textMuted, letterSpacing: 0.3 }}>
            No log output yet.
          </div>
        ) : (
          lines.map((line, i) => (
            <div
              key={i}
              style={{
                padding: `1px ${theme.space[5]}px`,
                fontFamily: theme.fontMono,
                fontSize: theme.sizeLabel,
                color: lineColor(line, theme),
                letterSpacing: 0.2,
                lineHeight: 1.65,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {line}
            </div>
          ))
        )}
      </div>

      {/* Jump-to-latest — only when new lines arrived while scrolled up reading.
          Replaces the old force-scroll-to-bottom that interrupted reading. */}
      {behind && (
        <button
          onClick={jumpToLatest}
          style={{
            position: 'absolute',
            left: '50%',
            bottom: theme.space[5],
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: `${theme.space[2]}px ${theme.space[4]}px`,
            background: theme.accent,
            color: theme.bg,
            border: 'none',
            borderRadius: theme.radiusFull,
            fontFamily: theme.fontRow,
            fontSize: theme.sizeMetric,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: `0 6px 18px ${theme.shadow}, 0 0 14px ${a}55`,
            zIndex: 2,
          }}
          aria-label="Jump to latest log lines"
        >
          <span aria-hidden="true">↓</span> New lines
        </button>
      )}
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
