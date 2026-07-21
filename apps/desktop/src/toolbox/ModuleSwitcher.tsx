import { useEffect, useRef, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useTheme } from '@/theme/ThemeProvider'

export interface ModuleSwitcherSection {
  id: string
  label: string
  hint: string
  icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>
}

/**
 * ModuleSwitcher — the top-of-sidebar module dropdown (CIC design amendment,
 * tender#103): mirrors Carrier's `WorkspaceSwitcher`
 * (shipyard/apps/carrier/src/navigation/WorkspaceSwitcher.tsx) — a quiet
 * dropdown trigger (icon + current module label + chevron) sitting above the
 * active module's own list, rather than a flat rail of module buttons.
 *
 * Carrier's switcher is a CARRIER-LOCAL composition over `@shipyard/ui-react`'s
 * `Popover`/`Tooltip` primitives — it is not something `@shipyard/workspace-shell`
 * itself provides as a slot. tender does not depend on ui-react (the dual-surface
 * chrome consumes only `@shipyard/workspace-shell`), so this hand-rolls the same
 * composition pattern with plain React + the same accessibility contract Carrier's
 * Radix-backed version gets for free: `aria-haspopup="listbox"` +
 * `aria-expanded` on the trigger, `role="listbox"`/`role="option"`/
 * `aria-selected` on the panel, Escape-to-close + focus-return-to-trigger, and
 * click-outside-to-close.
 *
 * One-Accent Rule: the active option is the only accent-tinted row (selection),
 * exactly like `MasterRow`'s own selected treatment one file over.
 */
export function ModuleSwitcher({
  sections,
  activeId,
  onSwitch,
}: {
  sections: readonly ModuleSwitcherSection[]
  activeId: string
  onSwitch: (id: string) => void
}) {
  const { theme } = useTheme()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const active = sections.find((s) => s.id === activeId) ?? sections[0]
  const ActiveIcon = active.icon

  // Click-outside + Escape close (the two behaviors Radix's Popover gives
  // Carrier's version for free) — only wired while open, so this never adds a
  // permanent document listener.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const listboxId = 'toolbox-module-switcher-listbox'

  return (
    <div ref={rootRef} style={{ position: 'relative', padding: 8 }}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          width: '100%',
          padding: '8px 10px',
          borderRadius: 7,
          border: `1px solid ${theme.border}`,
          background: theme.surface,
          color: theme.text,
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: theme.fontRow,
          transition: 'background 150ms ease',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = theme.bgSoft }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = theme.surface }}
      >
        <ActiveIcon size={16} aria-hidden />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: theme.sizeRowTitle, fontWeight: 600 }}>{active.label}</span>
          <span
            style={{
              display: 'block',
              fontFamily: theme.fontMono,
              fontSize: theme.sizeLabel,
              letterSpacing: 0.6,
              color: theme.textMuted,
              marginTop: 1,
            }}
          >
            {active.hint}
          </span>
        </span>
        <ChevronsUpDown size={14} aria-hidden style={{ color: theme.textMuted, flexShrink: 0 }} />
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Toolbox modules"
          style={{
            position: 'absolute',
            insetInlineStart: 8,
            insetInlineEnd: 8,
            top: '100%',
            marginTop: 4,
            zIndex: 10,
            listStyle: 'none',
            padding: 4,
            margin: 0,
            borderRadius: 8,
            border: `1px solid ${theme.border}`,
            background: theme.bg,
            boxShadow: `0 12px 30px ${theme.shadow}`,
          }}
        >
          {sections.map((s) => {
            const isActive = s.id === active.id
            const Icon = s.icon
            return (
              <li key={s.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    setOpen(false)
                    if (!isActive) onSwitch(s.id)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: 'none',
                    // One-Accent Rule: the active option is the only accent-tinted
                    // row here (selection) — same treatment as MasterRow.
                    background: isActive ? `${theme.accent}1f` : 'transparent',
                    color: theme.text,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: theme.fontRow,
                    fontSize: theme.sizeBody,
                  }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = theme.bgSoft }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <Icon size={15} aria-hidden />
                  <span style={{ flex: 1, minWidth: 0 }}>{s.label}</span>
                  {isActive && <Check size={14} aria-hidden style={{ color: theme.accent, flexShrink: 0 }} />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
