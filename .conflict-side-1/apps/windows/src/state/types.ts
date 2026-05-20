// Data shapes — mirrors the Tauri command return types in commands.rs.
// All times are ISO 8601 strings; sizes are bytes.

export interface Device {
  hostname: string;
  ip: string;
  os: 'WIN' | 'MAC' | 'LNX';
  kind?: 'workstation' | 'server';
  status: 'online' | 'idle' | 'offline';
  lastSeen?: string;
  isThis: boolean;
}

export interface HarborlineService {
  id: 'signal-bridge' | 'sunfish' | 'flight-deck';
  displayName: string;
  version: string;
  installed: boolean;
  status: 'running' | 'idle' | 'stopped' | 'error';
  updateAvailable?: PendingUpdate;
}

export interface Project {
  name: string;
  path: string;
  status: 'active' | 'paused' | 'archived';
  lastOpened?: string;
}

export interface LocalService {
  name: string;
  pid?: number;
  cpu: number;
  memBytes: number;
  isHarborline: boolean;
}

export interface SystemStats {
  cpu: number;
  memUsedBytes: number;
  memTotalBytes: number;
  diskUsedBytes: number;
  diskTotalBytes: number;
  netMbps: number;
  netMaxMbps: number;
  topProcesses: LocalService[];
}

export interface PendingUpdate {
  service: HarborlineService['id'] | 'tender';
  fromVersion: string;
  toVersion: string;
  sizeBytes: number;
  releaseNotes: ReleaseNote[];
  publishedAt: string;
}

export interface ReleaseNote {
  kind: 'new' | 'fix' | 'perf';
  text: string;
}

// Screen navigation
export type DetailId =
  | 'signal-bridge'
  | 'sunfish'
  | 'flight-deck'
  | 'engine-room'
  | 'dock-settings'
  | 'dry-dock'
  | 'release-notes';

export type Screen = { kind: 'main' } | { kind: 'detail'; id: DetailId };
