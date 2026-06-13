import { invoke } from '@tauri-apps/api/core'
import type { BusinessCaseBundleManifest, ProviderCategory } from '@sunfish/contracts'

export type { BusinessCaseBundleManifest, ProviderCategory }

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

// ── Invoke wrappers ──────────────────────────────────────────────────────────

export async function getAppearance(): Promise<'dark' | 'light'> {
  const result = await invoke<string>('get_appearance')
  return result === 'light' ? 'light' : 'dark'
}

export async function getServices(): Promise<ServiceData[]> {
  return invoke<ServiceData[]>('get_services')
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

export async function emergencyStop(): Promise<string> {
  return invoke<string>('emergency_stop')
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
