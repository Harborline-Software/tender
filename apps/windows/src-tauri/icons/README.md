# Icon generation

Run `scripts/gen-icons.ps1` to regenerate all icon sizes from `src/assets/fleur-mark.png`.
Requires ImageMagick (`winget install ImageMagick.ImageMagick`).

Files needed for `tauri build`:
- `icon.ico` (16/24/32/48/64 multi-size ICO)
- `icon.icns` (macOS, generated on Mac)
- `32x32.png`, `128x128.png`
- `tray.png` (22×22, used for the system tray icon at runtime)

For `tauri dev`, only `tray.png` + the PNG sizes are needed.
