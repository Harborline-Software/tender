/**
 * Browser-dev mocks for the Tauri IPC layer.
 *
 * Active ONLY in `import.meta.env.DEV` when not running inside Tauri (i.e. a
 * plain `vite` browser session, e.g. for screenshot/UI work). In the built
 * Tauri app `__TAURI_INTERNALS__` is present, so these are never used — zero
 * production impact. Lets the panel render representative data in a browser.
 */
import type { FleetEntry, TenderSettings, InstallConfig, InventoryGroup, GpuResidencySnapshot } from '@/state/types'

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
      availability: 'deprecated',
      detect: { processPattern: 'book-server', healthUrl: 'http://localhost:3080/health' },
      install: { sourceKind: 'appBundle', requiresSigning: false },
      services: [],
      actions: [],
      caveats: [
        {
          id: 'repo-archived',
          severity: 'info',
          summary:
            'The flight-deck repo was archived on GitHub 2026-06-29 and moved out of the active fleet tree. Retired here rather than removed — no fresh install or management offered.',
        },
        {
          id: 'signed-build-pending',
          severity: 'blocker',
          summary:
            'Backend now bundled (book-server + embedded Node runtime ship in the .app). Remaining gate: a signed/notarized build + install-through-Tender verification.',
        },
        {
          id: 'audiobook-prose-need-python',
          severity: 'info',
          summary:
            'Audiobook + prose-telemetry are optional features that need a local python3; they degrade gracefully when absent. Core API is self-contained.',
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
      availability: 'deprecated',
      detect: { processPattern: 'Sunfish.Bridge.AppHost', healthUrl: 'https://localhost:17101/health' },
      install: { sourceKind: 'appBundle', requiresSigning: false },
      services: [],
      actions: [],
      caveats: [
        {
          id: 'repo-archived',
          severity: 'info',
          summary:
            'The signal-bridge repo was archived on GitHub 2026-06-29 and moved out of the active fleet tree. Retired here rather than removed — no fresh install or management offered.',
        },
      ],
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

const SYSTEM_STATS = {
  cpu: 23.4,
  memUsedBytes: 9663676416,
  memTotalBytes: 17179869184,
  diskUsedBytes: 505424653312,
  diskTotalBytes: 1000204886016,
  netMbps: 4.2,
  netMaxMbps: 1000,
  topProcesses: [
    { name: 'WindowServer', pid: 184, cpu: 12.4, memBytes: 612368384, isHarborline: false },
    { name: 'local-node-host', pid: 4821, cpu: 3.1, memBytes: 248512512, isHarborline: true },
    { name: 'book-server', pid: 46770, cpu: 1.8, memBytes: 96337920, isHarborline: true },
    { name: 'Harborline Toolbox', pid: 5210, cpu: 0.4, memBytes: 84934656, isHarborline: true },
    { name: 'Finder', pid: 612, cpu: 0.2, memBytes: 142606336, isHarborline: false },
  ],
}

const DEVICES = [
  { hostname: 'harbor-mac-studio', tailscaleIPs: ['100.74.12.1'], online: true, os: 'macos', isCurrentDevice: true },
  { hostname: 'harbor-win-01', tailscaleIPs: ['100.74.12.7'], online: true, os: 'windows', isCurrentDevice: false },
  { hostname: 'harbor-prod-01', tailscaleIPs: ['100.74.12.9'], online: false, os: 'linux', isCurrentDevice: false },
]

const PROJECTS = [
  { name: 'harborline-software', path: '~/Projects/Harborline-Software', status: 'active', lastOpened: null },
  { name: 'sunfish', path: '~/Projects/Harborline-Software/sunfish', status: 'active', lastOpened: null },
  { name: 'old-sloop-prototype', path: '~/Code/old-sloop', status: 'archived', lastOpened: null },
]

// Shaped from a real winhub probe (2026-07-07) — TTS shows the genuine
// "unreachable" state (both TTS services were stopped at probe time),
// Stability Matrix shows the genuine "notConfigured" state (not installed).
const MODEL_INVENTORY: InventoryGroup[] = [
  {
    targetId: 'ollama',
    displayName: 'Ollama (LLM)',
    backendKind: 'llm-serving',
    host: 'desktop-umt08rn.taildefd38.ts.net',
    status: 'ok',
    models: [
      { name: 'qwen2.5-coder:14b-instruct-q4_K_M', sizeBytes: 8988124298, lastModifiedAt: '2026-07-03T11:26:29Z' },
      { name: 'qwen2.5-coder:7b-instruct-q4_K_M', sizeBytes: 4683087561, lastModifiedAt: '2026-07-03T11:24:58Z' },
      { name: 'qwen2.5:7b-instruct-q4_K_M', sizeBytes: 4683087332, lastModifiedAt: '2026-07-02T12:10:34Z' },
    ],
    detail: null,
    probedAt: '2026-07-07T16:07:27Z',
  },
  {
    targetId: 'tts-proxy',
    displayName: 'TTS (voices)',
    backendKind: 'tts',
    host: 'desktop-umt08rn.taildefd38.ts.net',
    status: 'unreachable',
    models: [],
    detail: 'cannot reach TTS proxy at http://desktop-umt08rn.taildefd38.ts.net:8881/v1/models',
    probedAt: '2026-07-07T16:07:33Z',
  },
  {
    targetId: 'comfyui-checkpoints',
    displayName: 'ComfyUI (checkpoints)',
    backendKind: 'image-worker',
    host: 'winhub',
    status: 'ok',
    models: [
      { name: 'flux1-schnell-fp8.safetensors', sizeBytes: 17236328572, lastModifiedAt: '2026-07-07T10:59:30Z' },
    ],
    detail: null,
    probedAt: '2026-07-07T16:07:29Z',
  },
  {
    targetId: 'stability-matrix',
    displayName: 'Stability Matrix (checkpoints)',
    backendKind: 'image-worker',
    host: 'winhub',
    status: 'notConfigured',
    models: [],
    detail: 'not configured — set TENDER_STABILITY_MATRIX_DIR if Stability Matrix is installed',
    probedAt: '2026-07-07T16:07:27Z',
  },
]

// Shaped from a real winhub probe (2026-07-07) — Ollama has a model warm
// (the genuine "loaded" state, correlated via /api/ps size_vram + expires_at),
// TTS is reachable-but-unknown (no "what's loaded" API — the honest gap),
// ComfyUI is idle (no GPU-active process matched at probe time). Headline
// reflects the real driver caveat: per-process nvidia-smi memory is [N/A]
// on this box (WDDM consumer driver), so perProcessAttributionAvailable is
// honestly false and Ollama's own self-reported size_vram is the only
// per-row VRAM figure available.
const GPU_RESIDENCY: GpuResidencySnapshot = {
  gpu: { totalVramMb: 12282, usedVramMb: 10448, freeVramMb: 1547 },
  perProcessAttributionAvailable: false,
  unattributedVramMb: 4920,
  rows: [
    {
      serviceId: 'ollama',
      displayName: 'Ollama (LLM)',
      backendKind: 'llm-serving',
      status: 'loaded',
      modelName: 'qwen2.5-coder:7b-instruct-q4_K_M',
      vramMb: 5528,
      pid: 25864,
      since: '2026-07-07T17:10:00Z',
      detail: null,
    },
    {
      serviceId: 'tts-backend',
      displayName: 'TTS (Higgs/Kokoro)',
      backendKind: 'tts',
      status: 'unknown',
      modelName: null,
      vramMb: null,
      pid: null,
      since: null,
      detail: 'TTS proxy is reachable but exposes no "what\'s loaded" API — cannot confirm residency without a GPU-process match.',
    },
    {
      serviceId: 'comfyui',
      displayName: 'ComfyUI',
      backendKind: 'image-worker',
      status: 'idle',
      modelName: null,
      vramMb: null,
      pid: null,
      since: null,
      detail: null,
    },
  ],
  probedAt: '2026-07-07T17:07:30Z',
}

/** Per-command mock results. Commands not listed fall through to real `invoke` (which fail-soft in the browser). */
export const DEV_MOCKS: Record<string, unknown> = {
  get_appearance: 'dark',
  get_fleet: FLEET,
  get_settings: SETTINGS,
  get_install_config: INSTALL_CONFIG,
  recommend_profile: RECOMMENDATION,
  get_services: [],
  get_system_stats: SYSTEM_STATS,
  get_local_services: SYSTEM_STATS.topProcesses,
  get_projects: PROJECTS,
  get_devices: DEVICES,
  get_model_inventory: MODEL_INVENTORY,
  get_gpu_residency: GPU_RESIDENCY,
}
