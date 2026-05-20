// Mock data for Milestone 1 + 2.
// Replace with real Tauri invoke() calls when M2 IPC is wired.

import type { Device, HarborlineService, LocalService, Project, SystemStats } from '../state/types';

export const MOCK_DEVICES: Device[] = [
  { hostname: 'steamtide-w11',    ip: '100.74.12.1', os: 'WIN', kind: 'workstation', status: 'online',  isThis: true },
  { hostname: 'harbor-mac-air',   ip: '100.74.12.4', os: 'MAC',                      status: 'online',  isThis: false },
  { hostname: 'harbor-prod-01',   ip: '100.74.12.7', os: 'LNX', kind: 'server',      status: 'online',  isThis: false },
  { hostname: 'harbor-test-02',   ip: '100.74.12.8', os: 'LNX', kind: 'server',      status: 'idle',    isThis: false },
  { hostname: 'old-sloop-rig',    ip: '100.74.13.2', os: 'LNX',                      status: 'offline', lastSeen: '2h ago', isThis: false },
];

export const MOCK_SERVICES: HarborlineService[] = [
  { id: 'signal-bridge', displayName: 'Signal-Bridge', version: 'v2.3.1', installed: true, status: 'stopped' },
  { id: 'sunfish',       displayName: 'Sunfish',       version: 'v1.8.4', installed: true, status: 'stopped' },
  { id: 'flight-deck',  displayName: 'Flight-Deck',   version: 'v3.0.0', installed: true, status: 'stopped' },
];

export const MOCK_SYSTEM_STATS: SystemStats = {
  cpu: 12.4,
  memUsedBytes:  8  * 1024 ** 3,
  memTotalBytes: 32 * 1024 ** 3,
  diskUsedBytes:  120 * 1024 ** 3,
  diskTotalBytes: 512 * 1024 ** 3,
  netMbps: 1.2,
  netMaxMbps: 1000,
  topProcesses: [],
};

export const MOCK_LOCAL_SERVICES: LocalService[] = [
  { name: 'harborline-router',       pid: 1234, cpu: 0.4, memBytes: 148 * 1024 * 1024, isHarborline: true },
  { name: 'harborline-update-agent', pid: 1235, cpu: 0.0, memBytes: 24  * 1024 * 1024, isHarborline: true },
  { name: 'postgres',                pid: 2100, cpu: 1.2, memBytes: 512 * 1024 * 1024, isHarborline: false },
  { name: 'redis-server',            pid: 2101, cpu: 0.1, memBytes: 48  * 1024 * 1024, isHarborline: false },
  { name: 'docker-daemon',           pid: 2200, cpu: 2.1, memBytes: 380 * 1024 * 1024, isHarborline: false },
];

export const MOCK_PROJECTS: Project[] = [
  { name: 'harborline-software',  path: 'C:\\Projects\\Harborline-Software',              status: 'active'   },
  { name: 'sunfish',              path: 'C:\\Projects\\Harborline-Software\\sunfish',      status: 'active'   },
  { name: 'signal-bridge',        path: 'C:\\Projects\\Harborline-Software\\signal-bridge',status: 'active'   },
  { name: 'flight-deck',          path: 'C:\\Projects\\Harborline-Software\\flight-deck',  status: 'paused'   },
  { name: 'tender',               path: 'C:\\Projects\\Harborline-Software\\tender',       status: 'active'   },
];

// Dial values (M1 mock — static; M2 will use polling)
export const MOCK_DIAL_SIGNAL_BRIDGE = { value: 0, max: 100, reading: '--',  sub: 'MB/S'   };
export const MOCK_DIAL_SUNFISH       = { value: 0, max: 10,  reading: '--',  sub: 'TASKS'  };
export const MOCK_DIAL_FLIGHT_DECK   = { value: 0, max: 7,   reading: '--',  sub: 'OF 7'   };
