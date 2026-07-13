/**
 * RelayDetail — R8 sync / relay status surface.
 *
 * Surfaces:
 *   1. Bridge relay reachability + health probe result
 *   2. Tailnet device list (device count, online/offline)
 *   3. Coordination-sync status (last-sync mtime from the log)
 *
 * v1 single-device honest framing:
 *   The relay live-emit (R-3) is deferred. This surface shows the v1
 *   reality accurately: "Single device — relay sync not yet active."
 *   It does NOT fake sync activity or claim multi-device when the
 *   infrastructure isn't wired yet. F8.2 principle: never render
 *   fabricated metrics as fact.
 *
 * Reuses the fleet SyncState four-signal indicator pattern:
 *   healthy / stale / offline / singledevice
 *   Each maps to: color token + shape glyph + text label + ARIA role
 *
 * Path-A a11y rules: semantic tokens, WCAG-AA status encoding,
 * empty/loading/error states.
 */
import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { MenuShell } from '@/components/MenuShell'
import { DetailHeader } from '@/components/DetailHeader'
import { StatusPill } from '@/components/StatusPill'
import { FiberDivider } from '@/components/FiberDivider'
import { DataLine } from '@/components/DataLine'
import { ActionFooter } from '@/components/ActionFooter'
import { getSyncStatus, getDevices } from '@/ipc/tauri'
import type { SyncStatus, SyncStateValue } from '@/state/types'
import type { DeviceData } from '@/ipc/tauri'

interface Props {
  onBack: () => void
}

// ── Status indicator map (fleet SyncState four-signal pattern) ───────────────

interface StateSpec {
  /** Color token name on the theme object. */
  color: 'healthy' | 'warn' | 'danger' | 'accent'
  /** Shape glyph (renders at 10px mono). */
  glyph: string
  /** Short text label. */
  label: string
  /** ARIA description. */
  aria: string
}

const STATE_SPEC: Record<SyncStateValue, StateSpec> = {
  healthy: {
    color: 'healthy',
    glyph: '✓',
    label: 'Linked',
    aria: 'Relay linked and sync active',
  },
  stale: {
    color: 'warn',
    glyph: '◐',
    label: 'Stale',
    aria: 'Relay reachable but coordination sync is stale',
  },
  offline: {
    color: 'danger',
    glyph: '✕',
    label: 'Offline',
    aria: 'Relay unreachable — check your connection',
  },
  singledevice: {
    color: 'accent',
    glyph: '○',
    label: 'Single device',
    aria: 'Single-device mode — relay sync not yet active in v1',
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function epochRelative(epoch: number | null): string {
  if (epoch == null) return 'never'
  const secs = Math.floor((Date.now() / 1000) - epoch)
  if (secs < 10) return 'just now'
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  return `${hours}h ago`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SyncStateRow({ state, theme }: { state: SyncStateValue; theme: ReturnType<typeof useTheme>['theme'] }) {
  const spec = STATE_SPEC[state]
  const color = theme[spec.color]

  return (
    <div
      role="status"
      aria-label={spec.aria}
      style={{
        margin: '10px 14px',
        background: `${color}15`,
        border: `1px solid ${color}44`,
        borderRadius: theme.radiusLg,
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      {/* Shape glyph */}
      <span
        aria-hidden="true"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 14,
          color,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        {spec.glyph}
      </span>

      <div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          letterSpacing: 1.4,
          color,
          textTransform: 'uppercase',
          marginBottom: 2,
        }}>
          {spec.label}
        </div>
        <p style={{
          margin: 0,
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 10.5,
          color: theme.textDim,
          lineHeight: 1.45,
        }}>
          {state === 'singledevice'
            ? 'Single-device mode. Relay encryption (R-3) ships in a future release. ' +
              'Your data is stored locally and backed up to Bridge as ciphertext.'
            : state === 'offline'
              ? 'Bridge relay is unreachable. Check that Signal-Bridge is running on this node.'
              : state === 'stale'
                ? 'Relay is reachable but the coordination-sync log has not updated in >5 min.'
                : 'Relay linked. All sync paths operational.'}
        </p>
      </div>
    </div>
  )
}

function DeviceRow({ device, theme }: { device: DeviceData; theme: ReturnType<typeof useTheme>['theme'] }) {
  const a = theme.accent
  const statusColor = device.online ? theme.healthy : theme.textMuted
  const statusLabel = device.online ? 'online' : 'offline'

  return (
    <div style={{
      padding: '7px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      borderBottom: `1px solid ${theme.border}`,
    }}>
      {/* Online/offline glyph */}
      <span
        role="status"
        aria-label={`${device.hostname}: ${statusLabel}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: statusColor,
          flexShrink: 0,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: statusColor,
            boxShadow: device.online ? `0 0 4px ${statusColor}` : 'none',
          }}
        />
        {statusLabel.toUpperCase()}
      </span>

      {/* Hostname */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: theme.sizeRowTitle,
          color: theme.text,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}>
          {device.hostname}
          {device.isCurrentDevice && (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: theme.sizeLabel,
              color: a,
              background: `${a}22`,
              border: `1px solid ${a}55`,
              borderRadius: 2,
              padding: '1px 4px',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              flexShrink: 0,
            }}>
              this
            </span>
          )}
        </div>
        {device.tailscaleIPs.length > 0 && (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: theme.sizeLabel,
            color: theme.textMuted,
            marginTop: 2,
          }}>
            {device.tailscaleIPs[0]}
          </div>
        )}
      </div>

      {/* OS badge */}
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: theme.sizeLabel,
        color: theme.textMuted,
        background: `${theme.border}88`,
        borderRadius: 2,
        padding: '1px 5px',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        flexShrink: 0,
      }}>
        {device.os.toLowerCase()}
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function RelayDetail({ onBack }: Props) {
  const { theme } = useTheme()

  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [devices, setDevices] = useState<DeviceData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)

    Promise.all([getSyncStatus(), getDevices()])
      .then(([status, devs]) => {
        setSyncStatus(status)
        setDevices(devs)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(typeof err === 'string' ? err : 'Failed to load sync status')
        setLoading(false)
      })
  }, [])

  useEffect(() => { load() }, [load])

  const onlineCount = devices.filter((d) => d.online).length
  const subLabel = loading
    ? 'Probing…'
    : error
      ? 'Probe error'
      : syncStatus
        ? `${onlineCount} node${onlineCount !== 1 ? 's' : ''} online · ${STATE_SPEC[syncStatus.state].label}`
        : '—'

  const headerStatusTone = syncStatus
    ? theme[STATE_SPEC[syncStatus.state].color]
    : undefined

  return (
    <MenuShell>
      <DetailHeader
        title="Sync & Relay"
        sub={subLabel}
        onBack={onBack}
        badge={
          <StatusPill
            text={
              loading ? 'Probing' : error ? 'Error'
                : syncStatus ? STATE_SPEC[syncStatus.state].label : '—'
            }
            tone={error ? theme.danger : headerStatusTone}
          />
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {/* Loading */}
        {loading && (
          <div
            role="status"
            aria-live="polite"
            style={{
              padding: '24px 14px',
              textAlign: 'center',
              fontFamily: theme.fontMono,
              fontSize: theme.sizeLabel,
              letterSpacing: 1.2,
              color: theme.textMuted,
              textTransform: 'uppercase',
            }}
          >
            Probing relay…
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ padding: '14px' }}>
            <div
              role="alert"
              style={{
                background: `${theme.danger}1a`,
                border: `1px solid ${theme.danger}44`,
                borderRadius: theme.radiusLg,
                padding: '10px 12px',
              }}
            >
              <div style={{
                fontFamily: theme.fontMono,
                fontSize: theme.sizeLabel,
                letterSpacing: 1.2,
                color: theme.danger,
                textTransform: 'uppercase',
                marginBottom: 5,
              }}>
                Relay probe error
              </div>
              <p style={{
                margin: 0,
                fontFamily: theme.fontRow,
                fontSize: theme.sizeBody,
                color: theme.textDim,
                lineHeight: 1.5,
              }}>
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && !error && syncStatus && (
          <>
            {/* Fleet SyncState indicator (four-signal: color + glyph + text + ARIA) */}
            <SyncStateRow state={syncStatus.state} theme={theme} />

            {/* Relay metrics */}
            <div style={{
              padding: '6px 14px 4px',
              fontFamily: theme.fontMono,
              fontSize: theme.sizeLabel,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              color: theme.textMuted,
            }}>
              ↳ Relay status
            </div>
            <FiberDivider dim />
            <DataLine
              label="relay"
              value={syncStatus.relayReachable ? 'reachable' : 'unreachable'}
              tone={syncStatus.relayReachable ? theme.healthy : theme.danger}
            />
            <DataLine
              label="multi-device"
              value={syncStatus.multiDeviceActive ? 'active' : 'not yet active (v1)'}
              tone={syncStatus.multiDeviceActive ? theme.healthy : theme.textMuted}
            />
            <DataLine
              label="relay emit"
              value="deferred (R-3 pending)"
              tone={theme.textMuted}
            />

            {/* Coordination sync */}
            <div style={{
              padding: '6px 14px 4px',
              fontFamily: theme.fontMono,
              fontSize: theme.sizeLabel,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              color: theme.textMuted,
            }}>
              ↳ Coordination sync
            </div>
            <FiberDivider dim />
            <DataLine
              label="last sync"
              value={epochRelative(syncStatus.lastCoordSyncAt)}
              tone={
                syncStatus.lastCoordSyncAt == null
                  ? theme.textMuted
                  : ((Date.now() / 1000) - syncStatus.lastCoordSyncAt) > 300
                    ? theme.warn
                    : theme.healthy
              }
            />

            {/* Tailnet devices */}
            <div style={{
              padding: '6px 14px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{
                fontFamily: theme.fontMono,
                fontSize: theme.sizeLabel,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: theme.textMuted,
              }}>
                ↳ Tailnet nodes
              </span>
              <span style={{
                fontFamily: theme.fontMono,
                fontSize: theme.sizeLabel,
                color: theme.accent,
                letterSpacing: 0.6,
              }}>
                {onlineCount} ONLINE
              </span>
            </div>
            <FiberDivider dim />

            {devices.length === 0 && (
              <div style={{
                padding: '16px 14px',
                fontFamily: theme.fontMono,
                fontSize: theme.sizeLabel,
                color: theme.textMuted,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
              }}>
                No devices on this tailnet — is Tailscale running?
              </div>
            )}

            {devices.map((d) => (
              <DeviceRow key={d.hostname} device={d} theme={theme} />
            ))}

            {/* v1 honest footer */}
            <div style={{
              padding: '8px 14px 10px',
              fontFamily: theme.fontMono,
              fontSize: theme.sizeLabel,
              letterSpacing: 0.8,
              color: theme.textMuted,
              lineHeight: 1.5,
              textTransform: 'uppercase',
            }}>
              Relay delta emit (R-3) is not active in this release.
              Ciphertext backup to Bridge is the v1 restore path.
            </div>
          </>
        )}
      </div>

      <ActionFooter
        primary="Re-probe"
        secondary="Manage Tailscale"
        onPrimary={load}
        onSecondary={() => {
          // Open Tailscale admin console in default browser.
          import('@/ipc/tauri').then(({ openExternal }) =>
            openExternal('https://login.tailscale.com/admin')
          )
        }}
      />
    </MenuShell>
  )
}
