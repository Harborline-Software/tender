/**
 * PaidComputeDetail — the PAID-COMPUTE pane: what the fleet's paid compute
 * costs, in one place.
 *
 * Toolbox #137, ONR harness-landscape survey slice G3
 * (`_shared/research/onr-ai-harness-landscape-2026-07-07.md` §3). The one thing
 * nothing off-the-shelf provides: a cross-provider balance/usage view. Two
 * regions in one pane (`paidcompute.rs`):
 *
 *   1. **Gateway ledger** — the Bifrost internal gateway's per-virtual-key
 *      usage-vs-budget. This is the AUTHORITATIVE gateway-routed spend (what the
 *      fleet's tools actually spent through the gateway), distinct from a
 *      provider's account balance (CIC ruling / survey §5 Q5). Real, live data.
 *   2. **Provider roster** — OpenRouter + fal (WRAP-API tiles, read via a
 *      read-only balance key that lives ONLY on winhub — the audience-
 *      segregation wall; an empty slot → honest `notConfigured`), plus Modal +
 *      Recraft (DEEP-LINK tiles: no balance API at the fleet's tier, so an
 *      honest "balance on provider dashboard" + a click-through, never a fake
 *      number).
 *
 * Honest states, never a fabricated balance — mirrors G1's InventoryStatus and
 * G2's ResidencyStatus vocabulary. Manual refresh (an SSH round-trip per key
 * slot + a Tailscale HTTP read), matching the G1/G2 no-background-polling panes.
 */
import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { MenuShell } from '@/components/MenuShell'
import { DetailHeader } from '@/components/DetailHeader'
import { StatusPill } from '@/components/StatusPill'
import { FiberDivider } from '@/components/FiberDivider'
import { getPaidCompute, openExternal } from '@/ipc/tauri'
import type { PaidComputeSnapshot, VkeyRow, ProviderTile, ProviderStatus } from '@/state/types'

interface Props {
  onBack: () => void
}

function fmtMoney(amount: number, unit: string): string {
  if (unit === 'USD') return `$${amount.toFixed(2)}`
  return `${amount % 1 === 0 ? amount : amount.toFixed(2)} ${unit}`
}

function providerTone(theme: ReturnType<typeof useTheme>['theme'], status: ProviderStatus): string {
  switch (status) {
    case 'ok': return theme.healthy
    case 'notConfigured': return theme.textMuted
    case 'unreachable': return theme.danger
    case 'dashboardOnly': return theme.accent
  }
}

function providerLabel(status: ProviderStatus): string {
  switch (status) {
    case 'ok': return 'live'
    case 'notConfigured': return 'not configured'
    case 'unreachable': return 'unreachable'
    case 'dashboardOnly': return 'dashboard only'
  }
}

export function PaidComputeDetail({ onBack }: Props) {
  const { theme } = useTheme()
  const a = theme.accent

  const [snapshot, setSnapshot] = useState<PaidComputeSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(() => {
    setLoading(true)
    getPaidCompute()
      .then((s) => { setSnapshot(s); setError(null) })
      .catch((e: unknown) => {
        setError(typeof e === 'string' ? e : 'Could not read paid-compute status')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const ledger = snapshot?.gatewayLedger

  return (
    <MenuShell>
      <DetailHeader
        title="Paid Compute"
        sub="Gateway spend · provider balances"
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
          Reading the ledger…
        </div>
      )}

      {/* Hard error (the command itself failed) */}
      {error && (
        <div style={{ padding: '10px 14px' }}>
          <div role="alert" style={{
            background: `${theme.danger}1a`, border: `1px solid ${theme.danger}44`,
            borderRadius: theme.radiusLg, padding: '10px 12px',
          }}>
            <div style={{
              fontFamily: theme.fontMono, fontSize: theme.sizeLabel, letterSpacing: 1.2,
              color: theme.danger, textTransform: 'uppercase', marginBottom: 5,
            }}>
              Paid compute unavailable
            </div>
            <div style={{ fontFamily: theme.fontRow, fontSize: theme.sizeBody, color: theme.textDim, lineHeight: 1.5 }}>
              {error}
            </div>
          </div>
        </div>
      )}

      {snapshot && ledger && (
        <>
          {/* ── Gateway ledger ─────────────────────────────────────────────── */}
          <div style={{ padding: '8px 14px 4px' }}>
            <div style={{
              fontFamily: theme.fontMono, fontSize: theme.sizeLabel, letterSpacing: 1.4,
              textTransform: 'uppercase', color: theme.textMuted,
            }}>
              ↳ Gateway ledger · authoritative routed spend
            </div>
            <div style={{
              fontFamily: theme.fontMono, fontSize: theme.sizeLabel, color: theme.textMuted,
              letterSpacing: 0.3, marginTop: 2,
            }}>
              {ledger.host}
            </div>
          </div>

          {ledger.status === 'unreachable' && (
            <div style={{
              margin: '6px 14px 8px', padding: '7px 10px', borderRadius: 4,
              background: `${theme.danger}12`, border: `1px solid ${theme.danger}33`,
              fontFamily: theme.fontRow, fontSize: theme.sizeBody, color: theme.textDim, lineHeight: 1.4,
            }}>
              {ledger.detail ?? 'The internal gateway could not be reached.'}
            </div>
          )}

          {ledger.status === 'ok' && ledger.rows.map((row) => (
            <VkeyRowView key={row.id} row={row} theme={theme} accent={a} />
          ))}

          {ledger.status === 'ok' && ledger.rows.length === 0 && (
            <div style={{
              margin: '0 14px 8px', padding: '7px 10px',
              fontFamily: theme.fontMono, fontSize: theme.sizeLabel, color: theme.textMuted, letterSpacing: 0.6,
            }}>
              Gateway reachable — no virtual keys configured.
            </div>
          )}

          <FiberDivider dim />

          {/* ── Provider roster ────────────────────────────────────────────── */}
          <div style={{
            padding: '8px 14px 4px',
            fontFamily: theme.fontMono, fontSize: theme.sizeLabel, letterSpacing: 1.4,
            textTransform: 'uppercase', color: theme.textMuted,
          }}>
            ↳ Paid providers
          </div>

          {snapshot.providers.map((tile) => (
            <ProviderTileView key={tile.id} tile={tile} theme={theme} accent={a} />
          ))}

          {/* Doctrine footer — the survey's single failure mode + the wall */}
          <div style={{
            padding: '8px 14px 12px',
            fontFamily: theme.fontMono, fontSize: theme.sizeLabel, letterSpacing: 0.6,
            color: theme.textMuted, lineHeight: 1.5,
          }}>
            Balance keys live only on winhub (never on this Mac). Keep provider
            auto-top-up OFF — a runaway loop can't silently recharge.
          </div>
        </>
      )}
    </MenuShell>
  )
}

// ── Gateway ledger row ────────────────────────────────────────────────────────

function VkeyRowView({
  row, theme, accent,
}: {
  row: VkeyRow
  theme: ReturnType<typeof useTheme>['theme']
  accent: string
}) {
  const b = row.budget
  const pct = b && b.maxLimit > 0 ? Math.min(100, Math.round((b.currentUsage / b.maxLimit) * 100)) : null
  const barColor = (pct ?? 0) > 90 ? theme.danger : (pct ?? 0) > 70 ? theme.warn : accent

  return (
    <div>
      <div style={{
        padding: '10px 14px 6px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: theme.sizeRowTitle, fontWeight: 600, color: theme.text }}>
            {row.name}
          </div>
          <div style={{
            fontFamily: theme.fontMono, fontSize: theme.sizeLabel, color: theme.textMuted,
            letterSpacing: 0.3, marginTop: 2,
          }}>
            {b ? `resets every ${b.resetDuration}` : 'no budget configured'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {b && (
            <span style={{
              fontFamily: theme.fontMono, fontSize: theme.sizeMetric, color: accent, letterSpacing: 0.3,
            }}>
              ${b.currentUsage.toFixed(2)} / ${b.maxLimit.toFixed(2)}
            </span>
          )}
          {!row.isActive && <StatusPill text="inactive" tone={theme.textMuted} />}
        </div>
      </div>

      {/* Budget bar */}
      {b && pct !== null && (
        <div style={{ padding: '0 14px 8px' }}>
          <div style={{ height: 5, borderRadius: 3, background: theme.border, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${pct}%`, background: barColor, transition: 'width 300ms ease',
            }} />
          </div>
        </div>
      )}

      <FiberDivider dim />
    </div>
  )
}

// ── Provider tile ─────────────────────────────────────────────────────────────

function ProviderTileView({
  tile, theme, accent,
}: {
  tile: ProviderTile
  theme: ReturnType<typeof useTheme>['theme']
  accent: string
}) {
  const tone = providerTone(theme, tile.status)

  return (
    <div>
      <div style={{
        padding: '10px 14px 6px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: theme.sizeRowTitle, fontWeight: 600, color: theme.text }}>
            {tile.displayName}
          </div>
          {tile.status === 'ok' && (tile.balance !== null || tile.usage !== null) && (
            <div style={{
              fontFamily: theme.fontMono, fontSize: theme.sizeLabel, color: theme.textMuted,
              letterSpacing: 0.3, marginTop: 2,
            }}>
              {tile.balance !== null && `${fmtMoney(tile.balance, tile.unit)} left`}
              {tile.balance !== null && tile.usage !== null && ' · '}
              {tile.usage !== null && `${fmtMoney(tile.usage, tile.unit)} used`}
            </div>
          )}
        </div>
        <StatusPill text={providerLabel(tile.status)} tone={tone} />
      </div>

      {/* Honest non-live detail (never a fabricated balance) */}
      {tile.status !== 'ok' && tile.detail && (
        <div style={{
          margin: '0 14px 8px', padding: '7px 10px', borderRadius: 4,
          background: `${tone}12`, border: `1px solid ${tone}33`,
          fontFamily: theme.fontRow, fontSize: theme.sizeBody, color: theme.textDim, lineHeight: 1.4,
        }}>
          {tile.detail}
        </div>
      )}

      {/* Click-through to the provider account / subscription page */}
      <div style={{ padding: '0 14px 8px' }}>
        <button
          onClick={() => { void openExternal(tile.subscriptionUrl) }}
          style={{
            background: 'transparent', border: `1px solid ${accent}44`, borderRadius: 4,
            padding: '4px 9px', cursor: 'pointer', color: accent,
            fontFamily: theme.fontMono, fontSize: theme.sizeLabel, letterSpacing: 0.6,
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${accent}12` }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          {tile.kind === 'deepLink' ? 'Open dashboard' : 'Manage account'}
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <FiberDivider dim />
    </div>
  )
}
