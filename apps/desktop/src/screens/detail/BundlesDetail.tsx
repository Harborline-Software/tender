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
import type { BusinessCaseBundleManifest, PluginHealthRecord } from '@/ipc/tauri'

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  Operations: '⚙',
  Diligence: '🔍',
  Finance: '◈',
  Platform: '⬡',
}

const STATUS_LABEL: Record<string, string> = {
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

function HealthDot({ status }: { status: string }) {
  const { theme } = useTheme()
  const colors: Record<string, string> = {
    unknown: theme.textMuted,
    ok: theme.accent,
    degraded: '#f0b370',
    missing: theme.danger,
  }
  const color = colors[status] ?? theme.textMuted
  return (
    <span style={{
      display: 'inline-block',
      width: 6, height: 6, borderRadius: '50%',
      background: color,
      boxShadow: status === 'ok' ? `0 0 4px ${color}` : 'none',
      flexShrink: 0,
    }} />
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

  const statusColor =
    manifest.status === 'GA' ? a
      : manifest.status === 'Preview' ? '#f0b370'
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
      <button
        onClick={() => setExpanded((v) => !v)}
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

        {/* Expand chevron */}
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms ease', flexShrink: 0 }}
        >
          <path d="M2 4L5 7L8 4" stroke={theme.textDim} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <>
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

          {/* Provider requirements / plugin health */}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {bundleHealth.map((rec, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '3px 6px',
                      background: `${theme.bgSoft}88`,
                      borderRadius: 3,
                      border: `1px solid ${theme.border}55`,
                    }}>
                      <HealthDot status={rec.status} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{
                          fontFamily: "'Space Grotesk', sans-serif",
                          fontSize: 10.5, color: theme.text,
                        }}>
                          {rec.providerCategory}
                        </span>
                        {rec.purpose && (
                          <span style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: 9.5, color: theme.textMuted, marginLeft: 5,
                          }}>
                            — {rec.purpose}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        {rec.isRequired && (
                          <span style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 7, letterSpacing: 0.6,
                            color: theme.textMuted, background: `${theme.border}88`,
                            borderRadius: 2, padding: '1px 4px',
                            textTransform: 'uppercase',
                          }}>req</span>
                        )}
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 8, color: theme.textMuted,
                          textTransform: 'uppercase',
                        }}>
                          {rec.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
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
        </>
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
        {loading && (
          <div style={{
            padding: '24px 14px',
            textAlign: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, letterSpacing: 1.2, color: theme.textMuted,
            textTransform: 'uppercase',
          }}>
            Reading manifests…
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: '14px' }}>
            <div style={{
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
