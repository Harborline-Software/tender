/**
 * StatusPill — multimodal status indicator.
 *
 * Accepts either a typed HealthState (preferred — color + glyph + text + ARIA)
 * or a legacy free-string+tone pair for backward compat with BundlesDetail.
 *
 * WCAG 1.4.1: status is NEVER conveyed by color alone — every pill shows a
 * shape-differentiated glyph and a text label alongside the color.
 */
import { useTheme } from '@/theme/ThemeProvider'
import { HEALTH_DESCRIPTORS, type HealthState } from '@/state/health'

// ── Typed variant (preferred) ─────────────────────────────────────────────────

interface HealthProps {
  health: HealthState
  /** Optional override label (default: HEALTH_DESCRIPTORS[state].label) */
  label?: string
  /** Suppress the text label — glyph only. Only for space-constrained contexts;
   *  ensure an aria-label is provided by the parent row. */
  glyphOnly?: boolean
}

// ── Legacy free-string variant (backward compat for BundlesDetail) ────────────

interface LegacyProps {
  text: string
  tone?: string
}

type Props = HealthProps | LegacyProps

function isHealthProps(p: Props): p is HealthProps {
  return 'health' in p
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StatusPill(props: Props) {
  const { theme } = useTheme()

  if (isHealthProps(props)) {
    const { health, label: labelOverride, glyphOnly = false } = props
    const desc = HEALTH_DESCRIPTORS[health]
    // 'stopped' maps to textMuted which is a text key, not a color-state key
    const color: string = desc.tokenKey === 'textMuted'
      ? theme.textMuted
      : theme[desc.tokenKey as 'healthy' | 'warn' | 'danger']
    const label = labelOverride ?? desc.label

    return (
      <div
        role="status"
        aria-label={`Status: ${label}`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 7px',
          borderRadius: 99,
          background: `${color}1a`,
          border: `1px solid ${color}55`,
          fontFamily: theme.fontMono,
          fontSize: theme.sizeLabel,
          letterSpacing: 0.8,
          color,
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        {/* Shape-differentiated glyph — satisfies WCAG 1.4.1 (not color alone) */}
        <span aria-hidden="true" style={{ fontSize: theme.sizeLabel + 1, lineHeight: 1 }}>
          {desc.glyph}
        </span>
        {!glyphOnly && <span>{label}</span>}
      </div>
    )
  }

  // Legacy free-string path — BundlesDetail + loading/error status text
  const { text, tone } = props
  const c = tone || theme.accent
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 7px',
      borderRadius: 99,
      background: `${c}1a`,
      border: `1px solid ${c}55`,
      fontFamily: theme.fontMono,
      fontSize: theme.sizeLabel,
      letterSpacing: 0.8,
      color: c, textTransform: 'uppercase',
      flexShrink: 0,
    }}>
      <span
        aria-hidden="true"
        style={{ width: 4, height: 4, borderRadius: 99, background: c, boxShadow: `0 0 4px ${c}`, display: 'inline-block' }}
      />
      {text}
    </div>
  )
}
