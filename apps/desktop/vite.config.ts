import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1421,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
    // @shipyard/ui-react is consumed via a `file:` symlink whose own
    // node_modules carries a second copy of react/react-dom. Without deduping,
    // Vite would bundle two React instances → "invalid hook call". Force the
    // single copy from THIS app's node_modules. (jsx-runtime included so the
    // automatic runtime resolves to the same instance.)
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  build: {
    target: ['es2021', 'safari14.1'],
    minify: !process.env.TAURI_DEBUG ? 'oxc' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    // Two surfaces, two documents (dual-surface toolbox, shipyard #2973): the
    // 360px tray popup (index.html) and the full main window (toolbox.html).
    // Separate entries keep the popup's bespoke bundle free of the ui-react
    // Tailwind stylesheet (whose preflight reset the toolbox needs but the
    // popup must never inherit) — the popup's pixel-role stays untouched.
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        toolbox: path.resolve(__dirname, 'toolbox.html'),
      },
    },
  },
})
