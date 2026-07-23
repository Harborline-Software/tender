/**
 * AboutPanel — "About Harborline Toolbox" (CIC amendment, tender#103 fix pass
 * 4 — avatar-menu parity item). No About surface existed anywhere in this app
 * before this pass (the tray popup's own gear-menu "About" entry has never
 * had a backing screen — a pre-existing dead item, left as-is per the
 * decision to leave the tray/Panel.tsx component untouched this pass). This
 * is a small, honest one: every field is real data already available in the
 * app (version via the same `getVersion()` the navigation-footer uses,
 * theme mode, the product-purpose sentence verbatim from PRODUCT.md) —
 * nothing invented or aspirational.
 */
import { useEffect, useState } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { Logomark } from '@/components/Logomark'

export function AboutPanel() {
  const { theme, mode } = useTheme()
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/app').then((m) => m.getVersion()).then(setVersion).catch(() => {})
    }
  }, [])

  return (
    <div style={{ padding: '28px 26px', maxWidth: 340, textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
        <Logomark size={40} />
      </div>
      <div
        style={{
          fontFamily: theme.fontDisplay,
          fontSize: 17,
          fontWeight: 600,
          color: theme.text,
          marginBottom: 4,
        }}
      >
        Harborline Toolbox
      </div>
      <div
        style={{
          fontFamily: theme.fontMono,
          fontSize: theme.sizeLabel,
          letterSpacing: 0.8,
          color: theme.textMuted,
          marginBottom: 16,
        }}
      >
        {version ? `Version ${version}` : 'Development build'} · {mode} mode
      </div>
      <div
        style={{
          fontFamily: theme.fontRow,
          fontSize: theme.sizeBody,
          color: theme.textDim,
          lineHeight: 1.6,
        }}
      >
        {/* Verbatim from PRODUCT.md's "Product Purpose" — not invented copy. */}
        A tray-resident control panel for the Harborline fleet: install/commission
        apps, watch service health, inspect model inventory, GPU residency, and
        paid-compute spend, and reach logs fast.
      </div>
    </div>
  )
}
