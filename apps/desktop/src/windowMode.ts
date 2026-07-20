/**
 * Window-mode helper. Kept in its own module (not a component file) so React
 * Fast Refresh stays intact — co-exporting a non-component function from a
 * component module (MenuShell) breaks HMR and leaves the Tauri webview stale.
 */

/** The window renders the full-size view when its URL hash is `#full`. */
export function isFullWindow(): boolean {
  return typeof window !== 'undefined' && window.location.hash.replace(/^#/, '') === 'full'
}
