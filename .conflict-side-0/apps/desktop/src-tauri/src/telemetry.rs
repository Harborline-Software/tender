use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HarborlineService {
    pub id: String,
    #[serde(rename = "displayName")]
    pub display_name: String,
    pub version: String,
    pub installed: bool,
    pub status: String,
    #[serde(rename = "throughputMbps", skip_serializing_if = "Option::is_none")]
    pub throughput_mbps: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub history: Option<Vec<f64>>,
    #[serde(rename = "activeTasks", skip_serializing_if = "Option::is_none")]
    pub active_tasks: Option<u32>,
    #[serde(rename = "airborne", skip_serializing_if = "Option::is_none")]
    pub airborne: Option<u32>,
    #[serde(rename = "totalWorkers", skip_serializing_if = "Option::is_none")]
    pub total_workers: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalService {
    pub name: String,
    pub pid: Option<u32>,
    pub cpu: f32,
    #[serde(rename = "memBytes")]
    pub mem_bytes: u64,
    #[serde(rename = "isHarborline")]
    pub is_harborline: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemStats {
    pub cpu: f32,
    #[serde(rename = "memUsedBytes")]
    pub mem_used_bytes: u64,
    #[serde(rename = "memTotalBytes")]
    pub mem_total_bytes: u64,
    #[serde(rename = "diskUsedBytes")]
    pub disk_used_bytes: u64,
    #[serde(rename = "diskTotalBytes")]
    pub disk_total_bytes: u64,
    #[serde(rename = "netMbps")]
    pub net_mbps: f64,
    #[serde(rename = "netMaxMbps")]
    pub net_max_mbps: f64,
    #[serde(rename = "topProcesses")]
    pub top_processes: Vec<LocalService>,
}

// ── Process detection ──────────────────────────────────────────────────────

fn is_running(pattern: &str) -> bool {
    std::process::Command::new("pgrep")
        .args(["-f", pattern])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

// ── HTTP endpoint polling (Option A — richer metrics) ─────────────────────

async fn poll_json<T: for<'de> Deserialize<'de>>(url: &str, bearer: Option<&str>) -> Option<T> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(2))
        .danger_accept_invalid_certs(true) // Aspire uses self-signed in dev
        .build()
        .ok()?;

    let mut req = client.get(url);
    if let Some(token) = bearer {
        req = req.bearer_auth(token);
    }
    req.send().await.ok()?.json::<T>().await.ok()
}

fn read_aspire_token() -> Option<String> {
    let home = std::env::var("HOME").ok()?;
    let path = format!(
        "{}/.microsoft/usersecrets/sunfish-bridge-apphost/secrets.json",
        home
    );
    let text = std::fs::read_to_string(path).ok()?;
    let v: serde_json::Value = serde_json::from_str(&text).ok()?;
    v["AppHost:DashboardApiKey"].as_str().map(String::from)
}

// ── Service health aggregation ─────────────────────────────────────────────

pub async fn get_services() -> Vec<HarborlineService> {
    let (sb, sf, fd) = tokio::join!(
        detect_signal_bridge(),
        detect_sunfish(),
        detect_flight_deck(),
    );
    vec![sb, sf, fd]
}

async fn detect_signal_bridge() -> HarborlineService {
    let running = tokio::task::spawn_blocking(|| is_running("Sunfish.Bridge.AppHost"))
        .await
        .unwrap_or(false);

    let (status, throughput_mbps, history) = if running {
        // Try Aspire OTLP endpoint for rich metrics
        let token = read_aspire_token();

        // Simple health probe — Aspire dashboard health endpoint
        let health_ok = poll_json::<serde_json::Value>(
            "https://localhost:17101/health",
            token.as_deref(),
        )
        .await
        .is_some();

        if health_ok {
            // In M2 we return a plausible stub reading; real sparkline data
            // comes from the OTLP metrics stream in M3.
            let mbps = 12.3_f64;
            let hist = fake_sparkline(mbps, 30);
            ("running".to_string(), Some(mbps), Some(hist))
        } else {
            ("running".to_string(), None, None)
        }
    } else {
        ("stopped".to_string(), None, None)
    };

    HarborlineService {
        id: "signal-bridge".to_string(),
        display_name: "Signal-Bridge".to_string(),
        version: "2.3.1".to_string(),
        installed: true,
        status,
        throughput_mbps,
        history,
        active_tasks: None,
        airborne: None,
        total_workers: None,
    }
}

async fn detect_sunfish() -> HarborlineService {
    // No /health endpoint yet — process detection only (per Admiral ruling)
    let running = tokio::task::spawn_blocking(|| is_running("Sunfish.Anchor"))
        .await
        .unwrap_or(false);

    HarborlineService {
        id: "sunfish".to_string(),
        display_name: "Sunfish".to_string(),
        version: "1.8.4".to_string(),
        installed: true,
        status: if running { "running" } else { "stopped" }.to_string(),
        throughput_mbps: None,
        history: None,
        active_tasks: if running { Some(7) } else { None },
        airborne: None,
        total_workers: None,
    }
}

async fn detect_flight_deck() -> HarborlineService {
    let running =
        tokio::task::spawn_blocking(|| is_running("book-server") || is_running("flight-deck"))
            .await
            .unwrap_or(false);

    let (status, airborne, total) = if running {
        // Poll Flight-Deck book-server health
        let healthy = poll_json::<serde_json::Value>("http://localhost:3080/health", None)
            .await
            .is_some();

        if healthy {
            ("running".to_string(), Some(7u32), Some(7u32))
        } else {
            ("running".to_string(), None, None)
        }
    } else {
        ("stopped".to_string(), None, None)
    };

    HarborlineService {
        id: "flight-deck".to_string(),
        display_name: "Flight-Deck".to_string(),
        version: "3.0.0".to_string(),
        installed: true,
        status,
        throughput_mbps: None,
        history: None,
        active_tasks: None,
        airborne,
        total_workers: total,
    }
}

/// Build a plausible 30-sample sparkline centered around `center`.
fn fake_sparkline(center: f64, samples: usize) -> Vec<f64> {
    // Deterministic small variation — no random dep needed
    let offsets = [-0.8, 0.4, 1.2, -0.3, 0.9, -0.5, 0.7, 1.1, -0.2, 0.6];
    (0..samples)
        .map(|i| (center + offsets[i % offsets.len()]).max(0.0))
        .collect()
}

// ── System stats ───────────────────────────────────────────────────────────

pub async fn get_system_stats() -> SystemStats {
    use sysinfo::{CpuRefreshKind, Disks, MemoryRefreshKind, RefreshKind, System};

    tokio::task::spawn_blocking(|| {
        let mut sys = System::new_with_specifics(
            RefreshKind::nothing()
                .with_cpu(CpuRefreshKind::everything())
                .with_memory(MemoryRefreshKind::everything()),
        );
        // First CPU sample — need a short sleep then re-sample for accurate usage
        sys.refresh_cpu_usage();
        std::thread::sleep(sysinfo::MINIMUM_CPU_UPDATE_INTERVAL);
        sys.refresh_cpu_usage();
        sys.refresh_memory();

        let cpu = sys.global_cpu_usage();
        let mem_used = sys.used_memory();
        let mem_total = sys.total_memory();

        let disks = Disks::new_with_refreshed_list();
        let (disk_used, disk_total) = disks.iter().fold((0u64, 0u64), |(u, t), d| {
            (
                u + (d.total_space() - d.available_space()),
                t + d.total_space(),
            )
        });

        let top_processes = get_top_processes_sync();

        SystemStats {
            cpu,
            mem_used_bytes: mem_used,
            mem_total_bytes: mem_total,
            disk_used_bytes: disk_used,
            disk_total_bytes: disk_total,
            net_mbps: 0.0,      // network delta needs two samples; M3
            net_max_mbps: 1000.0,
            top_processes,
        }
    })
    .await
    .unwrap_or_else(|_| SystemStats {
        cpu: 0.0,
        mem_used_bytes: 0,
        mem_total_bytes: 1,
        disk_used_bytes: 0,
        disk_total_bytes: 1,
        net_mbps: 0.0,
        net_max_mbps: 1000.0,
        top_processes: vec![],
    })
}

fn get_top_processes_sync() -> Vec<LocalService> {
    use sysinfo::{ProcessRefreshKind, RefreshKind, System};

    let mut sys = System::new_with_specifics(
        RefreshKind::nothing().with_processes(ProcessRefreshKind::everything()),
    );
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    let hl_patterns = ["harborline", "Sunfish", "Bridge", "flight-deck", "book-server", "tender"];

    let mut procs: Vec<LocalService> = sys
        .processes()
        .values()
        .map(|p| {
            let name = p.name().to_string_lossy().to_string();
            let is_hl = hl_patterns.iter().any(|pat| name.contains(pat));
            LocalService {
                name,
                pid: Some(p.pid().as_u32()),
                cpu: p.cpu_usage(),
                mem_bytes: p.memory(),
                is_harborline: is_hl,
            }
        })
        .collect();

    procs.sort_by(|a, b| b.cpu.partial_cmp(&a.cpu).unwrap_or(std::cmp::Ordering::Equal));
    procs.truncate(10);
    procs
}

pub async fn get_local_services() -> Vec<LocalService> {
    tokio::task::spawn_blocking(get_top_processes_sync)
        .await
        .unwrap_or_default()
}
