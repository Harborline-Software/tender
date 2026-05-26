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

export type Screen = { kind: 'main' } | { kind: 'detail'; id: DetailId }
