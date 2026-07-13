use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::time::Duration;

use crate::catalog::{self, AppManifest};
use crate::install_config::{self, InstalledApp};

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
    let mut builder = reqwest::Client::builder().timeout(Duration::from_secs(2));
    // Dev escape hatch ONLY: disable TLS verification when TENDER_INSECURE_TLS is
    // set (e.g. Aspire's self-signed dev certs). Default = full TLS verification.
    if std::env::var("TENDER_INSECURE_TLS").is_ok() {
        builder = builder.danger_accept_invalid_certs(true);
    }
    let client = builder.build().ok()?;

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
    // Generic detection (CFG-1 §8): loop the catalog ∪ install-state instead of
    // hardcoding three apps. The catalog (`<id>.app.json`) supplies id, display
    // name, process pattern, and health URL — no more magic constants. Adding an
    // app is now dropping a manifest.
    //
    // Fail-soft throughout: a missing catalog OR a missing install config yields
    // empty records; an unmanaged-but-running app still surfaces via the
    // manifest's process/health detection below.
    let catalog = catalog::load_catalog();
    let config = install_config::load();

    // Detect each catalog app concurrently. Each task owns its manifest +
    // managed record (cheap clones) so it is `'static` — no extra crate needed.
    let mut set = tokio::task::JoinSet::new();
    for (idx, manifest) in catalog.iter().enumerate() {
        let manifest = manifest.clone();
        let managed = config.app(&manifest.id).cloned();
        set.spawn(async move { (idx, detect_from_manifest(&manifest, managed.as_ref()).await) });
    }

    // Collect, then restore the catalog's (id-sorted) order so the UI is stable.
    let mut results: Vec<(usize, HarborlineService)> = Vec::with_capacity(catalog.len());
    while let Some(joined) = set.join_next().await {
        if let Ok(pair) = joined {
            results.push(pair);
        }
    }
    results.sort_by_key(|(idx, _)| *idx);
    results.into_iter().map(|(_, svc)| svc).collect()
}

/// Honest `installed`/`version` for a service.
///
/// `installed` is true when Tender **manages** the app (recorded in install
/// config) **or** the app is currently **detectable** (running) — i.e. present
/// on this box in some form. A box with neither reports `installed: false`
/// (the former code hardcoded `true`, which lied on a fresh machine).
///
/// `version` is the **recorded** version of a Tender-managed install; for an
/// unmanaged-but-running app Tender does not yet know the real version
/// (a probe is a C3 concern), so it reports `"unknown"` rather than a fiction.
///
/// This is the C1 honest rule; the catalog DTO resolution shares the same logic
/// (`catalog::honest_install`).
fn honest_install(managed: Option<&InstalledApp>, running: bool) -> (bool, String) {
    catalog::honest_install(managed, running)
}

/// Whether the app's process is running, per its manifest's detection spec.
///
/// When the manifest declares a `healthUrl`, an HTTP-200 from it is the running
/// signal (Aspire self-signed certs are tolerated in dev); otherwise the
/// `pgrep -f <processPattern>` match is the signal. This replaces the three
/// hardcoded `is_running(...)` constants with the per-manifest values.
async fn detect_running(detect: &catalog::DetectSpec) -> bool {
    if let Some(url) = &detect.health_url {
        // A health URL is the canonical liveness signal when present. Fall back
        // to the process match if the probe fails (the app may be up with the
        // health endpoint not yet bound, or behind auth — process is honest).
        let token = read_aspire_token();
        if poll_json::<serde_json::Value>(url, token.as_deref())
            .await
            .is_some()
        {
            return true;
        }
    }
    let pattern = detect.process_pattern.clone();
    tokio::task::spawn_blocking(move || is_running(&pattern))
        .await
        .unwrap_or(false)
}

/// Generic per-manifest detection (CFG-1 §8). Produces one `HarborlineService`
/// from a manifest:
///   - `id` / `displayName`  ← the manifest (de-hardcoded);
///   - `installed` / `version` ← the C1 honest rule (UNCHANGED);
///   - `status` ← the manifest's `processPattern` / `healthUrl`.
///
/// The former per-app rich-metric enrichment (signal-bridge throughput /
/// sunfish task counts / flight-deck airborne stub fields) is dropped to `None`
/// — those were M2-era stub fictions; the contract field stays so the current
/// frontend keeps working unchanged. Real metrics return in a later cohort.
async fn detect_from_manifest(
    manifest: &AppManifest,
    managed: Option<&InstalledApp>,
) -> HarborlineService {
    let running = detect_running(&manifest.detect).await;
    let (installed, version) = honest_install(managed, running);

    HarborlineService {
        id: manifest.id.clone(),
        display_name: manifest.display_name.clone(),
        version,
        installed,
        status: if running { "running" } else { "stopped" }.to_string(),
        throughput_mbps: None,
        history: None,
        active_tasks: None,
        airborne: None,
        total_workers: None,
    }
}

// ── Fleet DTO resolution (CFG-1 — the state-driven Fleet tab surface) ───────

/// Resolve the per-app Fleet state for the future state-driven Fleet UI
/// (CFG-1 deliverable 4). For each catalog app it composes the manifest with
/// the honest live install/run state (`installed`/`version` per the C1 rule,
/// `status` per the manifest's detect spec, `visibleInEndUserMode` per the §5
/// readiness gate). This is the NEW surface (`FleetEntry`) distinct from the
/// legacy `HarborlineService` list `get_services` returns.
pub async fn get_fleet() -> Vec<catalog::FleetEntry> {
    let catalog = catalog::load_catalog();
    let config = install_config::load();

    // Probe each app's running state concurrently (each task owns its detect
    // spec ⇒ `'static`), then fold the (pure) catalog ∪ install-state composition.
    let mut set = tokio::task::JoinSet::new();
    for manifest in &catalog {
        let id = manifest.id.clone();
        let detect = manifest.detect.clone();
        set.spawn(async move { (id, detect_running(&detect).await) });
    }
    let mut running_by_id: BTreeMap<String, bool> = BTreeMap::new();
    while let Some(joined) = set.join_next().await {
        if let Ok((id, running)) = joined {
            running_by_id.insert(id, running);
        }
    }

    let entries = catalog::resolve_fleet_entries(&catalog, &config, &running_by_id);
    // Apply the dev/end-user mode gate (CFG-2 / §10): end-user mode shows only
    // `released` apps (`visibleInEndUserMode`), so not-ready apps are honestly
    // hidden; dev mode shows everything (caveats surfaced in the UI).
    filter_fleet_by_mode(entries, crate::settings::load().mode)
}

/// Apply the §10 readiness gate to a resolved fleet. End-user mode retains only
/// entries visible in end-user mode (`released`); dev mode passes all through.
/// Pure (mode in) so it is unit-testable without touching the settings file.
fn filter_fleet_by_mode(
    entries: Vec<catalog::FleetEntry>,
    mode: crate::settings::Mode,
) -> Vec<catalog::FleetEntry> {
    match mode {
        crate::settings::Mode::Dev => entries,
        crate::settings::Mode::EndUser => entries
            .into_iter()
            .filter(|e| e.visible_in_end_user_mode)
            .collect(),
    }
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

    // "tender" + "Tender" stay for a transition period: an unrestarted prior
    // install (or a stale process during upgrade) still runs the old
    // `tender`-named binary. "Harborline Toolbox" is this app's own process
    // name post-rename (`mainBinaryName` in tauri.conf.json) — self-inclusion
    // in "is this a Harborline process" is correct, not a bug.
    let hl_patterns = [
        "harborline",
        "Harborline Toolbox",
        "Sunfish",
        "Bridge",
        "flight-deck",
        "book-server",
        "tender",
        "Tender",
    ];

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::install_config::LaunchContract;
    use crate::profile::CapabilityProfile;

    fn managed(version: &str) -> InstalledApp {
        InstalledApp {
            id: "sunfish".to_string(),
            version: version.to_string(),
            install_path: "/opt/sunfish".to_string(),
            profile: CapabilityProfile::minimum_floor(),
            launch: LaunchContract {
                program: "/opt/sunfish/run".to_string(),
                args: vec![],
                health_url: None,
            },
        }
    }

    #[test]
    fn managed_app_reports_recorded_version() {
        let app = managed("0.3.0-dev");
        let (installed, version) = honest_install(Some(&app), false);
        assert!(installed, "a Tender-managed app is installed even if stopped");
        assert_eq!(version, "0.3.0-dev");
    }

    #[test]
    fn unmanaged_running_app_is_installed_with_unknown_version() {
        // Dev-from-source: not Tender-managed but running ⇒ present, version
        // honestly unknown (no fiction).
        let (installed, version) = honest_install(None, true);
        assert!(installed);
        assert_eq!(version, "unknown");
    }

    #[test]
    fn unmanaged_stopped_app_is_not_installed() {
        // The case the old hardcoded `installed: true` lied about.
        let (installed, version) = honest_install(None, false);
        assert!(!installed);
        assert_eq!(version, "");
    }

    // ── Generic detection (CFG-1 §8) ────────────────────────────────────────

    /// A manifest whose process pattern will never match a real process and
    /// declares no health URL ⇒ a deterministic `running = false` probe.
    fn absent_manifest(id: &str, display: &str) -> AppManifest {
        let json = format!(
            r#"{{
              "id": "{id}",
              "displayName": "{display}",
              "availability": "packaged",
              "detect": {{ "processPattern": "tender-nonexistent-proc-{id}-zzz", "healthUrl": null }},
              "install": {{ "sourceKind": "appBundle", "requiresSigning": false }}
            }}"#
        );
        serde_json::from_str(&json).expect("parse absent manifest")
    }

    #[tokio::test]
    async fn generic_detection_managed_app_is_installed_with_recorded_version() {
        // Managed but its (nonexistent) process is not running ⇒ installed via
        // the C1 managed rule, recorded version, status stopped. Carries the
        // manifest's id + displayName (de-hardcoded).
        let manifest = absent_manifest("sunfish", "Sunfish");
        let app = managed("0.4.0-dev");
        let svc = detect_from_manifest(&manifest, Some(&app)).await;

        assert_eq!(svc.id, "sunfish");
        assert_eq!(svc.display_name, "Sunfish");
        assert!(svc.installed, "managed ⇒ installed even when stopped");
        assert_eq!(svc.version, "0.4.0-dev");
        assert_eq!(svc.status, "stopped");
    }

    #[tokio::test]
    async fn generic_detection_absent_app_is_not_installed() {
        // Neither managed nor running ⇒ not installed, empty version, stopped.
        // The case the old hardcoded `installed: true` lied about, now driven
        // generically from the manifest.
        let manifest = absent_manifest("signal-bridge", "Signal-Bridge");
        let svc = detect_from_manifest(&manifest, None).await;

        assert_eq!(svc.id, "signal-bridge");
        assert!(!svc.installed);
        assert_eq!(svc.version, "");
        assert_eq!(svc.status, "stopped");
        // The dropped M2-era rich-metric fields are honestly None now.
        assert!(svc.throughput_mbps.is_none());
        assert!(svc.active_tasks.is_none());
        assert!(svc.airborne.is_none());
    }

    // ── Mode gate (CFG-2 §10) ────────────────────────────────────────────────

    fn fleet_entry(id: &str, released: bool) -> catalog::FleetEntry {
        let json = format!(
            r#"{{ "id":"{id}", "displayName":"{id}",
                  "availability":"{}",
                  "detect":{{ "processPattern":"x" }},
                  "install":{{ "sourceKind":"appBundle", "requiresSigning":false }} }}"#,
            if released { "released" } else { "packaged" }
        );
        let manifest: AppManifest = serde_json::from_str(&json).expect("manifest");
        catalog::FleetEntry {
            manifest,
            installed: false,
            version: String::new(),
            status: "stopped".to_string(),
            visible_in_end_user_mode: released,
        }
    }

    #[test]
    fn dev_mode_shows_all_apps() {
        let entries = vec![fleet_entry("a", true), fleet_entry("b", false)];
        let out = filter_fleet_by_mode(entries, crate::settings::Mode::Dev);
        assert_eq!(out.len(), 2);
    }

    #[test]
    fn end_user_mode_hides_non_released_apps() {
        let entries = vec![fleet_entry("released-app", true), fleet_entry("packaged-app", false)];
        let out = filter_fleet_by_mode(entries, crate::settings::Mode::EndUser);
        assert_eq!(out.len(), 1, "end-user shows only released apps");
        assert_eq!(out[0].manifest.id, "released-app");
    }
}
