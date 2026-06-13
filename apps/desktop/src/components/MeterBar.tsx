/**
 * MeterBar — horizontal resource meter with threshold-based severity color.
 *
 * Default thresholds (lower-is-better, e.g. CPU/mem/disk):
 *   < 70%  → theme.healthy (green)
 *   70–90% → theme.warn    (amber)
 *   > 90%  → theme.danger  (red)
 *
 * For higher-is-better metrics (e.g. workers airborne, throughput), pass
 * direction="higher" to invert the severity bands so high = green.
 *
 * Pass `tone` to override threshold logic entirely (legacy / decorative).
 */
import { useTheme } from '@/theme/ThemeProvider'

interface Props {
  label: string
  value: number
  max: number
  unit?: string
  /** Override threshold coloring with a fixed tone. */
  tone?: string
  /** Threshold direction: 'lower' (default) = high value is bad;
   *  'higher' = high value is good (workers airborne, throughput). */
  direction?: 'lower' | 'higher'
}

export function MeterBar({ label, value, max, unit = '', tone, direction = 'lower' }: Props) {
  const { theme } = useTheme()
  const pct = Math.min(100, (value / max) * 100)

  const fillColor = (() => {
    if (tone) return tone
    if (direction === 'higher') {
      if (pct >= 70) return theme.healthy
      if (pct >= 30) return theme.warn
      return theme.danger
    }
    // lower-is-better (default)
    if (pct < 70) return theme.healthy
    if (pct < 90) return theme.warn
    return theme.danger
  })()

  return (
    <div style={{ padding: '6px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: theme.sizeBody, color: theme.text }}>{label}</span>
        <span style={{ fontFamily: theme.fontMono, fontSize: theme.sizeMetric, color: fillColor, letterSpacing: 0.4 }}>
          {value}{unit}<span style={{ color: theme.textMuted }}> / {max}{unit}</span>
        </span>
      </div>
      <div style={{
        height: 4, borderRadius: 99,
        background: 'rgba(255,255,255,0.06)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${fillColor}aa, ${fillColor})`,
          boxShadow: `0 0 6px ${fillColor}aa`,
          borderRadius: 99,
        }} />
      </div>
    </div>
  )
}
