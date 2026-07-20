// Data shapes for Tender. All times are ISO 8601. Sizes are bytes.
// Defined per IMPLEMENTATION.md § Data shapes.

export interface Device {
  hostname: string
  ip: string
  os: 'WIN' | 'MAC' | 'LNX'
  kind?: 'workstation' | 'server'
  status: 'online' | 'idle' | 'offline'
  lastSeen?: string
  isThis: boolean
}

export interface HarborlineService {
  id: 'signal-bridge' | 'sunfish' | 'flight-deck'
  displayName: string
  version: string
  installed: boolean
  status: 'running' | 'idle' | 'stopped' | 'error'
  updateAvailable?: PendingUpdate

  signalBridge?: {
    throughputMbps: number
    history: number[]
    links: { hostname: string; upMbps: number; downMbps: number; status: 'healthy' | 'degraded' }[]
  }
  sunfish?: {
    activeTasks: number
    queuedTasks: number
    tasksPerMin: number
    errors: number
    tasks: { name: string; status: 'running' | 'queued' | 'paused'; pct: number }[]
  }
  flightDeck?: {
    airborne: number
    total: number
    workers: { id: number; util: number; temp: number }[]
  }
}

export interface Project {
  name: string
  path: string
  status: 'active' | 'paused' | 'archived'
  lastOpened?: string
}

export interface LocalService {
  name: string
  pid?: number
  cpu: number
  memBytes: number
  isHarborline: boolean
}

export interface SystemStats {
  cpu: number
  memUsedBytes: number
  memTotalBytes: number
  diskUsedBytes: number
  diskTotalBytes: number
  netMbps: number
  netMaxMbps: number
  topProcesses: LocalService[]
}

export interface PendingUpdate {
  service: HarborlineService['id'] | 'tender'
  fromVersion: string
  toVersion: string
  sizeBytes: number
  releaseNotes: ReleaseNote[]
  publishedAt: string
}

export interface ReleaseNote {
  kind: 'new' | 'fix' | 'perf'
  text: string
}

export type DetailId =
  | 'signal-bridge'
  | 'sunfish'
  | 'flight-deck'
  | 'engine-room'
  | 'dock-settings'
  | 'dry-dock'
  | 'release-notes'
  | 'bundles'
  | 'backups'
  | 'relay'
  | 'model-inventory'
  | 'model-residency'
  | 'paid-compute'
  | 'coordination-daemons'

export type Screen = { kind: 'main' } | { kind: 'detail'; id: DetailId } | { kind: 'outfitting' }

// ── Backup types (R8 operator-companion) ─────────────────────────────────────

/** A single backup archive in the history list. */
export interface BackupEntry {
  /** Unix epoch seconds at snapshot time — used as a unique id. */
  id: number
  /** ISO 8601 UTC timestamp. */
  createdAt: string
  /** Compressed archive size in bytes. */
  sizeBytes: number
  /** Absolute filesystem path to the .tar.gz file. */
  path: string
  /** True when both DB + vault were found and snapshotted. */
  complete: boolean
  /** Human-readable scope label ("DB + vault", "DB only", etc.). */
  scope: string
}

// ── Sync / relay status types ─────────────────────────────────────────────────

/** Four-state sync indicator — fleet SyncState vocabulary. */
export type SyncStateValue = 'healthy' | 'stale' | 'offline' | 'singledevice'

/** Relay + coordination-sync status snapshot. */
export interface SyncStatus {
  relayReachable: boolean
  /** v1: always false — device-pairing deferred. */
  multiDeviceActive: boolean
  tailnetDeviceCount: number
  /** Unix epoch seconds of the last coordination-sync log mtime, or null. */
  lastCoordSyncAt: number | null
  state: SyncStateValue
}

// ── Coordination daemon operations ─────────────────────────────────────────

export type CoordinationDaemonState =
  | 'loaded'
  | 'maintenanceHeld'
  | 'disabled'
  | 'degraded'
  | 'notConfigured'

export interface CoordinationDaemonStatus {
  id: 'coordination-sync' | 'qm-daemon'
  displayName: string
  cadence: string
  state: CoordinationDaemonState
  detail: string
  loaded: boolean
  activeFlagPresent: boolean
  controlsEnabled: boolean
  canStart: boolean
  canStop: boolean
  canRunNow: boolean
  logsAvailable: boolean
  lastRunAt: number | null
  lastLogLine: string | null
}

export type CoordinationDaemonAction = 'start' | 'stop' | 'runNow'

export interface DaemonActionResult {
  id: CoordinationDaemonStatus['id']
  action: CoordinationDaemonAction
  detail: string
}

export interface FleetDashboardLink {
  configured: boolean
  url: string | null
  detail: string
}

// ── Hardware probe (ADR 0116 D1) ─────────────────────────────────────────────
// Mirror of the Rust `probe::*` IPC contract. Returned by the `probe_hardware`
// Tauri command. The named-profile mapping that consumes this is C1.

/** CPU architecture (ADR 0116 D1). `other` = unrecognised keying value. */
export type Architecture = 'arm64' | 'x64' | 'other'

/** Host OS family (ADR 0116 D1). */
export type OsFamily = 'macos' | 'windows' | 'linux' | 'other'

/** Free + total space on one non-removable data volume. */
export interface DiskVolume {
  mountPoint: string
  freeBytes: number
  totalBytes: number
}

/** The host hardware profile (ADR 0116 D1) — field-for-field the D1 contract. */
export interface HardwareProfile {
  totalRamBytes: number
  /** Advisory only (volatile) — never a keying field (H1). */
  availableRamBytes: number
  /** `0` ⇒ unobtainable (drives `keyingComplete: false`). */
  physicalCores: number
  logicalCores: number
  diskVolumes: DiskVolume[]
  architecture: Architecture
  /** Best-effort (H1) — `null` = unknown, never a guess. */
  hasDiscreteGpu: boolean | null
  gpuVramBytes: number | null
  isBatteryPowered: boolean | null
  osFamily: OsFamily
}

/**
 * Probe result: the profile plus probe-quality metadata. `keyingComplete` is
 * `false` when any stable keying field was unobtainable — the ADR 0116 H2
 * trigger for the C1 mapping to recommend `minimum`.
 */
export interface ProbeResult {
  profile: HardwareProfile
  keyingComplete: boolean
  warnings: string[]
}

/**
 * Named capability profile (ADR 0116 D2), ordered floor → ceiling. The record
 * type; the probe→profile mapping is C1.
 */
export type ProfileName = 'minimum' | 'standard' | 'capable' | 'max'

/** A resolved capability profile (ADR 0116 D2). Persisted to install config. */
export interface CapabilityProfile {
  name: ProfileName
  /** Per-axis selections keyed by axis `key` (e.g. `persistence` → `sqlite`). */
  axes: Record<string, string>
  userOverridden: boolean
}

/**
 * A probe paired with the profile Tender recommends for it. Returned by the
 * `recommend_profile` command. `probe.keyingComplete: false` ⇒ the
 * recommendation is the H2 fail-safe `minimum`.
 */
export interface ProfileRecommendation {
  probe: ProbeResult
  recommended: CapabilityProfile
}

// ── Install config (C1) ──────────────────────────────────────────────────────
// Mirror of the Rust `install_config::*` contract. Returned by the
// `get_install_config` command. The source of truth for honest
// `installed`/`version` detection and the C2 launch contract.

/** How Tender launches a managed service (C2 reads this). */
export interface LaunchContract {
  program: string
  args: string[]
  healthUrl?: string
}

/** One Tender-managed app install. */
export interface InstalledApp {
  /** Matches `HarborlineService['id']`. */
  id: HarborlineService['id']
  version: string
  installPath: string
  profile: CapabilityProfile
  launch: LaunchContract
}

/** Tender's persisted install config — what Tender manages. */
export interface InstallConfig {
  schemaVersion: number
  /** Installed apps keyed by service id. */
  apps: Record<string, InstalledApp>
}

// ── Settings + dev/end-user mode (CFG-2) ──────────────────────────────────────
// Mirror of the Rust `settings::*` contract. `get_settings` reads, `set_mode`
// writes. `mode` gates the fleet (`get_fleet` returns released-only in end-user)
// + backs the header DEV pill.

/** Dev vs end-user posture (§10). */
export type Mode = 'dev' | 'end-user'

/** Tender's persisted settings. */
export interface TenderSettings {
  schemaVersion: number
  mode: Mode
  fleetDashboardUrl: string | null
}

// ── Local install engine (C3) ────────────────────────────────────────────────
// Mirror of the Rust `install::*` contract. `install_app_local` places a bundle
// from a LOCAL source + records it; `launch_app` hands off to the app's own
// ADR 0115 supervisor.

/** Kind of local artifact an install source points at. */
export type InstallSourceKind = 'appBundle' | 'tarGz'

/** Where Tender fetches an app from (local-first ⇒ a path on this machine). */
export interface InstallSource {
  kind: InstallSourceKind
  /** Absolute path to the local artifact. */
  path: string
}

/** A request to install one app from a local source under a resolved profile. */
export interface InstallRequest {
  /** Open catalog id (mirrors the Rust `String`); any `AppManifest.id`. */
  appId: string
  version: string
  source: InstallSource
  profile: CapabilityProfile
}

/** Where an install/launch step landed. */
export type InstallStatus = 'installed' | 'launched' | 'failed'

/** Outcome of an install or launch operation. */
export interface InstallOutcome {
  appId: string
  status: InstallStatus
  installPath?: string | null
  detail?: string | null
}

// ── App catalog (CFG-1) ────────────────────────────────────────────────────────
// Mirror of the Rust `catalog::*` contract. The declarative "available" layer:
// one app manifest per app (bundled default + user override). The
// `get_fleet` command returns the resolved per-app state (`FleetEntry`) the
// state-driven Fleet tab consumes — distinct from the legacy `HarborlineService`
// list `get_services` still returns. Additive; nothing here replaces existing types.

/** Where an app sits on the readiness ladder (§5). */
export type Availability = 'planned' | 'packaged' | 'released' | 'deprecated'

/** Severity of a structured caveat (§6). */
export type CaveatSeverity = 'blocker' | 'warning' | 'info'

/** How Tender detects whether the app is running (§8). */
export interface DetectSpec {
  /** The `pgrep -f` pattern that identifies the app's process. */
  processPattern: string
  /** Optional health URL. Absent ⇒ process-only detection. */
  healthUrl?: string | null
}

/** Where + how Tender installs the app (§4). Reuses the C3 `InstallSourceKind`. */
export interface InstallSpec {
  sourceKind: InstallSourceKind
  /** Local build ref (`local:auto`), a path, or (later) a feed ref. */
  source?: string | null
  requiresSigning: boolean
}

/** A sub-service the app owns (§9), with its own boot + health scope. */
export interface ServiceDef {
  id: string
  /** e.g. `self-supervised` | `supervised` | `process`. */
  boot: string
  /** e.g. `internal` | `local-port` | `remote`. */
  healthScope: string
}

/** A declarative app action (§4) — generalises emergency-stop / restart. */
export interface ActionDef {
  id: string
  /** e.g. `process-restart` | `http-post`. */
  kind: string
}

/** A structured routed finding (§6). */
export interface Caveat {
  id: string
  severity: CaveatSeverity
  summary: string
  appliesWhen?: string | null
}

/** One declarative app manifest (`<id>.app.json`). Open `id` string replaces
 *  the closed `HarborlineService['id']` union for catalog-driven surfaces. */
export interface AppManifest {
  id: string
  displayName: string
  vendor?: string | null
  icon?: string | null
  availability: Availability
  detect: DetectSpec
  install: InstallSpec
  services: ServiceDef[]
  actions: ActionDef[]
  caveats: Caveat[]
}

/** Resolved per-app Fleet state: the manifest plus honest live install/run
 *  state. Returned (as a list) by the `get_fleet` command. */
export interface FleetEntry {
  manifest: AppManifest
  /** C1 honest `installed` (Tender-managed OR currently running). */
  installed: boolean
  /** C1 honest `version` (recorded, else `"unknown"`/`""`). */
  version: string
  /** `running` | `stopped`. */
  status: string
  /** Whether shown in end-user mode (`availability === 'released'`). */
  visibleInEndUserMode: boolean
}

// ── Cross-zoo model inventory (Toolbox #137, ONR survey slice G1) ───────────
// Mirror of the Rust `inventory::*` contract. Returned by the
// `get_model_inventory` command — one group per AI backend (Ollama, TTS,
// ComfyUI, Stability Matrix), each honest about unreachable/missing state.

/** Mirrors the #51 registry's `kind` vocabulary (the subset this slice probes). */
export type BackendKind = 'llm-serving' | 'tts' | 'image-worker'

/** One installed model/checkpoint/voice, as reported by its own backend. */
export interface ModelEntry {
  name: string
  /** `null` when the backend's own API doesn't expose a size. */
  sizeBytes: number | null
  /** Backend-reported modification/write time (ISO 8601). NOT a "last used"
   *  signal — that is the separate G2 VRAM-residency slice. */
  lastModifiedAt: string | null
}

/** Honest probe outcome for one backend target — never a silent empty list. */
export type InventoryStatus = 'ok' | 'unreachable' | 'dirMissing' | 'notConfigured'

/** One backend's inventory result — the per-row shape the Inventory pane renders. */
export interface InventoryGroup {
  targetId: string
  displayName: string
  backendKind: BackendKind
  host: string
  status: InventoryStatus
  models: ModelEntry[]
  /** Present on non-`ok` statuses — a short, honest, human-readable reason. */
  detail: string | null
  /** ISO 8601 UTC — when this probe ran (the "as of last probe" freshness stamp). */
  probedAt: string
}

// ── VRAM residency (Toolbox #137, ONR survey slice G2) ──────────────────────
// Mirror of the Rust `residency::*` contract. Returned by the
// `get_gpu_residency` command — the correlated "what's loaded right now"
// view over the same zoo G1 inventories.

/** Aggregate GPU memory — always available, even when per-process reads aren't. */
export interface GpuHeadline {
  totalVramMb: number
  usedVramMb: number
  freeVramMb: number
}

/** Honest per-service residency outcome — never a guessed "loaded". */
export type ResidencyStatus = 'loaded' | 'idle' | 'unreachable' | 'unknown'

/** One row of the residency pane: service | model | VRAM MB | since-when. */
export interface ResidencyRow {
  serviceId: string
  displayName: string
  backendKind: BackendKind
  status: ResidencyStatus
  modelName: string | null
  /** Best-known VRAM figure for this row — backend-self-reported takes
   *  priority over a `nvidia-smi` per-PID read (`null` when the driver
   *  doesn't report per-process memory, or nothing is attributable). */
  vramMb: number | null
  /** The `nvidia-smi` PID this row was correlated to, when known. */
  pid: number | null
  /** Backend-reported freshness signal (e.g. Ollama's idle-unload
   *  `expires_at`) — NOT a "loaded since" timestamp. `null` when the
   *  backend carries no timing signal. */
  since: string | null
  /** Present on `unreachable` / `unknown` — a short, honest reason. */
  detail: string | null
}

/** The full residency pane payload. */
export interface GpuResidencySnapshot {
  gpu: GpuHeadline
  /** `false` on drivers that don't report per-process VRAM for compute
   *  apps (the common case on consumer WDDM drivers) — degrade-to-
   *  aggregate is then in effect for every row's `vramMb`. */
  perProcessAttributionAvailable: boolean
  /** `usedVramMb` minus the sum of every row's own known `vramMb`. `null`
   *  when nothing is attributable at all — never a fabricated zero. A
   *  large positive value is the GPU-accounting-drift finding. */
  unattributedVramMb: number | null
  rows: ResidencyRow[]
  probedAt: string
}

// ── Paid-compute pane (Toolbox #137, ONR survey slice G3) ────────────────────
// Mirror of the Rust `paidcompute::*` contract. Returned by the
// `get_paid_compute` command — the Bifrost gateway ledger (authoritative
// gateway-routed spend per virtual key) + the paid-provider roster. Never
// carries a paid credential (secret-drop at the Rust parse boundary) and never
// a fabricated balance (honest `notConfigured` / `dashboardOnly` states).

/** The gateway ledger's reachability — read (`ok`) or not (`unreachable`). */
export type LedgerStatus = 'ok' | 'unreachable'

/** One virtual key's budget window (spend unit = USD). */
export interface BudgetInfo {
  maxLimit: number
  currentUsage: number
  /** The reset window token, e.g. `"1M"` (monthly). */
  resetDuration: string
  /** ISO 8601 of the last budget reset, when reported. */
  lastReset: string | null
}

/** One virtual key row — identity + budget ONLY, never its bearer secret. */
export interface VkeyRow {
  id: string
  name: string
  isActive: boolean
  budget: BudgetInfo | null
}

/** The Bifrost gateway ledger — the authoritative gateway-routed spend view. */
export interface GatewayLedger {
  label: string
  host: string
  status: LedgerStatus
  rows: VkeyRow[]
  /** Present on `unreachable` — a short honest reason (never a raw body). */
  detail: string | null
}

/** How a provider tile gets its data. */
export type ProviderKind = 'wrapApi' | 'deepLink'

/** Honest per-provider tile status — never a fabricated balance. */
export type ProviderStatus = 'ok' | 'notConfigured' | 'unreachable' | 'dashboardOnly'

/** One provider tile in the roster. */
export interface ProviderTile {
  id: string
  displayName: string
  kind: ProviderKind
  status: ProviderStatus
  /** Remaining balance/credits in `unit` — `null` unless a real value was read. */
  balance: number | null
  /** This-period usage in `unit` — `null` unless real. */
  usage: number | null
  /** Unit `balance`/`usage` are denominated in ("USD" | "credits" | "units"). */
  unit: string
  /** Present on non-`ok` tiles — a short, honest reason. */
  detail: string | null
  /** Click-through to the provider's account / subscription / usage page. */
  subscriptionUrl: string
}

/** The whole paid-compute pane payload. */
export interface PaidComputeSnapshot {
  gatewayLedger: GatewayLedger
  providers: ProviderTile[]
  probedAt: string
}
