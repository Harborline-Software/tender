// Tauri commands — all return mock data for Milestone 1.
// Real implementations: Milestone 2 (telemetry) + Milestone 3 (devices/updates).
// IPC contract defined in src/state/types.ts mirrors these shapes.

use serde::{Deserialize, Serialize};

// ── Types (mirrors src/state/types.ts) ────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Device {
    pub hostname: String,
    pub ip: String,
    pub os: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kind: Option<String>,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_seen: Option<String>,
    pub is_this: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HarborlineService {
    pub id: String,
    pub display_name: String,
    pub version: String,
    pub installed: bool,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SystemStats {
    pub cpu: f64,
    pub mem_used_bytes: u64,
    pub mem_total_bytes: u64,
    pub disk_used_bytes: u64,
    pub disk_total_bytes: u64,
    pub net_mbps: f64,
    pub net_max_mbps: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LocalService {
    pub name: String,
    pub pid: Option<u32>,
    pub cpu: f64,
    pub mem_bytes: u64,
    pub is_harborline: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub name: String,
    pub path: String,
    pub status: String,
}

// ── Mock commands ──────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_devices() -> Vec<Device> {
    vec![
        Device {
            hostname: "local".into(),
            ip: "127.0.0.1".into(),
            os: "WIN".into(),
            kind: Some("workstation".into()),
            status: "online".into(),
            last_seen: None,
            is_this: true,
        },
    ]
}

#[tauri::command]
pub fn get_services() -> Vec<HarborlineService> {
    vec![
        HarborlineService { id: "signal-bridge".into(), display_name: "Signal-Bridge".into(), version: "v2.3.1".into(), installed: true, status: "stopped".into() },
        HarborlineService { id: "sunfish".into(),       display_name: "Sunfish".into(),       version: "v1.8.4".into(), installed: true, status: "stopped".into() },
        HarborlineService { id: "flight-deck".into(),   display_name: "Flight-Deck".into(),   version: "v3.0.0".into(), installed: true, status: "stopped".into() },
    ]
}

#[tauri::command]
pub fn get_system_stats() -> SystemStats {
    SystemStats {
        cpu: 12.4,
        mem_used_bytes: 8 * 1024 * 1024 * 1024,
        mem_total_bytes: 32 * 1024 * 1024 * 1024,
        disk_used_bytes: 120 * 1024 * 1024 * 1024,
        disk_total_bytes: 512 * 1024 * 1024 * 1024,
        net_mbps: 1.2,
        net_max_mbps: 1000.0,
    }
}

#[tauri::command]
pub fn get_local_services() -> Vec<LocalService> {
    vec![
        LocalService { name: "harborline-router".into(),       pid: Some(1234), cpu: 0.4, mem_bytes: 148 * 1024 * 1024, is_harborline: true },
        LocalService { name: "harborline-update-agent".into(), pid: Some(1235), cpu: 0.0, mem_bytes: 24  * 1024 * 1024, is_harborline: true },
        LocalService { name: "postgres".into(),                pid: Some(2100), cpu: 1.2, mem_bytes: 512 * 1024 * 1024, is_harborline: false },
        LocalService { name: "redis-server".into(),            pid: Some(2101), cpu: 0.1, mem_bytes: 48  * 1024 * 1024, is_harborline: false },
    ]
}

#[tauri::command]
pub fn get_projects() -> Vec<Project> {
    vec![
        Project { name: "harborline-software".into(), path: "C:\\Projects\\Harborline-Software".into(), status: "active".into() },
        Project { name: "sunfish".into(),             path: "C:\\Projects\\Harborline-Software\\sunfish".into(), status: "active".into() },
        Project { name: "signal-bridge".into(),       path: "C:\\Projects\\Harborline-Software\\signal-bridge".into(), status: "active".into() },
        Project { name: "flight-deck".into(),         path: "C:\\Projects\\Harborline-Software\\flight-deck".into(), status: "paused".into() },
        Project { name: "tender".into(),              path: "C:\\Projects\\Harborline-Software\\tender".into(), status: "active".into() },
    ]
}

#[tauri::command]
pub fn check_updates() -> Vec<serde_json::Value> {
    // No updates until the release pipeline is decided (Admiral UPF pending).
    vec![]
}

#[tauri::command]
pub async fn restart_service(_id: String) -> Result<(), String> {
    // M2: wire to Windows service manager / process spawn.
    Ok(())
}

#[tauri::command]
pub async fn graceful_shutdown() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({ "stopped": [], "failed": [] }))
}

#[tauri::command]
pub async fn collect_logs() -> Result<String, String> {
    Ok("%APPDATA%\\Tender\\logs".into())
}

#[tauri::command]
pub async fn open_in_editor(project_path: String) -> Result<(), String> {
    let _ = std::process::Command::new("code").arg(&project_path).spawn();
    Ok(())
}
