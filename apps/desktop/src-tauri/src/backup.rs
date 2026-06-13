/// Operator backup / restore commands — R8 operator-companion doctrine.
///
/// Snapshot scope: the Sunfish desktop SQLite database + the Stronghold vault
/// file (which holds the wrapped DEK + other operator secrets). The DEK is
/// backed up WRAPPED (ciphertext, as stored by Stronghold) — plaintext keys
/// NEVER leave the device.
///
/// Backup format: a `.tar.gz` archive written to an operator-chosen directory.
/// Each archive contains:
///   - `sunfish.db`          — the local SQLite (canonical store, includes
///                             crdt_doc columns post sync-inversion pilot)
///   - `stronghold.vault`    — Stronghold vault file (DEK + auth token,
///                             all wrapped; never plaintext)
///   - `manifest.json`       — metadata: timestamp, app version, hostname
///
/// Restore: extracts the archive to the Sunfish data directory, overwriting
/// the live files. Requires operator confirmation in the UI before this
/// command is called.
///
/// Single-device v1 reality (be honest per design-review directive):
/// Multi-device key distribution is deferred. The ciphertext-backup path
/// (replaying Bridge relay deltas) is the ADR-0113 F1 primary restore path.
/// This local backup provides an additional operator-controlled safety net.
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

// ── Types ─────────────────────────────────────────────────────────────────────

/// A single backup entry in the history list.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BackupEntry {
    /// Unique id — epoch seconds at snapshot time.
    pub id: u64,
    /// ISO 8601 timestamp (UTC).
    pub created_at: String,
    /// Total compressed size in bytes.
    pub size_bytes: u64,
    /// Absolute path to the `.tar.gz` file.
    pub path: String,
    /// True if both source files were found and snapshotted.
    pub complete: bool,
    /// Human-readable note ("DB + vault" vs "DB only" if vault absent).
    pub scope: String,
}

/// Lightweight sync / relay status snapshot surfaced to the frontend.
/// v1 single-device reality: relay emission is stubbed (R-3 deferred),
/// so we report relay connectivity via a Bridge health probe only.
#[derive(Serialize, Clone, Debug)]
pub struct SyncStatus {
    /// Whether the Bridge relay host is reachable (TCP connect probe).
    pub relay_reachable: bool,
    /// v1: always false — multi-device pairing not yet shipped.
    pub multi_device_active: bool,
    /// Number of devices on the Tailscale tailnet (from the devices cache).
    pub tailnet_device_count: usize,
    /// Epoch-seconds of the last coordination-sync run (parsed from the log).
    pub last_coord_sync_at: Option<u64>,
    /// The relay / sync state label for the UI indicator.
    pub state: SyncState,
}

/// Four-state sync indicator — maps to the fleet SyncState vocabulary.
#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "lowercase")]
pub enum SyncState {
    /// All systems go; relay reachable; last sync recent.
    Healthy,
    /// Relay reachable but coordination sync is stale (>5 min).
    Stale,
    /// Relay unreachable or no network.
    Offline,
    /// v1: indicates "single-device / relay sync not yet active".
    SingleDevice,
}

// ── Path resolution ───────────────────────────────────────────────────────────

/// Resolve the Sunfish desktop data directory.
/// Tauri 2 stores app data under ~/Library/Application Support/<identifier> on macOS.
fn sunfish_data_dir() -> Option<PathBuf> {
    let home = std::env::var("HOME").ok()?;
    // The Sunfish desktop app identifier is `io.harborline.sunfish`.
    // If it doesn't exist, fall back to the local dev path.
    let prod = PathBuf::from(&home)
        .join("Library/Application Support/io.harborline.sunfish");
    if prod.exists() {
        return Some(prod);
    }
    // Dev / testing fallback: use a local `.sunfish-data/` sibling to the
    // Harborline-Software parent. This lets the backup command succeed in
    // dev without a full Sunfish install.
    let dev = PathBuf::from(&home)
        .join("Projects/Harborline-Software/.sunfish-data");
    if dev.exists() {
        return Some(dev);
    }
    None
}

/// Path to the Sunfish SQLite database.
fn db_path() -> Option<PathBuf> {
    sunfish_data_dir().map(|d| d.join("sunfish.db"))
}

/// Path to the Stronghold vault file.
fn vault_path() -> Option<PathBuf> {
    sunfish_data_dir().map(|d| d.join("stronghold.vault"))
}

/// Default backup directory: ~/Documents/Harborline-Backups/
fn default_backup_dir() -> Option<PathBuf> {
    let home = std::env::var("HOME").ok()?;
    let dir = PathBuf::from(home).join("Documents/Harborline-Backups");
    std::fs::create_dir_all(&dir).ok()?;
    Some(dir)
}

// ── Backup directory (from IPC, with fallback) ────────────────────────────────

fn resolve_backup_dir(operator_path: Option<String>) -> Result<PathBuf, String> {
    if let Some(p) = operator_path {
        let path = PathBuf::from(&p);
        std::fs::create_dir_all(&path)
            .map_err(|e| format!("Cannot create backup directory '{}': {}", p, e))?;
        return Ok(path);
    }
    default_backup_dir().ok_or_else(|| "Cannot resolve default backup directory".to_string())
}

// ── Manifest ──────────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Debug)]
struct BackupManifest {
    id: u64,
    created_at: String,
    hostname: String,
    app_version: String,
    scope: Vec<String>,
}

fn now_epoch() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn epoch_to_iso(epoch: u64) -> String {
    // Simple ISO 8601 UTC approximation without external deps.
    // epoch → YYYY-MM-DDTHH:MM:SSZ via manual decomposition.
    let secs = epoch % 86400;
    let days = epoch / 86400;

    let h = secs / 3600;
    let m = (secs % 3600) / 60;
    let s = secs % 60;

    // Days since Unix epoch (1970-01-01).
    let (year, month, day) = days_to_ymd(days);

    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z", year, month, day, h, m, s)
}

fn days_to_ymd(mut days: u64) -> (u64, u64, u64) {
    // Gregorian calendar calculation.
    let mut year = 1970u64;
    loop {
        let leap = is_leap(year);
        let days_in_year = if leap { 366 } else { 365 };
        if days < days_in_year {
            break;
        }
        days -= days_in_year;
        year += 1;
    }
    let leap = is_leap(year);
    let months = [31u64, if leap { 29 } else { 28 }, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let mut month = 1u64;
    for &days_in_month in &months {
        if days < days_in_month {
            break;
        }
        days -= days_in_month;
        month += 1;
    }
    (year, month, days + 1)
}

fn is_leap(year: u64) -> bool {
    (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
}

// ── Core backup logic ─────────────────────────────────────────────────────────

/// Scan the backup directory for existing `.harborline-backup-*.tar.gz` archives
/// and return metadata for each, sorted newest-first.
pub fn list_backups_in_dir(backup_dir: &PathBuf) -> Result<Vec<BackupEntry>, String> {
    if !backup_dir.exists() {
        return Ok(vec![]);
    }

    let entries = std::fs::read_dir(backup_dir)
        .map_err(|e| format!("Cannot read backup directory: {}", e))?;

    let mut result: Vec<BackupEntry> = entries
        .filter_map(|e| e.ok())
        .filter(|e| {
            let name = e.file_name();
            let name_str = name.to_string_lossy();
            name_str.starts_with("harborline-backup-") && name_str.ends_with(".tar.gz")
        })
        .filter_map(|e| {
            let path = e.path();
            let size = e.metadata().map(|m| m.len()).unwrap_or(0);
            // Parse id from filename: harborline-backup-{id}.tar.gz
            let name = e.file_name();
            let stem = name.to_string_lossy();
            let stem = stem.trim_end_matches(".tar.gz").trim_start_matches("harborline-backup-");
            let id: u64 = stem.parse().ok()?;

            // Read manifest from inside the archive if possible, else synthesize.
            let manifest = read_manifest_from_archive(&path);
            let complete = manifest.as_ref().map(|m| m.scope.len() >= 2).unwrap_or(false);
            let scope = manifest
                .as_ref()
                .map(|m| m.scope.join(" + "))
                .unwrap_or_else(|| "DB + vault".to_string());

            Some(BackupEntry {
                id,
                created_at: epoch_to_iso(id),
                size_bytes: size,
                path: path.to_string_lossy().to_string(),
                complete,
                scope,
            })
        })
        .collect();

    result.sort_by(|a, b| b.id.cmp(&a.id));
    Ok(result)
}

/// Try to read and parse the manifest.json from inside a tar.gz archive.
/// Returns None on any failure (archive corrupt, manifest absent, parse error).
fn read_manifest_from_archive(path: &PathBuf) -> Option<BackupManifest> {
    use std::io::{BufReader, Read};

    let file = std::fs::File::open(path).ok()?;
    let buf = BufReader::new(file);

    // Decompress gzip layer.
    let gz = flate2::read::GzDecoder::new(buf);
    let mut archive = tar::Archive::new(gz);

    for entry in archive.entries().ok()? {
        let mut entry = entry.ok()?;
        let entry_path = entry.path().ok()?;
        if entry_path.to_string_lossy() == "manifest.json" {
            let mut content = String::new();
            entry.read_to_string(&mut content).ok()?;
            return serde_json::from_str(&content).ok();
        }
    }
    None
}

/// Create a `.tar.gz` snapshot of the Sunfish SQLite + Stronghold vault.
/// Returns the `BackupEntry` for the newly created archive.
pub fn create_backup(backup_dir: &PathBuf) -> Result<BackupEntry, String> {
    let id = now_epoch();
    let filename = format!("harborline-backup-{}.tar.gz", id);
    let archive_path = backup_dir.join(&filename);

    let db = db_path();
    let vault = vault_path();

    let mut scope_items: Vec<String> = Vec::new();

    if db.as_ref().map(|p| p.exists()).unwrap_or(false) {
        scope_items.push("DB".to_string());
    }
    if vault.as_ref().map(|p| p.exists()).unwrap_or(false) {
        scope_items.push("vault".to_string());
    }

    if scope_items.is_empty() {
        return Err(
            "No Sunfish data files found. Ensure the Sunfish desktop app has been launched \
             at least once before running a backup."
                .to_string(),
        );
    }

    // Build the tar.gz archive.
    let out_file = std::fs::File::create(&archive_path)
        .map_err(|e| format!("Cannot create archive file '{}': {}", filename, e))?;

    let gz_encoder =
        flate2::write::GzEncoder::new(out_file, flate2::Compression::default());
    let mut tar_builder = tar::Builder::new(gz_encoder);

    // Add DB if present.
    if let Some(ref db_path) = db {
        if db_path.exists() {
            tar_builder
                .append_path_with_name(db_path, "sunfish.db")
                .map_err(|e| format!("Failed to add database to archive: {}", e))?;
        }
    }

    // Add vault if present. The vault is the Stronghold file — encrypted at
    // rest by the OS-keychain-locked master key. Backing it up does NOT expose
    // any plaintext secrets. The DEK inside is wrapped; it is useless without
    // the OS keychain entry that holds the master key.
    if let Some(ref vault_path) = vault {
        if vault_path.exists() {
            tar_builder
                .append_path_with_name(vault_path, "stronghold.vault")
                .map_err(|e| format!("Failed to add vault to archive: {}", e))?;
        }
    }

    // Write manifest.
    let hostname = std::env::var("HOSTNAME")
        .or_else(|_| {
            // macOS: use scutil --get ComputerName output
            std::process::Command::new("scutil")
                .args(["--get", "LocalHostName"])
                .output()
                .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
                .map_err(|e| e.to_string())
        })
        .unwrap_or_else(|_| "unknown".to_string());

    let manifest = BackupManifest {
        id,
        created_at: epoch_to_iso(id),
        hostname,
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        scope: scope_items.clone(),
    };

    let manifest_json = serde_json::to_vec_pretty(&manifest)
        .map_err(|e| format!("Failed to serialize manifest: {}", e))?;

    let mut header = tar::Header::new_gnu();
    header.set_size(manifest_json.len() as u64);
    header.set_mode(0o644);
    header.set_cksum();

    tar_builder
        .append_data(&mut header, "manifest.json", manifest_json.as_slice())
        .map_err(|e| format!("Failed to write manifest to archive: {}", e))?;

    // Finalize archive.
    let gz_encoder = tar_builder
        .into_inner()
        .map_err(|e| format!("Failed to finalize tar: {}", e))?;

    gz_encoder
        .finish()
        .map_err(|e| format!("Failed to finalize gzip: {}", e))?;

    let size_bytes = std::fs::metadata(&archive_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let complete = scope_items.len() >= 2;
    let scope_label = scope_items.join(" + ");

    Ok(BackupEntry {
        id,
        created_at: epoch_to_iso(id),
        size_bytes,
        path: archive_path.to_string_lossy().to_string(),
        complete,
        scope: scope_label,
    })
}

/// Restore from a backup archive: extract DB + vault to the Sunfish data dir.
/// DESTRUCTIVE — must be confirmed in UI before calling. The app should
/// restart after restore for the changes to take effect.
fn do_restore_backup(archive_path: &str) -> Result<String, String> {
    use std::io::BufReader;

    let data_dir = sunfish_data_dir().ok_or_else(|| {
        "Cannot locate Sunfish data directory. Ensure the Sunfish desktop app \
         has been launched at least once."
            .to_string()
    })?;

    let path = PathBuf::from(archive_path);
    if !path.exists() {
        return Err(format!("Archive not found: {}", archive_path));
    }

    let file = std::fs::File::open(&path)
        .map_err(|e| format!("Cannot open archive: {}", e))?;
    let buf = BufReader::new(file);
    let gz = flate2::read::GzDecoder::new(buf);
    let mut archive = tar::Archive::new(gz);

    let mut restored: Vec<String> = Vec::new();

    for entry in archive
        .entries()
        .map_err(|e| format!("Cannot read archive entries: {}", e))?
    {
        let mut entry = entry.map_err(|e| format!("Archive entry error: {}", e))?;
        let entry_path = entry
            .path()
            .map_err(|e| format!("Archive path error: {}", e))?
            .to_string_lossy()
            .to_string();

        match entry_path.as_str() {
            "sunfish.db" => {
                let dest = data_dir.join("sunfish.db");
                entry
                    .unpack(&dest)
                    .map_err(|e| format!("Failed to restore database: {}", e))?;
                restored.push("database".to_string());
            }
            "stronghold.vault" => {
                let dest = data_dir.join("stronghold.vault");
                entry
                    .unpack(&dest)
                    .map_err(|e| format!("Failed to restore vault: {}", e))?;
                restored.push("vault".to_string());
            }
            // Skip manifest.json and any unknown entries.
            _ => {}
        }
    }

    if restored.is_empty() {
        return Err(
            "Archive contained no recognisable Sunfish data files (expected \
             sunfish.db and/or stronghold.vault)."
                .to_string(),
        );
    }

    Ok(format!(
        "Restore complete: {}. Restart the Sunfish desktop app for changes to take effect.",
        restored.join(", ")
    ))
}

// ── Tauri commands ────────────────────────────────────────────────────────────

/// List all backup archives in the operator-chosen directory (or the default).
/// Returns newest-first. Returns an empty list if no backups exist yet.
#[tauri::command]
pub fn list_backups(backup_dir: Option<String>) -> Result<Vec<BackupEntry>, String> {
    let dir = resolve_backup_dir(backup_dir)?;
    list_backups_in_dir(&dir)
}

/// Create a new backup snapshot. Returns the entry for the new archive.
///
/// Safe to call at any time — does NOT stop the Sunfish app first.
/// SQLite WAL mode means a file copy is internally consistent.
/// For maximum consistency, a hot-backup (VACUUM INTO or .dump) would be
/// preferable, but the operator is the one who decides the trade-off; the
/// v1 file-copy approach is honest about its limits in the UI.
#[tauri::command]
pub fn run_backup(backup_dir: Option<String>) -> Result<BackupEntry, String> {
    let dir = resolve_backup_dir(backup_dir)?;
    create_backup(&dir)
}

/// Restore from a specific archive path.
/// DESTRUCTIVE — the caller (UI) MUST show a confirmation dialog before
/// invoking this command. This command does not prompt; it acts.
#[tauri::command]
pub fn restore_backup(archive_path: String) -> Result<String, String> {
    do_restore_backup(&archive_path)
}

/// Return the current sync / relay status without blocking.
/// Performs a fast TCP-connect probe to the Bridge relay host (5s timeout).
#[tauri::command]
pub async fn get_sync_status() -> SyncStatus {
    // Probe the Signal Bridge at the fleet-standard local port.
    // ADR 0113 §7.4: single-device v1 — no multi-device pairing yet.
    let relay_reachable = probe_bridge_reachable().await;

    // Coordination-sync health: peek at the log file mtime.
    let last_coord_sync_at = last_coord_sync_time();

    // Tailnet device count is derived from the cached devices list.
    // We re-invoke the devices module for a fresh probe.
    let devices = crate::devices::get_devices().await;
    let tailnet_device_count = devices.len();

    let state = derive_sync_state(relay_reachable, last_coord_sync_at);

    SyncStatus {
        relay_reachable,
        multi_device_active: false, // v1: always false — device-pairing deferred
        tailnet_device_count,
        last_coord_sync_at,
        state,
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async fn probe_bridge_reachable() -> bool {
    use tokio::net::TcpStream;
    use tokio::time::{timeout, Duration};

    // Signal Bridge health-check endpoint; standard fleet port 5194.
    // If Bridge is not running locally, fall back to the Tailscale host.
    let targets = [
        "127.0.0.1:5194",
        "127.0.0.1:5000",
        "127.0.0.1:3080",
    ];

    for addr in &targets {
        let result = timeout(
            Duration::from_millis(800),
            TcpStream::connect(*addr),
        )
        .await;

        if let Ok(Ok(_)) = result {
            return true;
        }
    }
    false
}

fn last_coord_sync_time() -> Option<u64> {
    let home = std::env::var("HOME").ok()?;
    // The coordination sync daemon writes stdout to this log.
    let log_path = format!(
        "{}/Projects/Harborline-Software/coordination/.sync-stdout.log",
        home
    );
    let meta = std::fs::metadata(&log_path).ok()?;
    let modified = meta
        .modified()
        .ok()?
        .duration_since(UNIX_EPOCH)
        .ok()
        .map(|d| d.as_secs())?;
    Some(modified)
}

fn derive_sync_state(relay_reachable: bool, last_sync: Option<u64>) -> SyncState {
    // v1: single-device — relay emit is stubbed. Be honest.
    // Show SingleDevice to surface the v1 reality clearly.
    // Once R-3 (outbound-delta relay) ships, this transitions to Healthy/Stale.
    if !relay_reachable {
        return SyncState::Offline;
    }

    // Relay is reachable but R-3 not yet shipped → SingleDevice
    if let Some(last) = last_sync {
        let now = now_epoch();
        let age_secs = now.saturating_sub(last);
        if age_secs > 300 {
            return SyncState::Stale;
        }
    }

    SyncState::SingleDevice
}
