use crate::{devices, telemetry};

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
