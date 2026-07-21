import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import { useTheme } from '@/theme/ThemeProvider'
import { getLogTail } from '@/ipc/tauri'
import { PaneHeader } from './ui'

const SERVICES = [
  { id: 'signal-bridge', label: 'Signal Bridge' },
  { id: 'sunfish', label: 'Sunfish' },
  { id: 'flight-deck', label: 'Flight Deck' },
] as const

/**
 * Full-height log viewer for the Console section (dual-surface, shipyard #2973).
 * Replaces the popup's small LogViewerSheet in the window context: the log region
 * grows to the full pane height with a real monospace measure, so an operator can
 * actually read a tail instead of peeking through a 360px sheet.
 */
export function LogViewer({ narrow, onBack }: { narrow: boolean; onBack: () => void }) {
  const { theme } = useTheme()
  const [service, setService] = useState<string>(SERVICES[0].id)
  const [lines, setLines] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const load = useCallback((svc: string) => {
    setLoading(true)
    setError(null)
    getLogTail(svc, 500)
      .then((l) => setLines(l))
      .catch((e) => { setError(String(e)); setLines([]) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(service) }, [service, load])

  // Keep the tail pinned to the bottom on refresh (newest lines visible).
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [lines])

  const active = SERVICES.find((s) => s.id === service)!

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <PaneHeader
        title="Logs"
        sub={`${active.label} · tail 500`}
        onBack={narrow ? onBack : undefined}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: theme.fontMono, fontSize: theme.sizeLabel, letterSpacing: 1.1, textTransform: 'uppercase', color: theme.textMuted }}>
                Service
              </span>
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                style={{
                  background: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 4,
                  color: theme.text,
                  fontFamily: theme.fontMono,
                  fontSize: theme.sizeMetric,
                  padding: '4px 6px',
                }}
              >
                {SERVICES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>
            <button
              onClick={() => load(service)}
              disabled={loading}
              aria-label="Refresh logs"
              title="Refresh"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: `${theme.accent}1a`,
                border: `1px solid ${theme.accent}55`,
                borderRadius: 4,
                color: theme.accent,
                fontFamily: theme.fontMono,
                fontSize: theme.sizeLabel,
                letterSpacing: 1.1,
                textTransform: 'uppercase',
                padding: '5px 10px',
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              <RefreshCw size={12} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
              Refresh
            </button>
          </div>
        }
      />

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          background: theme.bg,
          padding: '10px 14px',
          fontFamily: theme.fontMono,
          fontSize: 11,
          lineHeight: 1.55,
          color: theme.textDim,
          whiteSpace: 'pre',
        }}
      >
        {lines === null && (
          <div style={{ color: theme.textMuted }}>Reading log tail…</div>
        )}
        {lines !== null && lines.length === 0 && !error && (
          <div style={{ color: theme.textMuted, whiteSpace: 'normal' }}>
            No log lines for {active.label}. The service may not be running, or its log file has not been created yet.
          </div>
        )}
        {error && (
          <div style={{ color: theme.warn, whiteSpace: 'normal' }}>
            Log unavailable: {error}
          </div>
        )}
        {lines?.map((line, i) => (
          <div key={i} style={{ color: colorFor(line, theme) }}>{line || ' '}</div>
        ))}
      </div>
    </div>
  )
}

/** Honest severity tint from a log line — health palette only, never the accent. */
function colorFor(line: string, theme: ReturnType<typeof useTheme>['theme']): string {
  const l = line.toLowerCase()
  if (/\b(error|err|fatal|panic|fail)\b/.test(l)) return theme.danger
  if (/\b(warn|warning)\b/.test(l)) return theme.warn
  return theme.textDim
}
