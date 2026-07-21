import { useEffect, useRef, useState } from 'react'
import { useTheme, type ThemePreference } from '@/theme/ThemeProvider'

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' },
]

/**
 * AvatarMenu — the Toolbox main window's identity-chip popup (CIC amendment,
 * tender#103 fix pass 4). Mirrors Carrier's actual avatar-menu composition
 * (`shipyard/apps/carrier/src/app.tsx` menuItems, `UserMenu` /
 * `ThemeToggle`) — same order, same aria-menu semantics — mapped HONESTLY
 * onto what the Toolbox actually has:
 *
 *  - Identity header: local operator (hostname) + "Local account" — the
 *    Toolbox has no accounts, so this is genuinely all there is.
 *  - Theme: segmented Light / System / Dark (`role="radiogroup"` +
 *    `role="menuitemradio"`, matching Carrier's `ThemeToggle`) — REPLACES the
 *    bare appearance-mode indicator from fix pass 3 (Carrier doesn't render
 *    theme as a separate header icon either; it lives in this menu).
 *  - Language: OMITTED — the Toolbox has no locale switching to offer, unlike
 *    Carrier's i18n surface. Faking a language item would be a dead control.
 *  - Settings → the one settings surface that actually exists and is wired
 *    (Appearance & behavior, reusing the existing `DockSettingsDetail`
 *    screen — same component the tray's gear menu already routes to).
 *    "Proxy settings" has no implemented screen anywhere in this app yet
 *    (the tray's own gear-menu entry for it is a pre-existing dead item), so
 *    no second destination is fabricated for it here.
 *  - About Harborline Toolbox → a small new honest About panel (real
 *    version/mode, PRODUCT.md's own purpose sentence — nothing invented).
 *  - Sign in… → included, DISABLED, with Carrier's own verbatim copy for the
 *    same cross-fleet "not yet available" cloud-tier concept
 *    (`shipyard/apps/carrier/src/i18n/locales/en-US.ts` `userMenu.signIn` /
 *    `signInSubtitle`) — sourceable from real product doctrine, not invented,
 *    and rendered inert exactly like Carrier's own disabled slot (no
 *    onClick), never a button that pretends to work.
 *
 * "System status" (present in Carrier's own menu) is deliberately left out —
 * CIC's honest-mapping instructions didn't call for it, and the Services
 * section's live system overview already covers that ground.
 *
 * Keyboard: Escape closes + returns focus to the trigger; click-outside
 * closes — the same floor `ModuleSwitcher` (one file over) already
 * establishes in this codebase.
 */
export function AvatarMenu({
  hostname,
  onOpenSettings,
  onOpenAbout,
}: {
  hostname: string
  onOpenSettings: () => void
  onOpenAbout: () => void
}) {
  const { theme, preference, setPreference } = useTheme()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

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

  const menuId = 'toolbox-avatar-menu'

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '7px 12px',
    border: 'none',
    background: 'transparent',
    color: theme.text,
    fontFamily: theme.fontRow,
    fontSize: theme.sizeBody,
    textAlign: 'left',
    cursor: 'pointer',
  }

  return (
    <div ref={rootRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`User menu — local operator ${hostname}`}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 8px 4px 4px',
          borderRadius: 99,
          border: `1px solid ${theme.border}`,
          background: theme.surface,
          cursor: 'pointer',
        }}
      >
        <span
          aria-hidden
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: `${theme.accent}22`,
            color: theme.accent,
            fontFamily: theme.fontDisplay,
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {hostname.trim().charAt(0).toUpperCase()}
        </span>
        <span
          style={{
            maxWidth: 120,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: theme.fontRow,
            fontSize: theme.sizeBody,
            color: theme.text,
          }}
        >
          {hostname}
        </span>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="User menu"
          style={{
            position: 'absolute',
            insetInlineEnd: 0,
            top: '100%',
            marginTop: 6,
            zIndex: 20,
            width: 240,
            borderRadius: 8,
            border: `1px solid ${theme.border}`,
            background: theme.bg,
            boxShadow: `0 12px 30px ${theme.shadow}`,
            overflow: 'hidden',
          }}
        >
          {/* Identity header — not a menuitem, matching Carrier's UserMenu
              (name/role block sits above the item list, unwrapped). */}
          <div style={{ padding: '10px 12px' }}>
            <div style={{ fontFamily: theme.fontRow, fontSize: theme.sizeBody, fontWeight: 600, color: theme.text }}>
              {hostname}
            </div>
            <div
              style={{
                fontFamily: theme.fontMono,
                fontSize: theme.sizeLabel,
                letterSpacing: 0.6,
                color: theme.textMuted,
                marginTop: 2,
              }}
            >
              Local account
            </div>
          </div>

          <div role="separator" style={{ borderTop: `1px solid ${theme.border}` }} />

          {/* Theme — segmented Light / System / Dark, mirroring Carrier's
              ThemeToggle (role="radiogroup" + role="menuitemradio"). */}
          <div style={{ padding: '9px 12px' }}>
            <div
              role="radiogroup"
              aria-label="Theme"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
            >
              <span style={{ fontFamily: theme.fontRow, fontSize: theme.sizeBody, color: theme.textMuted }}>
                Theme
              </span>
              <div style={{ display: 'flex', borderRadius: 6, border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                {THEME_OPTIONS.map((opt) => {
                  const selected = preference === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => setPreference(opt.value)}
                      style={{
                        border: 'none',
                        padding: '3px 9px',
                        fontFamily: theme.fontRow,
                        fontSize: theme.sizeLabel,
                        fontWeight: 600,
                        cursor: 'pointer',
                        // One-Accent Rule: selection = accent fill, exactly the
                        // channel MasterRow/ModuleSwitcher already use.
                        background: selected ? theme.accent : 'transparent',
                        color: selected ? '#fff' : theme.textMuted,
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div role="separator" style={{ borderTop: `1px solid ${theme.border}` }} />

          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onOpenSettings() }}
            style={itemStyle}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = theme.bgSoft }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            Settings
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onOpenAbout() }}
            style={itemStyle}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = theme.bgSoft }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            About Harborline Toolbox
          </button>

          <div role="separator" style={{ borderTop: `1px solid ${theme.border}` }} />

          {/* Sign in… — disabled inert slot, verbatim Carrier copy for the same
              cross-fleet "not yet available" cloud-tier concept (real product
              doctrine, not invented — see the file-level comment above). */}
          <div
            role="menuitem"
            aria-disabled="true"
            style={{
              padding: '8px 12px',
              cursor: 'default',
            }}
          >
            <div style={{ fontFamily: theme.fontRow, fontSize: theme.sizeBody, color: theme.textDim }}>
              Sign in…
            </div>
            <div
              style={{
                fontFamily: theme.fontMono,
                fontSize: theme.sizeLabel,
                letterSpacing: 0.4,
                color: theme.textMuted,
                marginTop: 2,
              }}
            >
              Connect to the cloud tier (not yet available)
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
