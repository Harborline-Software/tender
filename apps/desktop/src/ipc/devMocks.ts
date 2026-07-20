/**
 * Browser-dev mocks for the Tauri IPC layer.
 *
 * Active ONLY in `import.meta.env.DEV` when not running inside Tauri (i.e. a
 * plain `vite` browser session, e.g. for screenshot/UI work). In the built
 * Tauri app `__TAURI_INTERNALS__` is present, so these are never used — zero
 * production impact. Lets the panel render representative data in a browser.
 */
import type { FleetEntry, TenderSettings, InstallConfig, InventoryGroup, GpuResidencySnapshot, PaidComputeSnapshot } from '@/state/types'

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

const SETTINGS: TenderSettings = { schemaVersion: 1, mode: 'dev', fleetDashboardUrl: null }

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
    host: 'gpu-host.example.ts.net',
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
    host: 'gpu-host.example.ts.net',
    status: 'unreachable',
    models: [],
    detail: 'cannot reach TTS proxy at http://gpu-host.example.ts.net:8881/v1/models',
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

// Shaped from the real winhub probe (2026-07-07): the three fleet virtual keys
// with their live $5/mo budgets (no gateway spend yet → $0 usage); OpenRouter +
// fal show the genuine "notConfigured" state (their winhub balance-key slots are
// empty); Modal + Recraft are honest "dashboardOnly" deep-link tiles.
const PAID_COMPUTE: PaidComputeSnapshot = {
  gatewayLedger: {
    label: 'Bifrost gateway ledger — authoritative gateway-routed spend',
    host: '100.64.0.1:8892',
    status: 'ok',
    rows: [
      {
        id: 'vk-fleet-pilot-dogfood', name: 'pilot-dogfood', isActive: true,
        budget: { maxLimit: 5, currentUsage: 0, resetDuration: '1M', lastReset: '2026-07-07T15:16:52Z' },
      },
      {
        id: 'vk-fleet-code-review', name: 'code-review', isActive: true,
        budget: { maxLimit: 5, currentUsage: 0, resetDuration: '1M', lastReset: '2026-07-07T15:16:52Z' },
      },
      {
        id: 'vk-fleet-offload', name: 'fleet-offload', isActive: true,
        budget: { maxLimit: 5, currentUsage: 0, resetDuration: '1M', lastReset: '2026-07-07T15:42:09Z' },
      },
    ],
    detail: null,
  },
  providers: [
    {
      id: 'openrouter', displayName: 'OpenRouter', kind: 'wrapApi', status: 'notConfigured',
      balance: null, usage: null, unit: 'USD',
      detail: 'no balance key configured — add a read-only OpenRouter provisioning/management key to the winhub slot (%USERPROFILE%\\.config\\harborline\\openrouter-management.key) to show account balance + usage here',
      subscriptionUrl: 'https://openrouter.ai/settings/credits',
    },
    {
      id: 'fal', displayName: 'fal.ai', kind: 'wrapApi', status: 'notConfigured',
      balance: null, usage: null, unit: 'USD',
      detail: 'no balance key configured — add a read-only fal platform/admin key to the winhub slot (%USERPROFILE%\\.config\\harborline\\fal.key) to show credit balance here (verify the billing endpoint shape at provisioning)',
      subscriptionUrl: 'https://fal.ai/dashboard/billing',
    },
    {
      id: 'modal', displayName: 'Modal', kind: 'deepLink', status: 'dashboardOnly',
      balance: null, usage: null, unit: 'USD',
      detail: 'balance on the provider dashboard — the billing API is Team/Enterprise-gated; the fleet\'s Starter plan has no balance API',
      subscriptionUrl: 'https://modal.com/settings/usage',
    },
    {
      id: 'recraft', displayName: 'Recraft', kind: 'deepLink', status: 'dashboardOnly',
      balance: null, usage: null, unit: 'USD',
      detail: 'balance on the provider dashboard — prepaid API units, dashboard-checked (no balance API)',
      subscriptionUrl: 'https://www.recraft.ai/profile',
    },
  ],
  probedAt: '2026-07-07T17:20:00Z',
}

/** Per-command mock results. Commands not listed fall through to real `invoke` (which fail-soft in the browser). */
export const DEV_MOCKS: Record<string, unknown> = {
  get_appearance: 'dark',
  get_fleet: FLEET,
  get_settings: SETTINGS,
  set_fleet_dashboard_url: SETTINGS,
  get_install_config: INSTALL_CONFIG,
  recommend_profile: RECOMMENDATION,
  get_services: [],
  get_system_stats: SYSTEM_STATS,
  get_local_services: SYSTEM_STATS.topProcesses,
  get_projects: PROJECTS,
  get_devices: DEVICES,
  get_model_inventory: MODEL_INVENTORY,
  get_gpu_residency: GPU_RESIDENCY,
  get_paid_compute: PAID_COMPUTE,
  get_coordination_daemons: [
    {
      id: 'coordination-sync', displayName: 'Coordination Sync', cadence: 'Every 60 seconds',
      state: 'maintenanceHeld', detail: 'LaunchAgent is loaded, but its active marker is absent; the job is safely gated.',
      loaded: true, activeFlagPresent: false, controlsEnabled: false,
      canStart: false, canStop: true, canRunNow: false, logsAvailable: true,
      lastRunAt: Math.floor(Date.now() / 1000) - 180, lastLogLine: 'Maintenance hold remains in force.',
      capacityActive: null, capacityMaximum: null, connProvider: null, nextCandidate: null,
    },
    {
      id: 'qm-daemon', displayName: 'QM Daemon', cadence: 'Every hour',
      state: 'loaded', detail: 'LaunchAgent is loaded and its activity is current.',
      loaded: true, activeFlagPresent: true, controlsEnabled: false,
      canStart: false, canStop: true, canRunNow: false, logsAvailable: true,
      lastRunAt: Math.floor(Date.now() / 1000) - 900, lastLogLine: 'Scan complete: 0 finding(s)',
      capacityActive: null, capacityMaximum: null, connProvider: null, nextCandidate: null,
    },
    {
      id: 'lane-supervisor', displayName: 'Lane Supervisor', cadence: 'Every 5 minutes · one start per tick',
      state: 'loaded', detail: 'Capacity available; Claude is favored before its Monday reset.',
      loaded: true, activeFlagPresent: true, controlsEnabled: false,
      canStart: false, canStop: true, canRunNow: false, logsAvailable: true,
      lastRunAt: Math.floor(Date.now() / 1000) - 75, lastLogLine: 'Admitted claude:deckhand-claude-a.',
      capacityActive: 1, capacityMaximum: 3, connProvider: 'codex',
      nextCandidate: 'claude:bosun-claude-w1',
    },
  ],
  get_fleet_dashboard_link: {
    configured: false, url: null,
    detail: 'Set Fleet Dashboard URL in Dock Settings.',
  },
}
