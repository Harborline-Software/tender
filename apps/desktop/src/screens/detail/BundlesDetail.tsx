/**
 * BundlesDetail — Q6 bundle manifest viewer and plugin health surface.
 *
 * Loads bundle manifests + plugin health on mount (H3.A: load-on-panel-open,
 * no persistent caching). Displays each bundle's category, status, and the
 * health status of each declared provider requirement.
 *
 * Q6 v1: all plugin health statuses are "unknown" (H4.A ruling). The UX
 * surfaces this honestly rather than masking with false confidence.
 */
import { useState, useEffect } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { MenuShell } from '@/components/MenuShell'
import { DetailHeader } from '@/components/DetailHeader'
import { StatusPill } from '@/components/StatusPill'
import { FiberDivider } from '@/components/FiberDivider'
import { getBundleManifests, getPluginHealth } from '@/ipc/tauri'
import type {
  BusinessCaseBundleManifest,
  PluginHealthRecord,
  PluginHealthStatus,
} from '@/ipc/tauri'
import type { BundleCategory, BundleStatus } from '@sunfish/contracts'

// ── Constants ─────────────────────────────────────────────────────────────────

// T1: typed as Record<Union, string> so TS catches missing keys on enum-drift
const CATEGORY_ICONS: Record<BundleCategory, string> = {
  Operations: '⚙',
  Diligence: '🔍',
  Finance: '◈',
  Platform: '⬡',
}

const STATUS_LABEL: Record<BundleStatus, string> = {
  Draft: 'Draft',
  Preview: 'Preview',
  GA: 'GA',
  Deprecated: 'Deprecated',
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HealthDot({ status }: { status: PluginHealthStatus }) {
  const { theme } = useTheme()
  // T1: typed as Record<PluginHealthStatus, string> for discriminated-union safety
  // F4.3: degraded amber now uses theme.warn token (no more hardcoded #f0b370)
  const colors: Record<PluginHealthStatus, string> = {
    unknown: theme.textMuted,
    ok: theme.healthy,
    degraded: theme.warn,
    missing: theme.danger,
  }
  const color = colors[status] ?? theme.textMuted
  // F5.5: fix aria-hidden/aria-label contradiction — the dot is decorative;
  // the text status label in the same table cell carries the accessible meaning.
  // aria-hidden="true" is correct; remove aria-label from the hidden element.
  const tooltip = status === 'unknown'
    ? 'Status check not implemented in Q6 v1 — provider health probing ships in Q6 v2'
    : `Provider health: ${status}`
  return (
    <span
      aria-hidden="true"
      title={tooltip}
      style={{
        display: 'inline-block',
        width: 6, height: 6, borderRadius: '50%',
        background: color,
        boxShadow: status === 'ok' ? `0 0 4px ${color}` : 'none',
        flexShrink: 0,
      }}
    />
  )
}

function BundleCard({
  manifest,
  healthRecords,
}: {
  manifest: BusinessCaseBundleManifest
  healthRecords: PluginHealthRecord[]
}) {
  const { theme } = useTheme()
  const a = theme.accent
  const [expanded, setExpanded] = useState(false)

  const bundleHealth = healthRecords.filter((r) => r.bundleKey === manifest.key)
  const icon = CATEGORY_ICONS[manifest.category] ?? '◻'
  // A1: stable id for aria-controls linkage
  const detailPanelId = `bundle-detail-${manifest.key}`

  // F4.3: Preview (amber/warn) now uses theme.warn token — no hardcoded hex
  const statusColor =
    manifest.status === 'GA' ? a
      : manifest.status === 'Preview' ? theme.warn
        : manifest.status === 'Deprecated' ? theme.danger
          : theme.textMuted

  return (
    <div style={{
      margin: '6px 10px',
      background: `linear-gradient(180deg, ${theme.bgSoft} 0%, ${theme.bg} 100%)`,
      border: `1px solid ${theme.border}`,
      borderRadius: 5,
      overflow: 'hidden',
    }}>
      {/* Bundle header row */}
      {/* A1: aria-expanded + aria-controls link to detail panel */}
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={detailPanelId}
        title={expanded ? 'Collapse' : 'Expand'}
        style={{
          width: '100%', textAlign: 'left',
          background: 'transparent',
          border: 'none', cursor: 'pointer',
          padding: '8px 10px',
          display: 'flex', alignItems: 'center', gap: 8,
          color: theme.text,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${a}0d` }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        {/* Category icon */}
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          color: a,
          width: 18,
          flexShrink: 0,
          textAlign: 'center',
        }}>
          {icon}
        </span>

        {/* Name + category */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11.5, fontWeight: 600,
            color: theme.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {manifest.name}
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8, letterSpacing: 1, color: theme.textMuted,
            marginTop: 2, textTransform: 'uppercase',
          }}>
            {manifest.category} · v{manifest.version}
          </div>
        </div>

        {/* Status pill */}
        <StatusPill text={STATUS_LABEL[manifest.status] ?? manifest.status} tone={statusColor} />

        {/* Expand chevron — decorative; aria-expanded on button carries semantic state */}
        <svg
          aria-hidden="true"
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms ease', flexShrink: 0 }}
        >
          <path d="M2 4L5 7L8 4" stroke={theme.textDim} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* A1: expanded detail panel — id linked from aria-controls on the button */}
      {expanded && (
        <div id={detailPanelId}>
          <div style={{ height: 1, background: theme.border }} />

          {/* Maturity + description */}
          {(manifest.description || manifest.maturity) && (
            <div style={{ padding: '6px 10px 4px' }}>
              {manifest.description && (
                <p style={{
                  margin: 0, marginBottom: 4,
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 10.5, color: theme.textDim, lineHeight: 1.5,
                }}>
                  {manifest.description}
                </p>
              )}
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8, color: theme.textMuted, letterSpacing: 0.8,
              }}>
                MATURITY: {manifest.maturity}
              </div>
            </div>
          )}

          {/* A2: provider requirements as semantic table with scope attrs */}
          {bundleHealth.length > 0 && (
            <>
              <div style={{ height: 1, background: `${theme.border}88` }} />
              <div style={{ padding: '6px 10px 4px' }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 8, letterSpacing: 1.4, color: theme.textMuted,
                  textTransform: 'uppercase', marginBottom: 5,
                }}>
                  Plugin requirements ({bundleHealth.length})
                </div>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  borderSpacing: 0,
                }}>
                  <thead>
                    <tr>
                      <th scope="col" style={{
                        textAlign: 'left',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 7, letterSpacing: 0.8,
                        color: theme.textMuted, fontWeight: 'normal',
                        textTransform: 'uppercase',
                        paddingBottom: 3,
                      }}>
                        Provider
                      </th>
                      <th scope="col" style={{
                        textAlign: 'center',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 7, letterSpacing: 0.8,
                        color: theme.textMuted, fontWeight: 'normal',
                        textTransform: 'uppercase',
                        paddingBottom: 3,
                        width: 32,
                      }}>
                        Req
                      </th>
                      <th scope="col" style={{
                        textAlign: 'right',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 7, letterSpacing: 0.8,
                        color: theme.textMuted, fontWeight: 'normal',
                        textTransform: 'uppercase',
                        paddingBottom: 3,
                        width: 60,
                      }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundleHealth.map((rec, i) => (
                      <tr key={i} style={{
                        background: `${theme.bgSoft}88`,
                      }}>
                        <td style={{
                          padding: '3px 6px 3px 0',
                          borderBottom: `1px solid ${theme.border}33`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <HealthDot status={rec.status} />
                            <span style={{
                              fontFamily: "'Space Grotesk', sans-serif",
                              fontSize: 10.5, color: theme.text,
                            }}>
                              {rec.providerCategory}
                            </span>
                            {rec.purpose && (
                              <span style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                fontSize: 9.5, color: theme.textMuted,
                              }}>
                                — {rec.purpose}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{
                          textAlign: 'center',
                          padding: '3px 4px',
                          borderBottom: `1px solid ${theme.border}33`,
                        }}>
                          {rec.isRequired && (
                            <span style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 7, letterSpacing: 0.6,
                              color: theme.textMuted, background: `${theme.border}88`,
                              borderRadius: 2, padding: '1px 4px',
                              textTransform: 'uppercase',
                            }}>req</span>
                          )}
                        </td>
                        <td style={{
                          textAlign: 'right',
                          padding: '3px 0 3px 4px',
                          borderBottom: `1px solid ${theme.border}33`,
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 8, color: theme.textMuted,
                          textTransform: 'uppercase',
                        }}>
                          {rec.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {bundleHealth.length === 0 && (
            <div style={{
              padding: '5px 10px 6px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8.5, color: theme.textMuted,
            }}>
              No provider requirements declared
            </div>
          )}

          {/* MinimumSpec badge if present */}
          {manifest.requirements && manifest.requirements.policy && (
            <>
              <div style={{ height: 1, background: `${theme.border}88` }} />
              <div style={{
                padding: '4px 10px 5px',
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8, color: theme.textMuted, textTransform: 'uppercase',
              }}>
                <span>Min-spec: {manifest.requirements.policy}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function BundlesDetail({ onBack }: Props) {
  const { theme } = useTheme()
  const a = theme.accent

  const [manifests, setManifests] = useState<BusinessCaseBundleManifest[]>([])
  const [health, setHealth] = useState<PluginHealthRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // H3.A: load on panel open — no caching, no polling
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([getBundleManifests(), getPluginHealth()])
      .then(([m, h]) => {
        if (cancelled) return
        setManifests(m)
        setHealth(h)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(typeof err === 'string' ? err : 'Failed to load bundle manifests')
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  const bundleCount = manifests.length
  const healthUnknownCount = health.filter((r) => r.status === 'unknown').length
  const subLabel = loading
    ? 'Loading…'
    : error
      ? 'Load error'
      : `${bundleCount} bundles · ${healthUnknownCount} provider slots`

  return (
    <MenuShell>
      <DetailHeader
        title="Installed Bundles"
        sub={subLabel}
        onBack={onBack}
        badge={
          <StatusPill
            text={loading ? 'Loading' : error ? 'Error' : `${bundleCount}`}
            tone={error ? theme.danger : undefined}
          />
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {/* A3: loading state — role="status" + aria-live for screen reader announcement */}
        {loading && (
          <div
            role="status"
            aria-live="polite"
            style={{
              padding: '24px 14px',
              textAlign: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, letterSpacing: 1.2, color: theme.textMuted,
              textTransform: 'uppercase',
            }}>
            Reading manifests…
          </div>
        )}

        {/* A3: error state — role="alert" for screen reader announcement */}
        {error && !loading && (
          <div style={{ padding: '14px' }}>
            <div
              role="alert"
              style={{
                background: `${theme.danger}1a`,
                border: `1px solid ${theme.danger}44`,
                borderRadius: 5,
                padding: '10px 12px',
              }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, letterSpacing: 1.2, color: theme.danger,
                textTransform: 'uppercase', marginBottom: 5,
              }}>
                Manifest load error
              </div>
              <div style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 10.5, color: theme.textDim, lineHeight: 1.5,
              }}>
                {error}
              </div>
            </div>
          </div>
        )}

        {!loading && !error && manifests.length === 0 && (
          <div style={{
            padding: '24px 14px',
            textAlign: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, letterSpacing: 1.2, color: theme.textMuted,
            textTransform: 'uppercase',
          }}>
            No bundle manifests found
          </div>
        )}

        {!loading && !error && manifests.length > 0 && (
          <>
            {/* Category summary header */}
            <div style={{
              padding: '8px 14px 4px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, letterSpacing: 1.4,
                textTransform: 'uppercase', color: theme.textMuted,
              }}>
                ↳ {bundleCount} bundles · fleet catalog
              </span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, color: a, letterSpacing: 0.6,
              }}>
                {/* H4.A: honest "unknown" surface — no false confidence */}
                probing: off
              </span>
            </div>

            <FiberDivider dim />

            {/* Bundle cards */}
            {manifests.map((m) => (
              <BundleCard key={m.key} manifest={m} healthRecords={health} />
            ))}

            {/* Q6 v1 footer note */}
            <div style={{ padding: '8px 14px 10px' }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8, letterSpacing: 0.8, color: theme.textMuted,
                textTransform: 'uppercase', lineHeight: 1.5,
              }}>
                Plugin health probing is not enabled in this release.
                Provider slots show "unknown" until Q6 v2 probing is added.
              </div>
            </div>
          </>
        )}
      </div>
    </MenuShell>
  )
}
