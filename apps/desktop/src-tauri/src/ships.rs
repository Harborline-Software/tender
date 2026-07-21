//! Remote ship service control (shipyard#2998).
//!
//! # What this is
//! The Harborline Toolbox's **Ships view**: per remote host, the fleet-relevant
//! service list with live status and — for NON-ESSENTIAL services only —
//! Start/Stop control. The winhub GPU services (ComfyUI/TTS/Music/Kokoro/
//! InferenceStudio) can be reclaimed from the menu bar instead of RDP-ing in.
//!
//! # Transport (shape A, #2982 doctrine)
//! We shell the operator's OWN ssh identity (`~/.ssh`) at an allow-listed host
//! and run PowerShell `Get-Service` / `Start-Service` / `Stop-Service`. There is
//! **no new server surface** and **no bundled key** — same as `inventory.rs`,
//! which already ssh-probes winhub for the model inventory.
//!
//! # The classification guard (fail-safe — same rule as the telemetry probe)
//! Which services are controllable is decided ENTIRELY by the vendored
//! `ship-essential-<host>.json` allowlist, never by the frontend:
//!
//!   reclaimable  ⇔  matches a reclaimable pattern AND no essential pattern
//!   essential    ⇔  everything else (essential-matched OR unknown)
//!
//! `unknown = essential = no control`. A host with no vendored config classifies
//! EVERYTHING as essential (nothing controllable) — the safe default.
//!
//! # The command-injection fence (what the review will attack)
//! `set_ship_service` never interpolates free text into the remote command. The
//! service name a caller asks to control must clear THREE independent gates
//! before any `Start/Stop-Service` is built:
//!   1. `host_id` resolves to a host in the committed `hosts.json` allowlist.
//!   2. the name matches `^[A-Za-z0-9._-]{1,64}$` — the Windows service-name
//!      charset, which contains NO shell/PowerShell metacharacter, quote, space,
//!      `;`, `&`, `|`, `$`, or backtick. Anything else is rejected outright.
//!   3. the name is present in the host's LIVE `Get-Service` list AND classifies
//!      `reclaimable` under the vendored allowlist. Essential/unknown ⇒ rejected.
//!
//! Only a name that clears all three reaches the (still single-quoted) command.
//! Service NAMES come from the allowlist + live host, never from operator text.
//!
//! # Honest states
//! An unreachable host is reported as `reachable=false` with the ssh detail —
//! never a fabricated empty list. Every action re-queries `Get-Service` for a
//! VERIFIED post-state before it is reported as done (never "assumed stopped").

use serde::{Deserialize, Serialize};
use std::time::Duration;

// ── Committed hosts allowlist (resources/ships/hosts.json) ───────────────────

#[derive(Debug, Clone, Deserialize)]
struct HostsConfig {
    hosts: Vec<HostEntry>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HostEntry {
    id: String,
    display_name: String,
    ssh_target: String,
    ssh_user: String,
    #[allow(dead_code)]
    shell: String,
    /// Filename of the vendored `ship-essential-<host>.json`, or `None` when the
    /// host has no ship classification (⇒ every service is essential).
    essential_config: Option<String>,
}

// ── Vendored classification (resources/ships/ship-essential-<host>.json) ─────

#[derive(Debug, Clone, Deserialize, Default)]
struct EssentialConfig {
    essential: Vec<String>,
    reclaimable: Vec<String>,
}

// ── Wire types (serde camelCase — mirror ipc/tauri.ts) ───────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ShipClass {
    Essential,
    Reclaimable,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ShipStatus {
    Running,
    Stopped,
    /// The service was not present in `Get-Service`, or its status string was
    /// unrecognized — reported honestly, never guessed.
    Unknown,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShipService {
    pub name: String,
    pub classification: ShipClass,
    pub status: ShipStatus,
    /// True ONLY for reclaimable services — the single source the UI reads to
    /// decide whether to render a Start/Stop control (mirrors the Rust guard).
    pub can_control: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShipHostSummary {
    pub id: String,
    pub display_name: String,
    pub ssh_target: String,
    /// Whether a vendored classification exists — the UI shows an honest
    /// "no ship classification" note for hosts where it doesn't.
    pub classified: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShipsSnapshot {
    pub host_id: String,
    pub display_name: String,
    pub ssh_target: String,
    pub reachable: bool,
    /// Populated when `reachable=false` (or a probe error) — the ssh detail.
    pub detail: Option<String>,
    /// Whether this host has a vendored classification config at all.
    pub classified: bool,
    pub services: Vec<ShipService>,
    /// Vendored source filename + note so the UI can surface staleness.
    pub classification_source: Option<String>,
    pub mem_free_bytes: Option<u64>,
    pub mem_total_bytes: Option<u64>,
    pub probed_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShipActionOutcome {
    pub host_id: String,
    pub service_name: String,
    pub action: String,
    pub ok: bool,
    /// Re-queried post-state — the VERIFIED status, never assumed.
    pub verified_status: ShipStatus,
    pub detail: Option<String>,
    pub mem_free_before_bytes: Option<u64>,
    pub mem_free_after_bytes: Option<u64>,
}

// ── Remote probe shapes (parsed from PowerShell ConvertTo-Json) ──────────────

#[derive(Debug, Deserialize)]
struct RemoteService {
    #[serde(rename = "Name")]
    name: String,
    #[serde(rename = "Status")]
    status: String,
}

#[derive(Debug, Deserialize)]
struct RemoteProbe {
    #[serde(default)]
    services: Vec<RemoteService>,
    #[serde(rename = "freeKb")]
    free_kb: Option<u64>,
    #[serde(rename = "totalKb")]
    total_kb: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct RemoteActionResult {
    result: String,
    status: Option<String>,
    #[serde(rename = "freeKb")]
    free_kb: Option<u64>,
}

// ── Pure helpers (unit-tested; no I/O) ───────────────────────────────────────

/// Windows service-name charset. Deliberately excludes every shell/PowerShell
/// metacharacter, quote, and whitespace — a name that clears this regex cannot
/// break out of the single-quoted command it is placed into.
fn is_valid_service_name(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= 64
        && name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-')
}

/// The fail-safe classification rule. Reclaimable ONLY when a reclaimable
/// pattern matches AND no essential pattern does; everything else (including
/// unknown) is essential. Case-insensitive substring match, mirroring the
/// battle-stations telemetry probe.
fn classify(name: &str, cfg: &EssentialConfig) -> ShipClass {
    let lname = name.to_lowercase();
    let matches = |pats: &[String]| pats.iter().any(|p| lname.contains(&p.to_lowercase()));
    if matches(&cfg.reclaimable) && !matches(&cfg.essential) {
        ShipClass::Reclaimable
    } else {
        ShipClass::Essential
    }
}

/// Whether a service name matches ANY pattern in the config — used to filter the
/// full `Get-Service` list down to the fleet-relevant roster (so we don't dump
/// the host's hundreds of stock Windows services).
fn is_fleet_relevant(name: &str, cfg: &EssentialConfig) -> bool {
    let lname = name.to_lowercase();
    cfg.essential
        .iter()
        .chain(cfg.reclaimable.iter())
        .any(|p| lname.contains(&p.to_lowercase()))
}

fn status_from_str(s: &str) -> ShipStatus {
    match s.to_lowercase().as_str() {
        "running" => ShipStatus::Running,
        "stopped" => ShipStatus::Stopped,
        _ => ShipStatus::Unknown,
    }
}

fn kb_to_bytes(kb: Option<u64>) -> Option<u64> {
    kb.and_then(|k| k.checked_mul(1024))
}

/// Build the read-only probe command: fleet service names + status + host free/
/// total physical memory, as one compact JSON object. Status is projected to a
/// string so the enum never serializes as a bare integer.
fn probe_command() -> String {
    "$ErrorActionPreference='SilentlyContinue';\
     $svc = Get-Service | Select-Object Name,@{n='Status';e={$_.Status.ToString()}};\
     $os = Get-CimInstance Win32_OperatingSystem;\
     [pscustomobject]@{ services=@($svc); freeKb=[uint64]$os.FreePhysicalMemory; totalKb=[uint64]$os.TotalVisibleMemorySize } | ConvertTo-Json -Compress -Depth 4"
        .to_string()
}

/// Build the action-and-verify command for one validated service. `name` MUST
/// have already cleared `is_valid_service_name` — it is single-quoted here as
/// defense in depth on top of that charset guarantee. `verb` is a fixed
/// `Start-Service` / `Stop-Service` (never free text). Re-queries the service
/// status + free memory in the SAME round-trip so the post-state is verified.
fn action_command(verb: &str, name: &str) -> String {
    // -Force on Stop so dependent-service stops don't hang the operator; Start
    // has no -Force. Both surface the exception message on failure.
    let force = if verb == "Stop-Service" {
        " -Force"
    } else {
        ""
    };
    format!(
        "$ErrorActionPreference='SilentlyContinue';\
         try {{ {verb} -Name '{name}'{force} -ErrorAction Stop; $r='ok' }} catch {{ $r=$_.Exception.Message }};\
         Start-Sleep -Milliseconds 400;\
         $s = (Get-Service -Name '{name}').Status.ToString();\
         $os = Get-CimInstance Win32_OperatingSystem;\
         [pscustomobject]@{{ result=$r; status=$s; freeKb=[uint64]$os.FreePhysicalMemory }} | ConvertTo-Json -Compress"
    )
}

/// Parse the probe JSON into (services, freeKb, totalKb). PowerShell's
/// `ConvertTo-Json` emits a bare object for a single service and an array for
/// zero-or-many; `@($svc)` forces the array shape, but we still tolerate a lone
/// object defensively.
fn parse_probe(raw: &str) -> Result<RemoteProbe, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err("empty probe output".to_string());
    }
    serde_json::from_str::<RemoteProbe>(trimmed).map_err(|e| format!("unparseable probe: {e}"))
}

// ── Resource resolution (mirror bundles.rs) ──────────────────────────────────

fn ships_resource_dir() -> Result<std::path::PathBuf, String> {
    if let Ok(exe) = std::env::current_exe() {
        // Shipped .app: Tender.app/Contents/Resources/resources/ships/
        if let Some(rp) = exe
            .parent()
            .and_then(|p| p.parent())
            .map(|p| p.join("Resources").join("resources").join("ships"))
        {
            if rp.exists() {
                return Ok(rp);
            }
        }
        // `cargo tauri dev`: resources sit next to the exe under target/.
        if let Some(drp) = exe.parent().map(|p| p.join("resources").join("ships")) {
            if drp.exists() {
                return Ok(drp);
            }
        }
    }
    // Bare `cargo check`/`cargo test`/`cargo build` without a tauri context:
    // resolve relative to the crate source.
    let manifest = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join("ships");
    if manifest.exists() {
        return Ok(manifest);
    }
    Err("Ships resource directory not found (resources/ships/).".to_string())
}

fn load_hosts_config() -> Result<HostsConfig, String> {
    let path = ships_resource_dir()?.join("hosts.json");
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("failed to read {}: {e}", path.display()))?;
    serde_json::from_str(&content).map_err(|e| format!("failed to parse hosts.json: {e}"))
}

fn load_essential_config(filename: &str) -> Result<EssentialConfig, String> {
    let path = ships_resource_dir()?.join(filename);
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("failed to read {}: {e}", path.display()))?;
    serde_json::from_str(&content).map_err(|e| format!("failed to parse {filename}: {e}"))
}

fn find_host(cfg: &HostsConfig, host_id: &str) -> Result<HostEntry, String> {
    cfg.hosts
        .iter()
        .find(|h| h.id == host_id)
        .cloned()
        .ok_or_else(|| format!("host '{host_id}' is not in the committed allowlist"))
}

// ── SSH transport ────────────────────────────────────────────────────────────

/// Run one PowerShell command on `host` over the operator's ssh identity.
/// `-l user` (not `user@host`) keeps a username with a space (surface's
/// `chris wood`) intact — args are not shell-split by tokio's Command.
async fn ssh_run(host: &HostEntry, command: &str) -> Result<String, String> {
    let output = tokio::time::timeout(
        Duration::from_secs(20),
        tokio::process::Command::new("ssh")
            .args([
                "-o",
                "BatchMode=yes",
                "-o",
                "ConnectTimeout=6",
                "-l",
                &host.ssh_user,
                &host.ssh_target,
                command,
            ])
            .output(),
    )
    .await;

    let output = match output {
        Ok(Ok(o)) => o,
        Ok(Err(e)) => return Err(format!("could not spawn ssh: {e}")),
        Err(_) => return Err(format!("ssh to {} timed out", host.ssh_target)),
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "ssh {} exited {}: {}",
            host.ssh_target,
            output.status,
            stderr.trim()
        ));
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn now_iso() -> String {
    // Reuse the crate's existing UTC-ISO formatter (inventory.rs) rather than
    // duplicate the calendar math — one source of truth for the timestamp shape.
    crate::inventory::now_iso()
}

// ── Public API (the Tauri commands call these) ───────────────────────────────

/// List the allow-listed hosts — the Ships view master list.
pub fn get_ship_hosts() -> Result<Vec<ShipHostSummary>, String> {
    let cfg = load_hosts_config()?;
    Ok(cfg
        .hosts
        .into_iter()
        .map(|h| ShipHostSummary {
            id: h.id,
            display_name: h.display_name,
            ssh_target: h.ssh_target,
            classified: h.essential_config.is_some(),
        })
        .collect())
}

/// Probe one host's fleet services + memory. NEVER errors on an unreachable
/// host — that is captured honestly as `reachable=false` with the detail.
pub async fn get_ship_services(host_id: String) -> ShipsSnapshot {
    // Start from an unreachable-by-default snapshot; fill in as each step
    // succeeds. Every early return is an honest `reachable=false` with a detail.
    let mut snap = ShipsSnapshot {
        host_id: host_id.clone(),
        display_name: host_id.clone(),
        ssh_target: String::new(),
        reachable: false,
        detail: None,
        classified: false,
        services: vec![],
        classification_source: None,
        mem_free_bytes: None,
        mem_total_bytes: None,
        probed_at: now_iso(),
    };

    let cfg = match load_hosts_config() {
        Ok(c) => c,
        Err(e) => {
            snap.detail = Some(e);
            return snap;
        }
    };
    let host = match find_host(&cfg, &host_id) {
        Ok(h) => h,
        Err(e) => {
            snap.detail = Some(e);
            return snap;
        }
    };
    snap.display_name = host.display_name.clone();
    snap.ssh_target = host.ssh_target.clone();

    let essential = host
        .essential_config
        .as_ref()
        .and_then(|f| load_essential_config(f).ok());
    snap.classified = essential.is_some();
    snap.classification_source = host.essential_config.clone();

    let raw = match ssh_run(&host, &probe_command()).await {
        Ok(r) => r,
        Err(e) => {
            snap.detail = Some(e);
            return snap;
        }
    };
    let probe = match parse_probe(&raw) {
        Ok(p) => p,
        Err(e) => {
            snap.detail = Some(e);
            return snap;
        }
    };

    // No classification ⇒ nothing is controllable (fail-safe). We deliberately
    // do NOT dump all of a host's services; the honest state is "no ship
    // classification for this host" and an empty controllable roster.
    snap.services = match &essential {
        None => vec![],
        Some(ec) => probe
            .services
            .iter()
            .filter(|s| is_fleet_relevant(&s.name, ec))
            .map(|s| {
                let classification = classify(&s.name, ec);
                ShipService {
                    name: s.name.clone(),
                    classification,
                    status: status_from_str(&s.status),
                    can_control: classification == ShipClass::Reclaimable,
                }
            })
            .collect(),
    };
    snap.reachable = true;
    snap.mem_free_bytes = kb_to_bytes(probe.free_kb);
    snap.mem_total_bytes = kb_to_bytes(probe.total_kb);
    snap
}

/// Start or stop ONE service on a host — the guarded action. Errors (rejects)
/// when any of the three fence gates fails; never acts on an essential/unknown
/// service. Returns a VERIFIED post-state.
pub async fn set_ship_service(
    host_id: String,
    service_name: String,
    action: String,
) -> Result<ShipActionOutcome, String> {
    // Gate 0: action is a closed enum → fixed PowerShell verb (never free text).
    let verb = match action.as_str() {
        "start" => "Start-Service",
        "stop" => "Stop-Service",
        other => return Err(format!("unsupported action '{other}'")),
    };

    // Gate 1: host is in the committed allowlist.
    let cfg = load_hosts_config()?;
    let host = find_host(&cfg, &host_id)?;

    // Gate 2: charset — reject anything a shell/PowerShell could act on.
    if !is_valid_service_name(&service_name) {
        return Err(format!(
            "refusing '{service_name}': not a valid service name (allowed: letters, digits, . _ -)"
        ));
    }

    // A host without a vendored classification has NO controllable services.
    let ec = match &host.essential_config {
        Some(f) => load_essential_config(f)?,
        None => {
            return Err(format!(
                "host '{host_id}' has no ship classification — no services are controllable"
            ))
        }
    };

    // Gate 3: the service must exist on the LIVE host AND classify reclaimable.
    let probe_raw = ssh_run(&host, &probe_command()).await?;
    let probe = parse_probe(&probe_raw)?;
    let found = probe
        .services
        .iter()
        .find(|s| s.name.eq_ignore_ascii_case(&service_name))
        .ok_or_else(|| format!("service '{service_name}' not found on {host_id}"))?;

    if classify(&found.name, &ec) != ShipClass::Reclaimable {
        return Err(format!(
            "refusing to {action} '{}': it is essential-classified (status-only)",
            found.name
        ));
    }

    let mem_free_before = kb_to_bytes(probe.free_kb);

    // Act + verify in one round-trip. `service_name` cleared Gate 2 (charset),
    // Gate 3 (exists + reclaimable); it is still single-quoted below.
    let raw = ssh_run(&host, &action_command(verb, &service_name)).await?;
    let result: RemoteActionResult =
        serde_json::from_str(raw.trim()).map_err(|e| format!("unparseable action result: {e}"))?;

    let verified_status = result
        .status
        .as_deref()
        .map(status_from_str)
        .unwrap_or(ShipStatus::Unknown);
    let ok = result.result == "ok";

    Ok(ShipActionOutcome {
        host_id,
        service_name,
        action,
        ok,
        verified_status,
        detail: if ok { None } else { Some(result.result) },
        mem_free_before_bytes: mem_free_before,
        mem_free_after_bytes: kb_to_bytes(result.free_kb),
    })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn winhub_cfg() -> EssentialConfig {
        EssentialConfig {
            essential: vec![
                "CaddyPreviewHost".into(),
                "HarborlineDogfood".into(),
                "nssm".into(),
                "svchost".into(),
                // Fleet PR #61 (Admiral ruling): SunfishOllama/ollama back
                // ordinance/bin/local-review + the support-desk direction — essential.
                "SunfishOllama".into(),
                "ollama".into(),
            ],
            reclaimable: vec![
                "ComfyUIService".into(),
                "KokoroTTSService".into(),
                "Kokoro".into(),
                "TTSService".into(),
            ],
        }
    }

    #[test]
    fn reclaimable_gpu_services_are_controllable() {
        let c = winhub_cfg();
        assert_eq!(classify("KokoroTTSService", &c), ShipClass::Reclaimable);
        assert_eq!(classify("ComfyUIService", &c), ShipClass::Reclaimable);
        assert_eq!(classify("TTSService", &c), ShipClass::Reclaimable);
    }

    #[test]
    fn essential_services_are_never_controllable() {
        let c = winhub_cfg();
        assert_eq!(classify("CaddyPreviewHost", &c), ShipClass::Essential);
        assert_eq!(classify("HarborlineDogfood", &c), ShipClass::Essential);
        assert_eq!(classify("nssm", &c), ShipClass::Essential);
    }

    #[test]
    fn unknown_service_fails_safe_to_essential() {
        let c = winhub_cfg();
        // Not in either list ⇒ essential (no control) — the fail-safe.
        assert_eq!(
            classify("SomeRandomWindowsService", &c),
            ShipClass::Essential
        );
    }

    #[test]
    fn essential_pattern_wins_over_reclaimable() {
        // A name matching BOTH lists must resolve essential (guard-side).
        let c = EssentialConfig {
            essential: vec!["special".into()],
            reclaimable: vec!["ollama".into()],
        };
        assert_eq!(classify("special-ollama-host", &c), ShipClass::Essential);
    }

    #[test]
    fn sunfish_ollama_follows_config_not_hardcode() {
        // Per fleet PR #61 (Admiral ruling): SunfishOllama/ollama back
        // ordinance/bin/local-review + the support-desk direction, so the
        // vendored config classifies them essential (status-only, no control).
        // This test still exists to pin "classification comes from the config,
        // never a code-level special-case" — only the config's answer changed.
        let c = winhub_cfg();
        assert_eq!(classify("SunfishOllama", &c), ShipClass::Essential);
        assert_eq!(classify("ollama", &c), ShipClass::Essential);
    }

    #[test]
    fn service_name_charset_rejects_injection() {
        assert!(is_valid_service_name("KokoroTTSService"));
        assert!(is_valid_service_name("Shipyard.LocalNodeHost"));
        assert!(is_valid_service_name("my_service-01"));
        // Every one of these carries a shell/PowerShell break-out character.
        assert!(!is_valid_service_name("svc; Remove-Item C:\\"));
        assert!(!is_valid_service_name("svc'; rm -rf /"));
        assert!(!is_valid_service_name("svc && calc"));
        assert!(!is_valid_service_name("svc`whoami`"));
        assert!(!is_valid_service_name("svc$(x)"));
        assert!(!is_valid_service_name("svc name"));
        assert!(!is_valid_service_name(""));
        assert!(!is_valid_service_name(&"a".repeat(65)));
    }

    #[test]
    fn fleet_relevant_filters_out_stock_services() {
        let c = winhub_cfg();
        assert!(is_fleet_relevant("KokoroTTSService", &c));
        assert!(is_fleet_relevant("CaddyPreviewHost", &c));
        assert!(!is_fleet_relevant("Spooler", &c));
        assert!(!is_fleet_relevant("WinDefend", &c));
    }

    #[test]
    fn action_command_uses_fixed_verb_and_quoted_name() {
        let cmd = action_command("Stop-Service", "KokoroTTSService");
        assert!(cmd.contains("Stop-Service -Name 'KokoroTTSService' -Force"));
        assert!(cmd.contains("Get-Service -Name 'KokoroTTSService'"));
        let start = action_command("Start-Service", "KokoroTTSService");
        assert!(start.contains("Start-Service -Name 'KokoroTTSService'"));
        // Start has no -Force.
        assert!(!start.contains("-Force"));
    }

    #[test]
    fn status_parsing_is_honest_about_unknown() {
        assert_eq!(status_from_str("Running"), ShipStatus::Running);
        assert_eq!(status_from_str("Stopped"), ShipStatus::Stopped);
        assert_eq!(status_from_str("StartPending"), ShipStatus::Unknown);
        assert_eq!(status_from_str(""), ShipStatus::Unknown);
    }

    #[test]
    fn parse_probe_reads_services_and_memory() {
        let raw = r#"{"services":[{"Name":"KokoroTTSService","Status":"Stopped"},{"Name":"CaddyPreviewHost","Status":"Running"}],"freeKb":4194304,"totalKb":33554432}"#;
        let p = parse_probe(raw).unwrap();
        assert_eq!(p.services.len(), 2);
        assert_eq!(kb_to_bytes(p.free_kb), Some(4194304 * 1024));
        assert_eq!(kb_to_bytes(p.total_kb), Some(33554432 * 1024));
    }
}
