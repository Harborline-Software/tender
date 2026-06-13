/**
 * Canonical health state taxonomy for Tender.
 *
 * Single source of truth for: health states → token name → glyph → short
 * label → ARIA role. StatusPill consumes HealthState directly so it can't
 * be mis-toned. Fleet-shared subset aligned with Sunfish SyncState table
 * (see shipyard/_shared/design/design-language.md).
 *
 * Glyph choices are shape-differentiated (not color-only) so CVD users and
 * monochrome displays retain meaning — WCAG 1.4.1 (use of color).
 */

/** All possible health states a Tender surface can render. */
export type HealthState =
  | 'healthy'    // running, ok, online, connected
  | 'degraded'   // elevated, preview, relayed (not direct), stale
  | 'stopped'    // idle / paused / not running — not an error, just off
  | 'error'      // down, failed, missing, unreachable

/** Per-state metadata — maps to theme tokens and UI presentation. */
export interface HealthDescriptor {
  /** Token key on Theme — e.g. 'healthy' | 'warn' | 'danger' | 'textMuted' */
  tokenKey: 'healthy' | 'warn' | 'danger' | 'textMuted'
  /** Shape-differentiated glyph — not color-only. */
  glyph: string
  /** Short text label shown next to the glyph. */
  label: string
  /** ARIA live region politeness for state-change announcements. */
  ariaLive: 'polite' | 'assertive' | 'off'
}

export const HEALTH_DESCRIPTORS: Record<HealthState, HealthDescriptor> = {
  healthy: {
    tokenKey: 'healthy',
    glyph: '✓',
    label: 'Healthy',
    ariaLive: 'off',
  },
  degraded: {
    tokenKey: 'warn',
    glyph: '◐',
    label: 'Degraded',
    ariaLive: 'polite',
  },
  stopped: {
    tokenKey: 'textMuted',
    glyph: '○',
    label: 'Stopped',
    ariaLive: 'off',
  },
  error: {
    tokenKey: 'danger',
    glyph: '✕',
    label: 'Down',
    ariaLive: 'assertive',
  },
}

/**
 * Map a HarborlineService status string to a HealthState.
 * 'running' → healthy; 'idle' → stopped; 'stopped' → stopped; 'error' → error.
 */
export function serviceStatusToHealth(status: string): HealthState {
  switch (status) {
    case 'running': return 'healthy'
    case 'idle': return 'stopped'
    case 'stopped': return 'stopped'
    case 'error': return 'error'
    default: return 'degraded'
  }
}

/**
 * Aggregate a list of HealthStates to the worst-case summary.
 * error > degraded > stopped > healthy
 */
export function worstHealth(states: HealthState[]): HealthState {
  if (states.includes('error')) return 'error'
  if (states.includes('degraded')) return 'degraded'
  if (states.includes('stopped')) return 'stopped'
  return 'healthy'
}

/**
 * Summarize a health breakdown into a human-readable string.
 * e.g. "8 healthy" or "7 healthy · 1 down"
 */
export function healthSummary(states: HealthState[]): string {
  const counts = { healthy: 0, degraded: 0, stopped: 0, error: 0 }
  for (const s of states) counts[s]++
  const parts: string[] = []
  if (counts.healthy > 0) parts.push(`${counts.healthy} healthy`)
  if (counts.degraded > 0) parts.push(`${counts.degraded} degraded`)
  if (counts.stopped > 0) parts.push(`${counts.stopped} stopped`)
  if (counts.error > 0) parts.push(`${counts.error} down`)
  return parts.join(' · ') || 'no services'
}
