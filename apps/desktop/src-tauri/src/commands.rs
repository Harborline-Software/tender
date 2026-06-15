use crate::{bundles, devices, projects, telemetry};

// ── Log file path resolution ───────────────────────────────────────────────

/// Canonical log file paths for each service identifier.
/// Returns `(stdout_path, stderr_path)` tuples where available.
/// Services launched via LaunchAgent have fixed redirect paths.
/// Services launched manually write to `~/.harborline/logs/<id>.log`
/// when that convention is honoured; we fall back gracefully if absent.
fn log_paths_for_service(service_id: &str) -> Vec<std::path::PathBuf> {
    let home = match std::env::var("HOME") {
        Ok(h) => h,
        Err(_) => return vec![],
    };
    let coord = format!("{}/Projects/Harborline-Software/coordination", home);
    let hl_logs = format!("{}/.harborline/logs", home);

    match service_id {
        "coordination-sync" => vec![
            format!("{}/.sync-stdout.log", coord).into(),
            format!("{}/.sync-stderr.log", coord).into(),
        ],
        "archive-rollup" => vec![
            format!("{}/.archive-rollup-stdout.log", coord).into(),
            format!("{}/.archive-rollup-stderr.log", coord).into(),
        ],
        "qm-daemon" => vec![
            format!("{}/.qm-daemon-stdout.log", coord).into(),
            format!("{}/.qm-daemon-stderr.log", coord).into(),
            format!("{}/.qm-daemon.log", coord).into(),
        ],
        "agent-revival-daemon" => vec![
            format!("{}/.agent-revival-daemon-stdout.log", coord).into(),
            format!("{}/.agent-revival-daemon-stderr.log", coord).into(),
        ],
        // Manually-started services: check ~/.harborline/logs/<id>.log
        id => vec![
            format!("{}/{}.log", hl_logs, id).into(),
        ],
    }
}

/// Read the tail of a log file — returns the last `lines` lines as a Vec.
/// Returns an empty Vec if the file does not exist yet.
fn tail_file(path: &std::path::Path, lines: usize) -> std::io::Result<Vec<String>> {
    use std::io::{BufRead, BufReader, Read, Seek, SeekFrom};
    use std::fs::File;

    let mut f = match File::open(path) {
        Ok(f) => f,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(vec![]),
        Err(e) => return Err(e),
    };

    // For small files just read everything; for larger files seek from end.
    let size = f.seek(SeekFrom::End(0))?;
    let chunk = (lines as u64 * 200).min(size); // ~200 bytes/line heuristic
    let start = if size > chunk { size - chunk } else { 0 };
    f.seek(SeekFrom::Start(start))?;

    let mut buf = String::new();
    f.read_to_string(&mut buf)?;

    // If we seeked mid-line, discard the partial first line
    let trimmed = if start > 0 {
        if let Some(nl) = buf.find('\n') {
            &buf[nl + 1..]
        } else {
            &buf
        }
    } else {
        &buf
    };

    let all_lines: Vec<String> = BufReader::new(std::io::Cursor::new(trimmed))
        .lines()
        .filter_map(|l| l.ok())
        .collect();

    let tail_start = if all_lines.len() > lines {
        all_lines.len() - lines
    } else {
        0
    };

    Ok(all_lines[tail_start..].to_vec())
}

#[tauri::command]
pub fn get_appearance(window: tauri::WebviewWindow) -> String {
    #[cfg(target_os = "macos")]
    {
        use tauri::Theme;
        match window.theme().unwrap_or(Theme::Dark) {
            Theme::Light => "light".to_string(),
            _ => "dark".to_string(),
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = window;
        "dark".to_string()
    }
}

#[tauri::command]
pub async fn get_services() -> Vec<telemetry::HarborlineService> {
    telemetry::get_services().await
}

#[tauri::command]
pub async fn get_system_stats() -> telemetry::SystemStats {
    telemetry::get_system_stats().await
}

#[tauri::command]
pub async fn get_local_services() -> Vec<telemetry::LocalService> {
    telemetry::get_local_services().await
}

#[tauri::command]
pub async fn get_devices() -> Vec<devices::TailscaleDevice> {
    devices::get_devices().await
}

#[tauri::command]
pub fn open_external(url: String) {
    let _ = std::process::Command::new("open").arg(&url).spawn();
}

#[tauri::command]
pub fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

// ── M4 action commands ─────────────────────────────────────────────────────

/// Send an emergency-stop signal to Flight-Deck.
/// POSTs to the local Flight-Deck API which relays to GPU workers on the
/// Windows host. Returns Ok("stopped") on HTTP 2xx, Err(reason) otherwise.
#[tauri::command]
pub async fn emergency_stop() -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .post("http://localhost:3080/api/admin/emergency-stop")
        .send()
        .await
        .map_err(|e| format!("Flight-Deck unreachable: {}", e))?;

    if resp.status().is_success() {
        Ok("stopped".to_string())
    } else {
        Err(format!("Flight-Deck returned {}", resp.status()))
    }
}

/// Kill any running Signal-Bridge AppHost processes and restart the AppHost
/// from the fleet-standard location relative to the user's home directory.
/// Returns Ok("restarting") when the restart process launches, Err on failure.
#[tauri::command]
pub async fn restart_signal_bridge() -> Result<String, String> {
    // Kill existing Bridge processes
    let _ = std::process::Command::new("pkill")
        .args(["-f", "Sunfish.Bridge"])
        .output();

    // Short settle delay before relaunch
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;

    // Construct fleet-standard AppHost path
    let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
    let apphost = format!(
        "{}/Projects/Harborline-Software/signal-bridge/Sunfish.Bridge.AppHost",
        home
    );

    std::process::Command::new("dotnet")
        .args(["run", "--project", &apphost])
        .spawn()
        .map_err(|e| format!("Failed to restart Bridge: {}", e))?;

    Ok("restarting".to_string())
}

/// Collect a diagnostic snapshot — system stats, service statuses, top
/// processes — and write to ~/Desktop/tender-diag-{timestamp}.txt.
/// Returns the file path so the frontend can call open_external on it.
#[tauri::command]
pub async fn collect_diagnostics() -> Result<String, String> {
    use std::fmt::Write as FmtWrite;

    let stats = crate::telemetry::get_system_stats().await;
    let services = crate::telemetry::get_services().await;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let mut out = String::new();
    let _ = writeln!(out, "Tender Fleet Diagnostics");
    let _ = writeln!(out, "Timestamp : {}", now);
    let _ = writeln!(out, "");
    let _ = writeln!(out, "── System ──────────────────────────────────────");
    let _ = writeln!(out, "CPU       : {:.1}%", stats.cpu);
    let _ = writeln!(
        out,
        "Memory    : {} / {} GiB",
        stats.mem_used_bytes / 1_073_741_824,
        stats.mem_total_bytes / 1_073_741_824
    );
    let _ = writeln!(
        out,
        "Disk      : {} / {} GiB",
        stats.disk_used_bytes / 1_073_741_824,
        stats.disk_total_bytes / 1_073_741_824
    );
    let _ = writeln!(out, "");
    let _ = writeln!(out, "── Fleet Services ──────────────────────────────");
    for svc in &services {
        let _ = writeln!(
            out,
            "{:<20} v{}  {}",
            svc.display_name, svc.version, svc.status
        );
    }
    let _ = writeln!(out, "");
    let _ = writeln!(out, "── Top Processes ───────────────────────────────");
    for p in &stats.top_processes {
        let _ = writeln!(
            out,
            "  {:>6}  {:<40} cpu={:.1}%  mem={}MiB",
            p.pid.unwrap_or(0),
            p.name,
            p.cpu,
            p.mem_bytes / 1_048_576
        );
    }

    let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
    let path = format!("{}/Desktop/tender-diag-{}.txt", home, now);
    std::fs::write(&path, &out).map_err(|e| format!("Write failed: {}", e))?;

    Ok(path)
}

// ── M6 Phase 1 — per-service log viewer ───────────────────────────────────

/// Return the last `lines` lines from the log file(s) for the given service.
///
/// When a service has multiple candidate log files (e.g. stdout + stderr),
/// all are merged in order. Lines from each file are prefixed with a short
/// source tag (e.g. `[stdout]`, `[stderr]`, `[qm-daemon.log]`) so the
/// viewer can distinguish them when multiple files are merged.
///
/// Returns `Ok(vec![])` for services with no log file present yet (normal
/// for manually-started services that have never run since boot). Returns
/// `Err` only on unexpected I/O failures.
#[tauri::command]
pub async fn get_log_tail(service_id: String, lines: Option<u32>) -> Result<Vec<String>, String> {
    let n = lines.unwrap_or(200) as usize;

    let paths = tokio::task::spawn_blocking(move || log_paths_for_service(&service_id))
        .await
        .map_err(|e| format!("Task join error: {}", e))?;

    if paths.is_empty() {
        return Ok(vec!["[no log paths configured for this service]".to_string()]);
    }

    let mut result: Vec<String> = Vec::new();

    for path in &paths {
        let file_name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "log".to_string());

        let path_clone = path.clone();
        let tail = tokio::task::spawn_blocking(move || tail_file(&path_clone, n))
            .await
            .map_err(|e| format!("Task join error: {}", e))?
            .map_err(|e| format!("Read error on {}: {}", file_name, e))?;

        if tail.is_empty() {
            // File absent or empty — emit a placeholder only if it's the sole file
            if paths.len() == 1 {
                result.push(format!("[{}] (no log output yet)", file_name));
            }
        } else {
            // Prefix each line with the source filename when multiple files are merged
            if paths.len() > 1 {
                let tag = derive_log_tag(&file_name);
                for line in tail {
                    result.push(format!("[{}] {}", tag, line));
                }
            } else {
                result.extend(tail);
            }
        }
    }

    // Return the last `n` lines across all merged sources
    if result.len() > n {
        let start = result.len() - n;
        Ok(result[start..].to_vec())
    } else {
        Ok(result)
    }
}

/// Convert a log filename to a short display tag.
fn derive_log_tag(filename: &str) -> &str {
    if filename.contains("stdout") {
        "out"
    } else if filename.contains("stderr") {
        "err"
    } else {
        "log"
    }
}

// ── Q6 bundle manifest commands ────────────────────────────────────────────

/// Return all bundle manifests from the fleet-layout filesystem path.
///
/// Reads `$HOME/Projects/Harborline-Software/shipyard/packages/foundation-catalog/
/// Manifests/Bundles/*.bundle.json` on every call per H3.A (load-on-panel-open,
/// no caching). Returns an `Err` string if the directory is absent or no
/// manifests parse cleanly.
#[tauri::command]
pub fn get_bundle_manifests() -> Result<Vec<bundles::BusinessCaseBundleManifest>, String> {
    bundles::read_bundle_manifests()
}

/// Return plugin health records for all provider requirements across all bundles.
///
/// Q6 v1: all records carry `status: "unknown"` per H4.A ruling. No HTTP probing
/// is performed — the status "unknown" is honest UX: Tender cannot determine
/// provider health without an HTTP hop that falls outside Q6 scope.
///
/// Reads manifests fresh on each call (consistent with H3.A cadence).
#[tauri::command]
pub fn get_plugin_health() -> Result<Vec<bundles::PluginHealthRecord>, String> {
    let manifests = bundles::read_bundle_manifests()?;
    Ok(bundles::build_plugin_health_records(&manifests))
}

// ── R10 Q6 v2 — live provider health from Bridge admin endpoint ───────────

/// Fetch live provider-health records from the Bridge admin/providers endpoint.
///
/// Returns a Vec of `ProviderHealthRecord` on success. Each record carries a
/// `status` discriminant:
///   - `ok`                — configured + reachability probe returned ok
///   - `error`             — configured but probe returned an error
///   - `notProbed`         — configured, no probe registered for this contract
///   - `unconfigured`      — env-var absent; mock fallback is active
///   - `authRequired`      — Bridge returned 401/403 (Tender not authenticated)
///   - `bridgeUnreachable` — cannot reach Bridge at the configured URL
///   - `unknown`           — unexpected Bridge response
///
/// Falls back gracefully: if Bridge is not running the caller gets a single
/// `bridgeUnreachable` record rather than an `Err`.
///
/// Base URL: `TENDER_BRIDGE_BASE_URL` env var, default `http://localhost:5000`.
#[tauri::command]
pub async fn get_live_provider_health(
) -> Result<Vec<crate::provider_health::ProviderHealthRecord>, String> {
    crate::provider_health::fetch_provider_health().await
}

// ── Hardware probe (ADR 0116 D1) ─────────────────────────────────────────────

/// Probe the host hardware and return a `HardwareProfile` plus probe-quality
/// metadata (ADR 0116 D1). Read-only, side-effect-free, and **never errors** —
/// a partial probe returns best-effort values with `keyingComplete: false` so
/// the profile mapping can fail safe to `minimum` (ADR 0116 H2). Best-effort
/// GPU/battery fields are honestly `null` (unknown) rather than guessed (H1).
#[tauri::command]
pub async fn probe_hardware() -> crate::probe::ProbeResult {
    crate::probe::probe_hardware().await
}

/// Probe the host and return the profile Tender recommends for it (ADR 0116
/// D2/H4), paired with the probe so the UI can show the recommendation's basis.
/// Fail-safe to `minimum` when the probe's keying is incomplete (H2).
#[tauri::command]
pub async fn recommend_profile() -> crate::profile::ProfileRecommendation {
    let probe = crate::probe::probe_hardware().await;
    let recommended = crate::profile::CapabilityProfile::recommend(&probe);
    crate::profile::ProfileRecommendation { probe, recommended }
}

/// Return Tender's persisted install config — the source of truth for what
/// Tender manages (honest `installed`/`version`, launch contracts). Fail-soft:
/// a missing/unreadable config yields an empty record (nothing managed).
#[tauri::command]
pub fn get_install_config() -> crate::install_config::InstallConfig {
    crate::install_config::load()
}

// ── Local install (C3) ───────────────────────────────────────────────────────

/// Install a Harborline app from a LOCAL source: place the bundle under Tender's
/// managed apps dir + record it in install config (honest installed/version +
/// launch contract). Does NOT launch — call `launch_app` for the ADR 0115
/// hand-off. Runs on a blocking thread (filesystem copy).
#[tauri::command]
pub async fn install_app_local(
    request: crate::install::InstallRequest,
) -> crate::install::InstallOutcome {
    tokio::task::spawn_blocking(move || crate::install::install_app_local(&request))
        .await
        .unwrap_or_else(|e| crate::install::InstallOutcome {
            app_id: String::new(),
            status: crate::install::InstallStatus::Failed,
            install_path: None,
            detail: Some(format!("install task did not complete: {e}")),
        })
}

/// Launch a Tender-managed app off its recorded launch contract and hand off to
/// the app's OWN ADR 0115 supervisor (Tender does not supervise the sidecar).
#[tauri::command]
pub async fn launch_app(app_id: String) -> crate::install::InstallOutcome {
    tokio::task::spawn_blocking(move || crate::install::launch_app(&app_id))
        .await
        .unwrap_or_else(|e| crate::install::InstallOutcome {
            app_id: String::new(),
            status: crate::install::InstallStatus::Failed,
            install_path: None,
            detail: Some(format!("launch task did not complete: {e}")),
        })
}

// ── Projects ───────────────────────────────────────────────────────────────

/// Return the operator's project list.
///
/// Resolution order:
///   1. `~/Library/Application Support/Tender/projects.json` (curated list)
///   2. Autodiscovery: git repos under `~/Projects/` (depth ≤ 2)
///
/// Returns an empty list when neither source is available. Never returns
/// an error — the frontend shows an empty state instead.
#[tauri::command]
pub fn get_projects() -> Vec<projects::ProjectEntry> {
    projects::get_projects()
}
