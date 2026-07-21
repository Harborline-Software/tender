// Shared toolbox content-layer primitives (dual-surface, shipyard #2973).
//
// The CHROME is ui-react (AppLayout / SideNav / AppBar). The CONTENT inside each
// section is tender-styled (inline styles over `useTheme()`) so it reads as one
// system with the 13 reused detail screens, all of which consume the same
// palette. These primitives give every section the same master-detail geometry,
// row grammar, and honest empty/placeholder states.
import React from 'react'
import { useTheme } from '@/theme/ThemeProvider'

/** Two-column master-detail; folds to a single column when `narrow`. */
export function MasterDetail({
  master,
  detail,
  narrow,
  hasSelection,
  masterLabel,
}: {
  master: React.ReactNode
  detail: React.ReactNode
  narrow: boolean
  hasSelection: boolean
  masterLabel: string
}) {
  const { theme } = useTheme()

  if (narrow) {
    // One column at a time. The detail pane carries its own back affordance
    // (the reused detail screens' DetailHeader, or PaneHeader here).
    return (
      <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {hasSelection ? detail : (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>{master}</div>
        )}
      </div>
    )
  }

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex' }}>
      <aside
        aria-label={masterLabel}
        style={{
          width: 300,
          flexShrink: 0,
          minHeight: 0,
          overflowY: 'auto',
          borderInlineEnd: `1px solid ${theme.border}`,
          background: theme.bg,
        }}
      >
        {master}
      </aside>
      <section style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto', background: theme.bg }}>
        {detail}
      </section>
    </div>
  )
}

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
  icon?: React.ReactNode
  title: string
  sub?: string
  selected?: boolean
  tone?: 'healthy' | 'warn' | 'danger'
  trailing?: React.ReactNode
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
            color: toneColor ?? a,
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
            color: theme.accent,
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
  actions?: React.ReactNode
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
 */
export function DetailPlaceholder({ icon, message }: { icon?: React.ReactNode; message: string }) {
  const { theme } = useTheme()
  return (
    <div
      style={{
        height: '100%',
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
          fontFamily: theme.fontMono,
          fontSize: theme.sizeBody,
          letterSpacing: 0.6,
          color: theme.textMuted,
          maxWidth: 320,
          lineHeight: 1.6,
        }}
      >
        {message}
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
