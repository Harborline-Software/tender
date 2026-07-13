/**
 * ModelInventoryDetail — cross-zoo INSTALLED-MODEL inventory pane.
 *
 * Toolbox #137, ONR harness-landscape survey slice G1
 * (`_shared/research/onr-ai-harness-landscape-2026-07-07.md` §3). Wraps each
 * AI backend's own inventory (Ollama, TTS, ComfyUI, Stability Matrix) behind
 * small probe adapters (`inventory.rs`) and unions them into one list grouped
 * by backend.
 *
 * Honest states, never a silent empty list (the G1 build gate):
 *   - `ok`            — the probe succeeded; `models` may legitimately be [].
 *   - `unreachable`    — the backend/host could not be reached.
 *   - `dirMissing`     — the host was reachable but the model dir is absent.
 *   - `notConfigured`  — an optional backend (Stability Matrix) has no probe
 *                        target configured — no attempt was made.
 *
 * Manual refresh, not polled — directory probes go over SSH and can take a
 * few seconds; hammering them every few seconds (ServicesTab's 5s cadence)
 * would be wasteful and slow the panel down for no benefit.
 */
import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { MenuShell } from '@/components/MenuShell'
import { DetailHeader } from '@/components/DetailHeader'
import { StatusPill } from '@/components/StatusPill'
import { FiberDivider } from '@/components/FiberDivider'
import { getModelInventory } from '@/ipc/tauri'
import type { InventoryGroup, InventoryStatus } from '@/state/types'

interface Props {
  onBack: () => void
}

function fmtBytes(bytes: number | null): string {
  if (bytes === null) return '—'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function statusTone(theme: ReturnType<typeof useTheme>['theme'], status: InventoryStatus): string {
  switch (status) {
    case 'ok': return theme.healthy
    case 'unreachable': return theme.danger
    case 'dirMissing': return theme.warn
    case 'notConfigured': return theme.textMuted
  }
}

function statusLabel(status: InventoryStatus): string {
  switch (status) {
    case 'ok': return 'reachable'
    case 'unreachable': return 'unreachable'
    case 'dirMissing': return 'dir missing'
    case 'notConfigured': return 'not configured'
  }
}

export function ModelInventoryDetail({ onBack }: Props) {
  const { theme } = useTheme()
  const a = theme.accent

  const [groups, setGroups] = useState<InventoryGroup[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(() => {
    setLoading(true)
    getModelInventory()
      .then((g) => { setGroups(g); setError(null) })
      .catch((e: unknown) => {
        setError(typeof e === 'string' ? e : 'Could not read the model inventory')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const totalModels = groups?.reduce((n, g) => n + g.models.length, 0) ?? 0
  const anyProblem = groups?.some((g) => g.status !== 'ok') ?? false

  return (
    <MenuShell>
      <DetailHeader
        title="Model Inventory"
        sub="Installed models · across the zoo"
        onBack={onBack}
        badge={
          <button
            onClick={refresh}
            disabled={loading}
            title="Refresh"
            style={{
              background: 'transparent', border: 'none', cursor: loading ? 'default' : 'pointer',
              padding: 4, borderRadius: 4, color: theme.text, opacity: loading ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{
              animation: loading ? 'spin 900ms linear infinite' : undefined,
            }}>
              <path d="M11 3.5A5 5 0 1 0 12 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
              <path d="M11 1.5V4H8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </button>
        }
      />

      {/* Summary line */}
      <div style={{
        padding: '8px 14px 4px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: theme.fontMono, fontSize: theme.sizeLabel, letterSpacing: 1.4,
          textTransform: 'uppercase', color: theme.textMuted,
        }}>
          ↳ {groups === null ? '…' : totalModels} model{totalModels === 1 ? '' : 's'} · {groups?.length ?? 0} backend{groups?.length === 1 ? '' : 's'}
        </span>
        {anyProblem && (
          <span style={{
            fontFamily: theme.fontMono, fontSize: theme.sizeLabel, color: theme.warn, letterSpacing: 0.6,
          }}>
            some unreachable
          </span>
        )}
      </div>

      <FiberDivider dim />

      {/* Loading (first fetch) */}
      {groups === null && !error && (
        <div style={{
          padding: '24px 14px', textAlign: 'center',
          fontFamily: theme.fontMono, fontSize: theme.sizeLabel, color: theme.textMuted,
          textTransform: 'uppercase', letterSpacing: 1.2,
        }}>
          Probing the zoo…
        </div>
      )}

      {/* Hard error (the command itself failed, not a per-backend probe) */}
      {error && (
        <div style={{ padding: '10px 14px' }}>
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
              fontFamily: theme.fontMono, fontSize: theme.sizeLabel, letterSpacing: 1.2,
              color: theme.danger, textTransform: 'uppercase', marginBottom: 5,
            }}>
              Inventory unavailable
            </div>
            <div style={{ fontFamily: theme.fontRow, fontSize: theme.sizeBody, color: theme.textDim, lineHeight: 1.5 }}>
              {error}
            </div>
          </div>
        </div>
      )}

      {/* Per-backend groups */}
      {groups && groups.map((g) => (
        <div key={g.targetId}>
          <div style={{
            padding: '10px 14px 6px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: theme.sizeRowTitle, fontWeight: 600, color: theme.text }}>
                {g.displayName}
              </div>
              <div style={{
                fontFamily: theme.fontMono, fontSize: theme.sizeLabel, color: theme.textMuted,
                letterSpacing: 0.6, marginTop: 2,
              }}>
                {g.host}
              </div>
            </div>
            <StatusPill text={statusLabel(g.status)} tone={statusTone(theme, g.status)} />
          </div>

          {/* Honest non-ok detail (never a silent empty list) */}
          {g.status !== 'ok' && g.detail && (
            <div style={{
              margin: '0 14px 8px',
              padding: '7px 10px',
              borderRadius: 4,
              background: `${statusTone(theme, g.status)}12`,
              border: `1px solid ${statusTone(theme, g.status)}33`,
              fontFamily: theme.fontRow, fontSize: theme.sizeBody, color: theme.textDim,
              lineHeight: 1.4,
            }}>
              {g.detail}
            </div>
          )}

          {/* ok + genuinely empty (a real, distinct state from unreachable) */}
          {g.status === 'ok' && g.models.length === 0 && (
            <div style={{
              margin: '0 14px 8px',
              padding: '7px 10px',
              fontFamily: theme.fontMono, fontSize: theme.sizeLabel, color: theme.textMuted,
              letterSpacing: 0.6,
            }}>
              Reachable — no models installed yet.
            </div>
          )}

          {g.models.map((m, i) => (
            <div key={m.name} style={{
              padding: '6px 14px 6px 26px',
              display: 'flex', alignItems: 'center', gap: 10,
              borderTop: i > 0 ? `1px solid ${theme.border}` : 'none',
            }}>
              <span style={{
                flex: 1, minWidth: 0,
                fontFamily: theme.fontMono, fontSize: 11, color: theme.text,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {m.name}
              </span>
              <span style={{
                fontFamily: theme.fontMono, fontSize: theme.sizeMetric, color: a,
                letterSpacing: 0.3, width: 56, textAlign: 'right', flexShrink: 0,
              }}>
                {fmtBytes(m.sizeBytes)}
              </span>
            </div>
          ))}

          <FiberDivider dim />
        </div>
      ))}

      {groups && groups.length === 0 && (
        <div style={{
          padding: '24px 14px', textAlign: 'center',
          fontFamily: theme.fontMono, fontSize: theme.sizeLabel, color: theme.textMuted,
          textTransform: 'uppercase', letterSpacing: 1.2,
        }}>
          No inventory targets configured.
        </div>
      )}
    </MenuShell>
  )
}
