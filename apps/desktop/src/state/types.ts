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

export type Screen = { kind: 'main' } | { kind: 'detail'; id: DetailId }

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
  appId: HarborlineService['id']
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
