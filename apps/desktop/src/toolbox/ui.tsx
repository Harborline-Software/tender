// Shared toolbox content-layer primitives (dual-surface, shipyard #2973).
//
// The CHROME is `@shipyard/workspace-shell`'s `WorkspaceShell`. The CONTENT
// inside each module is tender-styled (inline styles over `useTheme()`) so it
// reads as one system with the 13 reused detail screens, all of which consume
// the same palette. These primitives give every module the same row grammar
// and honest empty/placeholder states.
//
// Layout note (CIC design amendment, tender#103): each module's master list now
// portals into the shell's `navigation` region (below the `ModuleSwitcher`),
// while its detail pane renders as the shell's `main` region content — mirroring
// Carrier's switcher-atop-SideNav / Outlet-in-main split. There is no
// `MasterDetail` two-column primitive anymore; the shell's own nav region owns
// that geometry (and its own responsive rail/overlay collapse), so a module only
// supplies `master` (portaled) and `detail` (rendered in place).
import type { ReactNode } from 'react'
import { useTheme } from '@/theme/ThemeProvider'

/** A selectable master-list row (icon · title · sub · optional trailing). */
export function MasterRow({
  icon,
  title,
  sub,
  selected,
  tone,
  trailing,
  onClick,
}: {
  icon?: ReactNode
  title: string
  sub?: string
  selected?: boolean
  tone?: 'healthy' | 'warn' | 'danger'
  trailing?: ReactNode
  onClick: () => void
}) {
  const { theme } = useTheme()
  const a = theme.accent
  const toneColor = tone ? theme[tone] : undefined
  return (
    <button
      onClick={onClick}
      aria-current={selected ? 'true' : undefined}
      style={{
        width: '100%',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        minHeight: 46,
        background: selected ? `${a}1f` : 'transparent',
        border: 'none',
        borderInlineStart: `2px solid ${selected ? a : 'transparent'}`,
        borderBottom: `1px solid ${theme.border}`,
        color: theme.text,
        cursor: 'pointer',
        // product-register: 150ms state-conveying transition only
        transition: 'background 150ms ease',
      }}
      onMouseEnter={(e) => {
        if (!selected) (e.currentTarget as HTMLElement).style.background = `${a}0d`
      }}
      onMouseLeave={(e) => {
        if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      {icon !== undefined && (
        <span
          aria-hidden
          style={{
            width: 18,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // One-Accent Rule (design-review D2, tender#103): blue is
            // action/selection ONLY — a static master-row icon is neither, so it
            // defaults to neutral, mirroring the nav rail's own pattern
            // (`active ? accent : textMuted`). `tone` (health) still wins when set.
            color: toneColor ?? (selected ? a : theme.textMuted),
          }}
        >
          {icon}
        </span>
      )}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: theme.sizeRowTitle,
            fontWeight: 600,
            color: theme.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </span>
        {sub && (
          <span
            style={{
              display: 'block',
              fontFamily: theme.fontMono,
              fontSize: theme.sizeLabel,
              letterSpacing: 0.6,
              color: theme.textMuted,
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {sub}
          </span>
        )}
      </span>
      {trailing}
    </button>
  )
}

/** A section-list uppercase header, matching the popup's row grammar. */
export function MasterHeader({ label, count }: { label: string; count?: string }) {
  const { theme } = useTheme()
  return (
    <div
      style={{
        padding: '10px 12px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        position: 'sticky',
        top: 0,
        background: theme.bg,
        borderBottom: `1px solid ${theme.border}`,
        zIndex: 1,
      }}
    >
      <span
        style={{
          fontFamily: theme.fontMono,
          fontSize: theme.sizeLabel,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          color: theme.textMuted,
        }}
      >
        {label}
      </span>
      {count && (
        <span
          style={{
            fontFamily: theme.fontMono,
            fontSize: theme.sizeLabel,
            letterSpacing: 0.8,
            // accentText (design-review D1, tender#103): accent-as-text needs the
            // AA-pass shade, not the border/fill/icon `accent` value.
            color: theme.accentText,
          }}
        >
          {count}
        </span>
      )}
    </div>
  )
}

/** A detail-pane header for bespoke panes (reused detail screens carry their own). */
export function PaneHeader({
  title,
  sub,
  onBack,
  actions,
}: {
  title: string
  sub?: string
  onBack?: () => void
  actions?: ReactNode
}) {
  const { theme } = useTheme()
  const a = theme.accent
  return (
    <div
      style={{
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderBottom: `1px solid ${theme.border}`,
        background: `linear-gradient(180deg, ${theme.bgSoft} 0%, ${theme.bg} 100%)`,
        position: 'sticky',
        top: 0,
        zIndex: 1,
      }}
    >
      {onBack && (
        <button
          onClick={onBack}
          title="Back"
          aria-label="Back to list"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 4,
            display: 'flex',
            color: theme.text,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${a}22` }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
            <path d="M9 2 L 4 7 L 9 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 0.2, color: theme.text }}>{title}</div>
        {sub && (
          <div
            style={{
              fontFamily: theme.fontMono,
              fontSize: theme.sizeLabel,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: theme.textMuted,
              marginTop: 4,
            }}
          >
            {sub}
          </div>
        )}
      </div>
      {actions}
    </div>
  )
}

/**
 * The empty detail-pane placeholder shown in wide layout when nothing is
 * selected. Teaches (never a bare "nothing here"): names the primary action.
 *
 * `sectionTitle`/`sectionHint`/`statusChip` (CIC amendment, tender#103 fix pass
 * 2 — parity item 4): renders the same content-region header row Carrier gives
 * every main region (title + subtitle, right-aligned status chip) so the EMPTY
 * state isn't a headerless void — reuses `PaneHeader` so populated and empty
 * states share one header treatment.
 */
export function DetailPlaceholder({
  icon,
  message,
  sectionTitle,
  sectionHint,
  statusChip,
}: {
  icon?: ReactNode
  message: string
  sectionTitle?: string
  sectionHint?: string
  statusChip?: ReactNode
}) {
  const { theme } = useTheme()
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {sectionTitle && <PaneHeader title={sectionTitle} sub={sectionHint} actions={statusChip} />}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 32,
          textAlign: 'center',
        }}
      >
        {icon && <div aria-hidden style={{ color: theme.textMuted, opacity: 0.7 }}>{icon}</div>}
        <div
          style={{
            // Register (DESIGN.md, CIC amendment tender#103 fix pass 2 — parity
            // item 6): this is PROSE, not a data value/label — mono is reserved
            // for values/metrics; ambient copy uses the Inter row font.
            fontFamily: theme.fontRow,
            fontSize: theme.sizeBody,
            color: theme.textMuted,
            maxWidth: 320,
            lineHeight: 1.6,
          }}
        >
          {message}
        </div>
      </div>
    </div>
  )
}

/** A teaching empty state for a master list with no items. */
export function EmptyState({ title, hint }: { title: string; hint: string }) {
  const { theme } = useTheme()
  return (
    <div style={{ padding: '28px 18px', textAlign: 'center' }}>
      <div
        style={{
          fontFamily: theme.fontMono,
          fontSize: theme.sizeLabel,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          color: theme.textMuted,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: theme.fontRow,
          fontSize: theme.sizeBody,
          color: theme.textDim,
          lineHeight: 1.6,
          maxWidth: 260,
          margin: '0 auto',
        }}
      >
        {hint}
      </div>
    </div>
  )
}

/** Skeleton rows for the loading state (skeletons, never spinners). */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  const { theme } = useTheme()
  return (
    <div role="status" aria-label="Loading…">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            padding: '11px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            minHeight: 46,
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: 99, background: theme.border }} />
          <div style={{ flex: 1 }}>
            <div style={{ width: '50%', height: 10, borderRadius: 3, background: theme.border, marginBottom: 6 }} />
            <div style={{ width: '32%', height: 8, borderRadius: 3, background: `${theme.border}88` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
