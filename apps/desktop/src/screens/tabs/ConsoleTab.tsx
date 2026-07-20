/**
 * ConsoleTab — 4th tab in the Tender panel (R8 operator-companion IA).
 *
 * Houses the operator management surfaces, separated from the gear menu
 * which is reserved for app preferences (Appearance, Proxy, Account).
 *
 * 2026-07 UI refresh (#98): the 7 flat rows were regrouped into 3 labeled
 * sections (Models & Compute / Data & Sync / System) so the tab stops reading
 * as an undifferentiated list, and the ad-hoc unicode glyphs were replaced with
 * lucide icons to match the design-system icon standard (DESIGN.md).
 *
 * Path-A a11y: semantic tokens, WCAG-AA status encoding.
 */
import { useTheme } from '@/theme/ThemeProvider'
import { FiberDivider } from '@/components/FiberDivider'
import {
  Database,
  Cpu,
  CircleDollarSign,
  Archive,
  ArrowLeftRight,
  Package,
  Activity,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import type { DetailId } from '@/state/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  onNavigate: (id: DetailId) => void
}

interface MenuEntry {
  id: DetailId
  label: string
  sub: string
  Icon: LucideIcon
  /** Optional health-state tone: 'healthy' | 'warn' | 'danger' | none */
  tone?: 'healthy' | 'warn' | 'danger'
}

interface MenuGroup {
  title: string
  entries: MenuEntry[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CONSOLE_GROUPS: MenuGroup[] = [
  {
    title: 'Models & Compute',
    entries: [
      { id: 'model-inventory', label: 'Model Inventory', sub: 'Installed models across the zoo · Ollama, TTS, ComfyUI', Icon: Database },
      { id: 'model-residency', label: 'Model Residency', sub: "What's loaded on the GPU right now · VRAM + per-service", Icon: Cpu },
      { id: 'paid-compute', label: 'Paid Compute', sub: 'Gateway spend ledger · OpenRouter, fal, Modal, Recraft', Icon: CircleDollarSign },
    ],
  },
  {
    title: 'Data & Sync',
    entries: [
      { id: 'backups', label: 'Backups', sub: 'Snapshot DB + vault · restore · key-loss notice', Icon: Archive },
      { id: 'relay', label: 'Sync & Relay', sub: 'Bridge relay · tailnet · coordination-sync status', Icon: ArrowLeftRight },
    ],
  },
  {
    title: 'System',
    entries: [
      { id: 'bundles', label: 'Bundles & Plugins', sub: 'Installed bundle manifests · provider health', Icon: Package },
      { id: 'engine-room', label: 'Diagnostics', sub: 'System metrics · logs · collect diagnostics', Icon: Activity },
    ],
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const { theme } = useTheme()
  return (
    <div style={{
      padding: `${theme.space[4]}px ${theme.space[5]}px ${theme.space[2]}px`,
      fontFamily: theme.fontMono,
      fontSize: theme.sizeLabel,
      letterSpacing: 1.3,
      textTransform: 'uppercase',
      color: theme.textMuted,
    }}>
      {title}
    </div>
  )
}

function ConsoleMenuRow({ entry, onNavigate }: { entry: MenuEntry; onNavigate: (id: DetailId) => void }) {
  const { theme } = useTheme()
  const a = theme.accent
  const toneColor = entry.tone ? theme[entry.tone] : a
  const { Icon } = entry

  return (
    <button
      onClick={() => onNavigate(entry.id)}
      style={{
        width: '100%',
        textAlign: 'left',
        background: 'transparent',
        border: 'none',
        borderBottom: `1px solid ${theme.border}`,
        padding: `${theme.space[4]}px ${theme.space[5]}px`,
        display: 'flex',
        alignItems: 'center',
        gap: theme.space[4],
        cursor: 'pointer',
        color: theme.text,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${a}0d` }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {/* Icon */}
      <span style={{ display: 'flex', width: 22, justifyContent: 'center', flexShrink: 0, color: toneColor }}>
        <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
      </span>

      {/* Label + sub */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: theme.sizeRowTitle, fontWeight: 600, color: theme.text, marginBottom: 2 }}>
          {entry.label}
        </div>
        <div style={{
          fontFamily: theme.fontMono,
          fontSize: theme.sizeLabel,
          color: theme.textMuted,
          letterSpacing: 0.5,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {entry.sub}
        </div>
      </div>

      {/* Chevron */}
      <span style={{ display: 'flex', flexShrink: 0, color: theme.textDim }}>
        <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
      </span>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ConsoleTab({ onNavigate }: Props) {
  const { theme } = useTheme()

  return (
    <div>
      {CONSOLE_GROUPS.map((group, gi) => (
        <div key={group.title}>
          {gi > 0 && <FiberDivider dim />}
          <SectionHeader title={group.title} />
          {group.entries.map((entry) => (
            <ConsoleMenuRow key={entry.id} entry={entry} onNavigate={onNavigate} />
          ))}
        </div>
      ))}

      {/* Footer note */}
      <div style={{
        padding: `${theme.space[4]}px ${theme.space[5]}px`,
        fontFamily: theme.fontMono,
        fontSize: theme.sizeLabel,
        letterSpacing: 0.6,
        color: theme.textMuted,
        lineHeight: 1.5,
      }}>
        App preferences (appearance, proxy, account) are in the gear menu.
      </div>
    </div>
  )
}
