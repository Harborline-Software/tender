/**
 * Browser-dev mocks for the Tauri IPC layer.
 *
 * Active ONLY in `import.meta.env.DEV` when not running inside Tauri (i.e. a
 * plain `vite` browser session, e.g. for screenshot/UI work). In the built
 * Tauri app `__TAURI_INTERNALS__` is present, so these are never used — zero
 * production impact. Lets the panel render representative data in a browser.
 */
import type { FleetEntry, TenderSettings, InstallConfig } from '@/state/types'

const FLEET: FleetEntry[] = [
  {
    manifest: {
      id: 'sunfish',
      displayName: 'Sunfish',
      availability: 'packaged',
      detect: { processPattern: 'Sunfish.Anchor' },
      install: { sourceKind: 'appBundle', requiresSigning: false },
      services: [],
      actions: [],
      caveats: [
        {
          id: 'unsigned-keychain-boot',
          severity: 'blocker',
          summary: "Unsigned build: macOS Keychain seed not minted → sidecar won't boot.",
        },
      ],
    },
    installed: false,
    version: '',
    status: 'stopped',
    visibleInEndUserMode: false,
  },
  {
    manifest: {
      id: 'flight-deck',
      displayName: 'Flight-Deck',
      availability: 'packaged',
      detect: { processPattern: 'book-server', healthUrl: 'http://localhost:3080/health' },
      install: { sourceKind: 'appBundle', requiresSigning: false },
      services: [],
      actions: [],
      caveats: [
        {
          id: 'bookserver-not-bundled',
          severity: 'blocker',
          summary: 'Backend boots only from the repo tree / GALLEY_BOOK_SERVER_PATH — not yet bundled.',
        },
      ],
    },
    installed: false,
    version: '',
    status: 'stopped',
    visibleInEndUserMode: false,
  },
  {
    manifest: {
      id: 'signal-bridge',
      displayName: 'Signal-Bridge',
      availability: 'planned',
      detect: { processPattern: 'Sunfish.Bridge.AppHost', healthUrl: 'https://localhost:17101/health' },
      install: { sourceKind: 'appBundle', requiresSigning: false },
      services: [],
      actions: [],
      caveats: [],
    },
    installed: false,
    version: '',
    status: 'stopped',
    visibleInEndUserMode: false,
  },
]

const SETTINGS: TenderSettings = { schemaVersion: 1, mode: 'dev' }

const RECOMMENDATION = {
  probe: {
    profile: {
      totalRamBytes: 17179869184,
      availableRamBytes: 8589934592,
      physicalCores: 8,
      logicalCores: 16,
      diskVolumes: [{ mountPoint: '/', freeBytes: 494780232704, totalBytes: 1000204886016 }],
      architecture: 'x64',
      hasDiscreteGpu: null,
      gpuVramBytes: null,
      isBatteryPowered: null,
      osFamily: 'macos',
    },
    keyingComplete: true,
    warnings: [],
  },
  recommended: { name: 'capable', axes: { persistence: 'sqlite' }, userOverridden: false },
}

// Non-empty by default so App.tsx routing lands on the Fleet (the main surface
// for UI work). Set `apps: {}` to exercise the Outfitting first-run instead.
const INSTALL_CONFIG: InstallConfig = {
  schemaVersion: 1,
  apps: {
    sunfish: {
      id: 'sunfish',
      version: '',
      installPath: '',
      profile: { name: 'standard', axes: {}, userOverridden: false },
      launch: { program: '', args: [] },
    },
  },
}

/** Per-command mock results. Commands not listed fall through to real `invoke` (which fail-soft in the browser). */
export const DEV_MOCKS: Record<string, unknown> = {
  get_appearance: 'dark',
  get_fleet: FLEET,
  get_settings: SETTINGS,
  get_install_config: INSTALL_CONFIG,
  recommend_profile: RECOMMENDATION,
  get_services: [],
  get_projects: [],
  get_devices: [],
}
