/**
 * ModelResidencyDetail — VRAM RESIDENCY pane: what is loaded on the GPU
 * right now.
 *
 * Toolbox #137, ONR harness-landscape survey slice G2
 * (`_shared/research/onr-ai-harness-landscape-2026-07-07.md` §3). WRAPs
 * `nvidia-smi` (aggregate headline + per-PID compute-apps list) and each
 * backend's own "what's loaded" endpoint (Ollama `/api/ps` — the one
 * confirmed source), and BUILDs the PID → model → registry-service
 * correlation — the #51 arbiter's reconciliation loop (§4.4) surfaced as a
 * pane (`residency.rs`).
 *
 * Honest states, never a guessed "loaded" (the G1/G2 honesty doctrine):
 *   - `loaded`       — a model is confirmed warm (backend-self-reported or
 *                       GPU-process-correlated).
 *   - `idle`          — the backend was reached; confirmed nothing loaded.
 *   - `unreachable`   — the backend/host could not be reached at all.
 *   - `unknown`       — reachable (or GPU-detected), but this backend has
 *                       no confirmed "what's loaded" signal (e.g. TTS).
 *
 * The GPU-accounting-drift finding (#51 §4.4) surfaces here as
 * `unattributedVramMb` — the gap between the aggregate `nvidia-smi` used
 * figure and the sum of every row's own known VRAM, never a claim of
 * enforcement.
 *
 * Manual refresh, not polled — an SSH round-trip per probe; matches the
 * G1 Model Inventory pane's own no-background-polling convention.
 */
import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { MenuShell } from '@/components/MenuShell'
import { DetailHeader } from '@/components/DetailHeader'
import { StatusPill } from '@/components/StatusPill'
import { FiberDivider } from '@/components/FiberDivider'
import { getGpuResidency } from '@/ipc/tauri'
import type { GpuResidencySnapshot, ResidencyRow, ResidencyStatus } from '@/state/types'

interface Props {
  onBack: () => void
}

function fmtMb(mb: number | null): string {
  if (mb === null) return '—'
  if (mb < 1024) return `${mb} MB`
  return `${(mb / 1024).toFixed(1)} GB`
}

function statusTone(theme: ReturnType<typeof useTheme>['theme'], status: ResidencyStatus): string {
  switch (status) {
    case 'loaded': return theme.healthy
    case 'idle': return theme.textMuted
    case 'unreachable': return theme.danger
    case 'unknown': return theme.warn
  }
}

function statusLabel(status: ResidencyStatus): string {
  switch (status) {
    case 'loaded': return 'loaded'
    case 'idle': return 'idle'
    case 'unreachable': return 'unreachable'
    case 'unknown': return 'unknown'
  }
}

export function ModelResidencyDetail({ onBack }: Props) {
  const { theme } = useTheme()
  const a = theme.accent

  const [snapshot, setSnapshot] = useState<GpuResidencySnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(() => {
    setLoading(true)
    getGpuResidency()
      .then((s) => { setSnapshot(s); setError(null) })
      .catch((e: unknown) => {
        setError(typeof e === 'string' ? e : 'Could not read GPU residency')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const loadedCount = snapshot?.rows.filter((r) => r.status === 'loaded').length ?? 0
  const usedPct = snapshot && snapshot.gpu.totalVramMb > 0
    ? Math.round((snapshot.gpu.usedVramMb / snapshot.gpu.totalVramMb) * 100)
    : null

  return (
    <MenuShell>
      <DetailHeader
        title="Model Residency"
        sub="What's loaded on the GPU · right now"
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

      {/* Loading (first fetch) */}
      {snapshot === null && !error && (
        <div style={{
          padding: '24px 14px', textAlign: 'center',
          fontFamily: theme.fontMono, fontSize: theme.sizeLabel, color: theme.textMuted,
          textTransform: 'uppercase', letterSpacing: 1.2,
        }}>
          Reading the GPU…
        </div>
      )}

      {/* Hard error (the command itself failed) */}
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
              Residency unavailable
            </div>
            <div style={{ fontFamily: theme.fontRow, fontSize: theme.sizeBody, color: theme.textDim, lineHeight: 1.5 }}>
              {error}
            </div>
          </div>
        </div>
      )}

      {snapshot && (
        <>
          {/* GPU headline */}
          <div style={{ padding: '8px 14px 10px' }}>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6,
            }}>
              <span style={{
                fontFamily: theme.fontMono, fontSize: theme.sizeLabel, letterSpacing: 1.4,
                textTransform: 'uppercase', color: theme.textMuted,
              }}>
                ↳ {fmtMb(snapshot.gpu.usedVramMb)} / {fmtMb(snapshot.gpu.totalVramMb)} used
                {usedPct !== null ? ` · ${usedPct}%` : ''}
              </span>
              <span style={{
                fontFamily: theme.fontMono, fontSize: theme.sizeLabel, color: theme.text, letterSpacing: 0.3,
              }}>
                {fmtMb(snapshot.gpu.freeVramMb)} free
              </span>
            </div>

            {/* Usage bar */}
            <div style={{
              height: 5, borderRadius: 3, background: theme.border, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${usedPct ?? 0}%`,
                background: (usedPct ?? 0) > 90 ? theme.danger : (usedPct ?? 0) > 70 ? theme.warn : a,
                transition: 'width 300ms ease',
              }} />
            </div>

            {!snapshot.perProcessAttributionAvailable && (
              <div style={{
                marginTop: 6,
                fontFamily: theme.fontRow, fontSize: theme.sizeBody, color: theme.textMuted,
                lineHeight: 1.4,
              }}>
                This driver doesn't report per-process VRAM — per-row figures come from each
                backend's own numbers where available, not nvidia-smi.
              </div>
            )}

            {snapshot.unattributedVramMb !== null && snapshot.unattributedVramMb > 0 && (
              <div style={{
                marginTop: 6, padding: '7px 10px', borderRadius: 4,
                background: `${theme.warn}12`, border: `1px solid ${theme.warn}33`,
                fontFamily: theme.fontRow, fontSize: theme.sizeBody, color: theme.textDim, lineHeight: 1.4,
              }}>
                {fmtMb(snapshot.unattributedVramMb)} used on the GPU isn't accounted for by any
                known service — someone may be running a GPU job outside the Toolbox.
              </div>
            )}
          </div>

          <FiberDivider dim />

          {/* Summary line */}
          <div style={{
            padding: '8px 14px 4px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{
              fontFamily: theme.fontMono, fontSize: theme.sizeLabel, letterSpacing: 1.4,
              textTransform: 'uppercase', color: theme.textMuted,
            }}>
              ↳ {loadedCount} loaded · {snapshot.rows.length} service{snapshot.rows.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Per-service rows */}
          {snapshot.rows.map((row) => (
            <ResidencyRowView key={row.serviceId} row={row} theme={theme} accent={a} />
          ))}

          {snapshot.rows.length === 0 && (
            <div style={{
              padding: '24px 14px', textAlign: 'center',
              fontFamily: theme.fontMono, fontSize: theme.sizeLabel, color: theme.textMuted,
              textTransform: 'uppercase', letterSpacing: 1.2,
            }}>
              No residency targets configured.
            </div>
          )}
        </>
      )}
    </MenuShell>
  )
}

function ResidencyRowView({
  row, theme, accent,
}: {
  row: ResidencyRow
  theme: ReturnType<typeof useTheme>['theme']
  accent: string
}) {
  const tone = statusTone(theme, row.status)
  return (
    <div>
      <div style={{
        padding: '10px 14px 6px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: theme.sizeRowTitle, fontWeight: 600, color: theme.text }}>
            {row.displayName}
          </div>
          {row.modelName && (
            <div style={{
              fontFamily: theme.fontMono, fontSize: theme.sizeLabel, color: theme.textMuted,
              letterSpacing: 0.3, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {row.modelName}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {row.vramMb !== null && (
            <span style={{
              fontFamily: theme.fontMono, fontSize: theme.sizeMetric, color: accent, letterSpacing: 0.3,
            }}>
              {fmtMb(row.vramMb)}
            </span>
          )}
          <StatusPill text={statusLabel(row.status)} tone={tone} />
        </div>
      </div>

      {row.since && (
        <div style={{
          padding: '0 14px 6px',
          fontFamily: theme.fontMono, fontSize: theme.sizeLabel, color: theme.textMuted, letterSpacing: 0.3,
        }}>
          expires {row.since}
        </div>
      )}

      {row.status !== 'loaded' && row.detail && (
        <div style={{
          margin: '0 14px 8px',
          padding: '7px 10px',
          borderRadius: 4,
          background: `${tone}12`,
          border: `1px solid ${tone}33`,
          fontFamily: theme.fontRow, fontSize: theme.sizeBody, color: theme.textDim,
          lineHeight: 1.4,
        }}>
          {row.detail}
        </div>
      )}

      <FiberDivider dim />
    </div>
  )
}
