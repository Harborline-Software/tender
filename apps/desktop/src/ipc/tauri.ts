import { invoke as tauriInvoke } from '@tauri-apps/api/core'
import { DEV_MOCKS } from './devMocks'
import type { BusinessCaseBundleManifest, ProviderCategory } from '@/vendor/sunfish-contracts'

/** True only inside the Tauri runtime (the built app); false in a plain browser. */
const IN_TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/**
 * IPC call wrapper. In a browser dev session (DEV + not Tauri) it returns mock
 * data for commands in `DEV_MOCKS` so the panel renders without the backend;
 * otherwise it delegates to the real Tauri `invoke`. Never mocks in the built
 * app (`IN_TAURI` is true there).
 */
function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!IN_TAURI && import.meta.env.DEV && cmd in DEV_MOCKS) {
    const mock = DEV_MOCKS[cmd]
    // Some mocks are functions of the call args (e.g. host-parameterized Ships
    // probes) so browser-dev renders each honest state; the rest are static.
    const value = typeof mock === 'function' ? (mock as (a?: Record<string, unknown>) => unknown)(args) : mock
    return Promise.resolve(value as T)
  }
  return tauriInvoke<T>(cmd, args)
}
import type { FleetEntry } from '@/state/types'

export type { BusinessCaseBundleManifest, ProviderCategory }
export type { FleetEntry } from '@/state/types'

/** Health status for a provider slot — Q6 v1 always returns "unknown" (H4.A). */
export type PluginHealthStatus = 'unknown' | 'ok' | 'degraded' | 'missing'

/** Health record for a single provider requirement from a bundle. */
export interface PluginHealthRecord {
  bundleKey: string
  providerCategory: ProviderCategory
  isRequired: boolean
  purpose?: string | null
  status: PluginHealthStatus
}

// ── R10 live provider health types ───────────────────────────────────────────

/**
 * Live probe status for a Tier-2 category-provider slot.
 * Mirrors the Rust `ProbeStatus` enum (serde camelCase).
 */
export type ProbeStatus =
  | 'ok'
  | 'error'
  | 'notProbed'
  | 'unconfigured'
  | 'authRequired'
  | 'bridgeUnreachable'
  | 'unknown'

/**
 * Live health record for a single Tier-2 provider slot.
 * Returned by `get_live_provider_health` Tauri command.
 */
export interface ProviderHealthRecord {
  /** Vendor-neutral contract name, e.g. "IEmailProvider". */
  providerSlot: string
  /** Environment variable key that activates the real adapter. */
  envVarKey: string
  /** Whether the env-var is set (real adapter active in Bridge). */
  configured: boolean
  /** Whether Bridge is using the mock fallback. */
  usingMock: boolean
  /** Resolved probe status. */
  status: ProbeStatus
  /** Short detail for the Error state (from Bridge or Tender). */
  statusDetail?: string | null
}

// ── Backend wire types (match Rust serde field names) ────────────────────────

export interface ServiceData {
  id: string
  displayName: string
  version: string
  installed: boolean
  status: string
  throughputMbps?: number
  history?: number[]
  activeTasks?: number
  airborne?: number
  totalWorkers?: number
}

export interface ProcessData {
  name: string
  pid?: number
  cpu: number
  memBytes: number
  isHarborline: boolean
}

export interface StatsData {
  cpu: number
  memUsedBytes: number
  memTotalBytes: number
  diskUsedBytes: number
  diskTotalBytes: number
  netMbps: number
  netMaxMbps: number
  topProcesses: ProcessData[]
}

export interface DeviceData {
  hostname: string
  tailscaleIPs: string[]
  online: boolean
  os: string
  isCurrentDevice: boolean
}

export interface ProjectData {
  name: string
  path: string
  status: 'active' | 'paused' | 'archived'
  lastOpened?: string | null
}

// ── Invoke wrappers ──────────────────────────────────────────────────────────

export async function getAppearance(): Promise<'dark' | 'light'> {
  const result = await invoke<string>('get_appearance')
  return result === 'light' ? 'light' : 'dark'
}

export async function getServices(): Promise<ServiceData[]> {
  return invoke<ServiceData[]>('get_services')
}

/**
 * Resolved per-app Fleet state (CFG-1) for the state-driven Fleet tab:
 * `{ manifest, installed, version, status, visibleInEndUserMode }` per catalog
 * app. The NEW catalog-driven surface, distinct from `getServices` (which the
 * current UI still consumes). Fail-soft: an empty list when no catalog/config.
 */
export async function getFleet(): Promise<FleetEntry[]> {
  return invoke<FleetEntry[]>('get_fleet')
}

export async function getSystemStats(): Promise<StatsData> {
  return invoke<StatsData>('get_system_stats')
}

export async function getLocalServices(): Promise<ProcessData[]> {
  return invoke<ProcessData[]>('get_local_services')
}

export async function getDevices(): Promise<DeviceData[]> {
  return invoke<DeviceData[]>('get_devices')
}

export async function openExternal(url: string): Promise<void> {
  return invoke('open_external', { url })
}

export async function quitApp(): Promise<void> {
  return invoke('quit_app')
}

/**
 * Open the full Toolbox main window (dual-surface, shipyard #2973), optionally
 * focused on a section or a specific item. Shows the decorated window, flips the
 * macOS activation policy to Regular (Dock icon appears), and emits
 * `toolbox-navigate` so the window pre-selects the target.
 *
 * @param target `<section>` (e.g. `"fleet"`) or `<section>:<item>`
 *   (e.g. `"console:logs"`). Omit to open on the default section.
 */
export async function openToolbox(target?: string): Promise<void> {
  return invoke('open_toolbox', { section: target ?? null })
}

export async function emergencyStop(): Promise<string> {
  return invoke<string>('emergency_stop')
}

/** Outcome of a graceful stop attempt for one catalog service (Dry Dock). */
export interface StopOutcome {
  id: string
  displayName: string
  stopped: boolean
  detail?: string
}

/** Gracefully SIGTERM every running catalog service; never force-kills. */
export async function stopServices(): Promise<StopOutcome[]> {
  return invoke<StopOutcome[]>('stop_services')
}

export async function restartSignalBridge(): Promise<string> {
  return invoke<string>('restart_signal_bridge')
}

export async function collectDiagnostics(): Promise<string> {
  return invoke<string>('collect_diagnostics')
}

export async function getLogTail(serviceId: string, lines?: number): Promise<string[]> {
  return invoke<string[]>('get_log_tail', { serviceId, lines })
}

/**
 * Return projects discovered from the operator's app support directory or fleet layout.
 *
 * Reads `~/Library/Application Support/Tender/projects.json` when present.
 * Falls back to autodiscovering git repos in `~/Projects/` (depth 2).
 * Returns an empty list when neither source is available — never errors.
 */
export async function getProjects(): Promise<ProjectData[]> {
  return invoke<ProjectData[]>('get_projects')
}

// ── Q6 bundle manifest commands ───────────────────────────────────────────────

/**
 * Load all bundle manifests from the fleet-layout filesystem path.
 *
 * Reads fresh on every call (no caching, per H3.A load-on-panel-open ruling).
 * Throws a string error if the manifest directory is absent or unparseable.
 */
export async function getBundleManifests(): Promise<BusinessCaseBundleManifest[]> {
  return invoke<BusinessCaseBundleManifest[]>('get_bundle_manifests')
}

/**
 * Return plugin health records for all provider requirements.
 *
 * Q6 v1: all records carry status "unknown" (H4.A ruling — no probing).
 * Reads manifests fresh on every call (consistent with H3.A cadence).
 */
export async function getPluginHealth(): Promise<PluginHealthRecord[]> {
  return invoke<PluginHealthRecord[]>('get_plugin_health')
}

/**
 * Fetch live provider health from the Bridge admin/providers endpoint.
 *
 * Returns one record per registered Tier-2 provider slot, with real
 * configuration + reachability status. When Bridge is unreachable a single
 * synthetic record with status "bridgeUnreachable" is returned.
 *
 * Never throws — individual and aggregate failures are captured in
 * each record's `status` field.
 */
export async function getLiveProviderHealth(): Promise<ProviderHealthRecord[]> {
  return invoke<ProviderHealthRecord[]>('get_live_provider_health')
}

// ── R8 backup commands ────────────────────────────────────────────────────────

import type { BackupEntry, SyncStatus } from '@/state/types'
export type { BackupEntry, SyncStatus }

/**
 * List existing backup archives (newest-first).
 *
 * @param backupDir Optional operator-chosen directory. Falls back to
 *   ~/Documents/Harborline-Backups/ when omitted.
 */
export async function listBackups(backupDir?: string): Promise<BackupEntry[]> {
  return invoke<BackupEntry[]>('list_backups', { backupDir })
}

/**
 * Create a new backup snapshot (DB + Stronghold vault).
 * DEK is backed up WRAPPED — no plaintext key export.
 *
 * @param backupDir Optional operator-chosen directory.
 */
export async function runBackup(backupDir?: string): Promise<BackupEntry> {
  return invoke<BackupEntry>('run_backup', { backupDir })
}

/**
 * Restore from a specific archive path.
 *
 * DESTRUCTIVE: overwrites the live Sunfish data directory.
 * The caller must obtain explicit operator confirmation before calling this.
 *
 * @param archivePath Absolute path to the .tar.gz backup archive.
 */
export async function restoreBackupFromArchive(archivePath: string): Promise<string> {
  return invoke<string>('restore_backup', { archivePath })
}

/**
 * Return the current sync / relay status.
 * Performs a fast TCP probe to the Bridge relay host.
 * v1 single-device reality: relay emit is deferred (R-3); reports
 * SingleDevice state when the relay is reachable but not yet active.
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  return invoke<SyncStatus>('get_sync_status')
}

// ── CFG-3a install / commission commands ─────────────────────────────────────

import type { ProfileRecommendation, InstallRequest, InstallOutcome } from '@/state/types'
export type { ProfileRecommendation, InstallRequest, InstallOutcome }

/**
 * Probe the host hardware and recommend a CapabilityProfile.
 * Used during Commission to pre-fill the install profile.
 */
export async function recommendProfile(): Promise<ProfileRecommendation> {
  return invoke<ProfileRecommendation>('recommend_profile')
}

/**
 * Install a locally-sourced app bundle under a resolved capability profile.
 * Corresponds to the C3 `install_app_local` command.
 */
export async function installAppLocal(request: InstallRequest): Promise<InstallOutcome> {
  return invoke<InstallOutcome>('install_app_local', { request })
}

/**
 * Launch an already-installed app via its recorded launch contract.
 * Corresponds to the C3 `launch_app` command.
 */
export async function launchApp(appId: string): Promise<InstallOutcome> {
  return invoke<InstallOutcome>('launch_app', { appId })
}

// ── CFG-2 settings / mode commands ───────────────────────────────────────────

import type { TenderSettings, Mode } from '@/state/types'
export type { TenderSettings, Mode }

/** Read Tender's persisted settings (mode, …). Fail-soft to `dev`. */
export async function getSettings(): Promise<TenderSettings> {
  return invoke<TenderSettings>('get_settings')
}

/**
 * Set the dev/end-user mode + persist; returns the updated settings.
 * End-user mode gates `get_fleet` to `released` apps only.
 */
export async function setMode(mode: Mode): Promise<TenderSettings> {
  return invoke<TenderSettings>('set_mode', { mode })
}

// ── CFG-3b install config read ────────────────────────────────────────────────

import type { InstallConfig } from '@/state/types'
export type { InstallConfig }

/**
 * Read Tender's persisted install config (managed apps + profiles).
 * Fail-soft: returns a config with an empty `apps` record when no config
 * exists yet (fresh box / first run).
 */
export async function getInstallConfig(): Promise<InstallConfig> {
  return invoke<InstallConfig>('get_install_config')
}

// ── Cross-zoo model inventory (Toolbox #137, ONR survey slice G1) ────────────

import type { InventoryGroup } from '@/state/types'
export type { InventoryGroup, ModelEntry, BackendKind, InventoryStatus } from '@/state/types'

/**
 * Probe every configured AI backend (Ollama, TTS, ComfyUI, Stability Matrix)
 * and return the union INSTALLED-model inventory, one group per backend.
 *
 * Never throws — a per-backend probe failure (unreachable host, missing
 * directory, unconfigured optional backend) is captured honestly in that
 * group's `status`/`detail`, never rendered as a silent empty list.
 */
export async function getModelInventory(): Promise<InventoryGroup[]> {
  return invoke<InventoryGroup[]>('get_model_inventory')
}

// ── VRAM residency (Toolbox #137, ONR survey slice G2) ───────────────────────

import type { GpuResidencySnapshot } from '@/state/types'
export type { GpuResidencySnapshot, GpuHeadline, ResidencyRow, ResidencyStatus } from '@/state/types'

/**
 * Probe `nvidia-smi` (headline + per-PID list) and each backend's own
 * "what's loaded" signal, correlate, and return the GPU residency snapshot.
 *
 * Never throws — a GPU-host-unreachable probe is captured honestly in the
 * snapshot's rows, never rendered as a silent empty/zeroed pane.
 */
export async function getGpuResidency(): Promise<GpuResidencySnapshot> {
  return invoke<GpuResidencySnapshot>('get_gpu_residency')
}

// ── Paid-compute pane (Toolbox #137, ONR survey slice G3) ────────────────────

import type { PaidComputeSnapshot } from '@/state/types'
export type {
  PaidComputeSnapshot, GatewayLedger, VkeyRow, BudgetInfo, LedgerStatus,
  ProviderTile, ProviderKind, ProviderStatus,
} from '@/state/types'

/**
 * Read the paid-compute view: the Bifrost gateway ledger (per-virtual-key usage
 * vs budget — the authoritative gateway-routed spend) + the paid-provider
 * roster (OpenRouter/fal WRAP-API tiles read via the winhub key slot;
 * Modal/Recraft deep-link tiles).
 *
 * Never throws — the ledger's reachability and each tile's own status carry any
 * failure honestly, and a paid credential never reaches this process (secret is
 * dropped at the Rust parse boundary; balance keys stay on winhub).
 */
export async function getPaidCompute(): Promise<PaidComputeSnapshot> {
  return invoke<PaidComputeSnapshot>('get_paid_compute')
}

// ── Remote ship service control (shipyard#2998) ──────────────────────────────

/** How a service is classified by the vendored allowlist (the control guard). */
export type ShipClass = 'essential' | 'reclaimable'

/** Live remote service status — 'unknown' is honest, never a guess. */
export type ShipStatus = 'running' | 'stopped' | 'unknown'

export interface ShipService {
  name: string
  classification: ShipClass
  status: ShipStatus
  /** True ONLY for reclaimable services — the UI reads this to decide whether
   *  to render a Start/Stop control (mirrors the Rust guard; never inferred). */
  canControl: boolean
}

export interface ShipHostSummary {
  id: string
  displayName: string
  sshTarget: string
  /** Whether a vendored classification exists for this host. */
  classified: boolean
}

export interface ShipsSnapshot {
  hostId: string
  displayName: string
  sshTarget: string
  reachable: boolean
  /** ssh / probe detail when unreachable — surfaced honestly, never hidden. */
  detail?: string | null
  classified: boolean
  services: ShipService[]
  /** Vendored classification source filename (staleness surfaced in the UI). */
  classificationSource?: string | null
  memFreeBytes?: number | null
  memTotalBytes?: number | null
  probedAt: string
}

export interface ShipActionOutcome {
  hostId: string
  serviceName: string
  action: 'start' | 'stop'
  ok: boolean
  /** Re-queried post-state — the VERIFIED status, never assumed. */
  verifiedStatus: ShipStatus
  detail?: string | null
  memFreeBeforeBytes?: number | null
  memFreeAfterBytes?: number | null
}

/** List the allow-listed remote hosts for the Ships view. */
export async function getShipHosts(): Promise<ShipHostSummary[]> {
  return invoke<ShipHostSummary[]>('get_ship_hosts')
}

/**
 * Probe one host's fleet services + memory over the operator's ssh identity.
 * Never throws — an unreachable host is captured as `reachable=false`.
 */
export async function getShipServices(hostId: string): Promise<ShipsSnapshot> {
  return invoke<ShipsSnapshot>('get_ship_services', { hostId })
}

/**
 * Start or stop ONE reclaimable service, returning a VERIFIED post-state.
 * Rejects (throws a string) unless the host is allow-listed, the name clears
 * the charset guard, and the service exists AND classifies reclaimable.
 */
export async function setShipService(
  hostId: string,
  serviceName: string,
  action: 'start' | 'stop',
): Promise<ShipActionOutcome> {
  return invoke<ShipActionOutcome>('set_ship_service', { hostId, serviceName, action })
}
