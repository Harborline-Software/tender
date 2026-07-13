# Icon source art — INTERIM MARK (2026-07-07, provisional per CIC)

`app-icon-1024.png` is the source for `tauri icon`, rasterized from
`app-icon-badge.svg` in this directory (cobalt rounded square + the white-wave
dark-surface variant of the mark, geometry from harborline-www
`logo-mark-dark.svg`). Regenerate the PNG with:

```
rsvg-convert -w 1024 -h 1024 app-icon-badge.svg -o app-icon-1024.png
```

(bw03-sun-wave-cut — see
`harborline-www/src/assets/logo-mark.svg` in the harborline-www repo for the full
adoption note and `.wolf/cerebrum.md` decision-log "INTERIM MARK ADOPTED" for the
verbatim CIC ruling). Cobalt (#06489c) rounded-square badge, orange sun (#e97c48),
white wave silhouette — same badge treatment as `HarborlineMark.tsx` in shipyard's
carrier app, for cross-product consistency.

To regenerate the full icon set from this source:

```
cd apps/desktop
npx tauri icon src-tauri/icons/source/app-icon-1024.png -o src-tauri/icons
```

This also emits unused iOS/Android/Windows-Store variants (`icon.png`, `64x64.png`,
`Square*.png`, `StoreLogo.png`, `android/`, `ios/`) that aren't referenced by
`tauri.conf.json` — delete those after regenerating, keep only the referenced set
(`32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`, `icon.ico`).

**32x32.png is NOT a scaled crop of the 1024px source** — the full-detail wave-notch
silhouette collapses into an illegible blob at 32px, so it's hand-composited from a
simplified, chunkier cut (no wave-notch detail, larger sun) instead. If you regenerate
via `tauri icon`, re-do 32x32.png by hand the same way (see the git history of this
file for the exact SVG geometry used).

`tray-icon.png` (36px, transparent, no badge) is simplified further still — solid
orange sun circle only, no wave — verified legible on both light and dark menu bars
down to 18px effective render size, matching the extreme minimalism of the prior tray
glyph.

Provisional: a future final-mark swap should grep for "INTERIM MARK" across this repo
to find every asset that needs replacing.
