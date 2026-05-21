import { invoke } from '@tauri-apps/api/core'

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
