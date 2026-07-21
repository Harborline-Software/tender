/**
 * ConsoleTab — 4th tab in the Tender panel (R8 operator-companion IA).
 *
 * Houses the operator management surfaces, separated from the gear menu
 * which is reserved for app preferences (Appearance, Proxy, Account).
 * Per design-review F1.3 + F6: operator management needs a first-class home.
 *
 * Sections (each drills to a detail screen):
 *   - Bundles & Plugins → BundlesDetail (existing Q6 surface)
 *   - Backups           → BackupsDetail (new R8)
 *   - Sync & Relay      → RelayDetail   (new R8)
 *   - Diagnostics       → EngineRoomDetail (existing)
 *
 * Path-A a11y: semantic tokens, WCAG-AA status encoding.
 */
import { useTheme } from '@/theme/ThemeProvider'
import { FiberDivider } from '@/components/FiberDivider'
import { openToolbox } from '@/ipc/tauri'
import type { DetailId } from '@/state/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  onNavigate: (id: DetailId) => void
}

interface MenuEntry {
  id: DetailId
  label: string
  sub: string
  /** Icon character (mono). */
  icon: string
  /** Optional health-state tone: 'healthy' | 'warn' | 'danger' | none */
  tone?: 'healthy' | 'warn' | 'danger'
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CONSOLE_ENTRIES: MenuEntry[] = [
  {
    id: 'bundles',
    label: 'Bundles & Plugins',
    sub: 'Installed bundle manifests · provider health',
    icon: '⬡',
  },
  {
    id: 'model-inventory',
    label: 'Model Inventory',
    sub: 'Installed models across the zoo · Ollama, TTS, ComfyUI',
    icon: '▤',
  },
  {
    id: 'model-residency',
    label: 'Model Residency',
    sub: "What's loaded on the GPU right now · VRAM headline + per-service",
    icon: '◉',
  },
  {
    id: 'paid-compute',
    label: 'Paid Compute',
    sub: 'Gateway spend ledger · OpenRouter, fal, Modal, Recraft balances',
    icon: '$',
  },
  {
    id: 'backups',
    label: 'Backups',
    sub: 'Snapshot DB + vault · restore · key-loss notice',
    icon: '◈',
  },
  {
    id: 'relay',
    label: 'Sync & Relay',
    sub: 'Bridge relay · tailnet · coordination-sync status',
    icon: '↔',
  },
  {
    id: 'engine-room',
    label: 'Diagnostics',
    sub: 'System metrics · logs · collect diagnostics',
    icon: '⚙',
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function ConsoleMenuRow({
  entry,
  onNavigate,
}: {
  entry: MenuEntry
  onNavigate: (id: DetailId) => void
}) {
  const { theme } = useTheme()
  const a = theme.accent
  const toneColor = entry.tone ? theme[entry.tone] : undefined

  // Row = primary in-popup navigation + a trailing deep-link that opens the same
  // surface in the full Toolbox window (dual-surface, shipyard #2973). Two
  // sibling buttons in a hover container — never a button nested in a button.
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        borderBottom: `1px solid ${theme.border}`,
        color: theme.text,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${a}0d` }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <button
        onClick={() => onNavigate(entry.id)}
        style={{
          flex: 1,
          minWidth: 0,
          textAlign: 'left',
          background: 'transparent',
          border: 'none',
          padding: '10px 4px 10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          color: theme.text,
        }}
      >
        {/* Icon */}
        <span style={{
          fontFamily: theme.fontMono,
          fontSize: 14,
          color: toneColor ?? a,
          width: 20,
          textAlign: 'center',
          flexShrink: 0,
        }}>
          {entry.icon}
        </span>

        {/* Label + sub */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: theme.sizeRowTitle,
            fontWeight: 600,
            color: theme.text,
            marginBottom: 2,
          }}>
            {entry.label}
          </div>
          <div style={{
            fontFamily: theme.fontMono,
            fontSize: theme.sizeLabel,
            color: theme.textMuted,
            letterSpacing: 0.6,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {entry.sub}
          </div>
        </div>

        {/* Chevron */}
        <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
          <path d="M4 2L7 5L4 8" stroke={theme.textDim} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Deep-link: open this surface in the full Toolbox window. */}
      <button
        onClick={() => { openToolbox(`console:${entry.id}`).catch(() => {}) }}
        title={`Open ${entry.label} in Toolbox window`}
        aria-label={`Open ${entry.label} in Toolbox window`}
        style={{
          flexShrink: 0,
          background: 'transparent',
          border: 'none',
          borderInlineStart: `1px solid ${theme.border}`,
          padding: '0 10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          color: theme.textMuted,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = a }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = theme.textMuted }}
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
          <rect x="1.6" y="1.6" width="10.8" height="10.8" rx="2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5.5 8.5L9 5M9 5H6.4M9 5V7.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ConsoleTab({ onNavigate }: Props) {
  const { theme } = useTheme()

  return (
    <div>
      <div style={{
        padding: '8px 14px 4px',
        fontFamily: theme.fontMono,
        fontSize: theme.sizeLabel,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        color: theme.textMuted,
      }}>
        ↳ Operator management
      </div>

      <FiberDivider dim />

      {CONSOLE_ENTRIES.map((entry) => (
        <ConsoleMenuRow key={entry.id} entry={entry} onNavigate={onNavigate} />
      ))}

      {/* Footer note */}
      <div style={{
        padding: '8px 14px 10px',
        fontFamily: theme.fontMono,
        fontSize: theme.sizeLabel,
        letterSpacing: 0.8,
        color: theme.textMuted,
        lineHeight: 1.5,
      }}>
        App preferences (appearance, proxy, account) are in the gear menu.
      </div>
    </div>
  )
}
