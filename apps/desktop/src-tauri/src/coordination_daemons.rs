//! Native visibility and lifecycle controls for the fleet coordination jobs.
//!
//! Tender never performs sync or QM work itself. It inspects and asks launchd
//! to operate the existing LaunchAgents, preserving one implementation of each
//! daemon. Mutating actions are opt-in through
//! `TENDER_ALLOW_COORDINATION_DAEMON_START=1`; read-only status always works.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::{Command, Output};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const CONTROL_ENV: &str = "TENDER_ALLOW_COORDINATION_DAEMON_START";
const COORDINATION_DIR_ENV: &str = "TENDER_COORDINATION_DIR";
const DASHBOARD_URL_ENV: &str = "TENDER_FLEET_DASHBOARD_URL";

#[derive(Clone, Copy)]
struct DaemonSpec {
    id: &'static str,
    display_name: &'static str,
    cadence: &'static str,
    label: &'static str,
    flag: &'static str,
    script: &'static str,
    plist: &'static str,
    logs: &'static [&'static str],
    stale_after: Duration,
}

const DAEMONS: [DaemonSpec; 3] = [
    DaemonSpec {
        id: "coordination-sync",
        display_name: "Coordination Sync",
        cadence: "Every 60 seconds",
        label: "com.harborline.coordination-sync",
        flag: ".sync-active",
        script: "sync-coordination.py",
        plist: "com.harborline.coordination-sync.plist",
        logs: &[
            ".coordination-sync.log",
            ".sync-stdout.log",
            ".sync-stderr.log",
        ],
        stale_after: Duration::from_secs(5 * 60),
    },
    DaemonSpec {
        id: "qm-daemon",
        display_name: "QM Daemon",
        cadence: "Every hour",
        label: "com.harborline.qm-daemon",
        flag: ".qm-daemon-active",
        script: "qm-daemon.py",
        plist: "com.harborline.qm-daemon.plist",
        logs: &[
            ".qm-daemon.log",
            ".qm-daemon-stdout.log",
            ".qm-daemon-stderr.log",
        ],
        stale_after: Duration::from_secs(90 * 60),
    },
    DaemonSpec {
        id: "lane-supervisor",
        display_name: "Lane Supervisor",
        cadence: "Every 5 minutes · one start per tick",
        label: "com.harborline.lane-supervisor",
        flag: ".lane-supervisor-active",
        script: "../ordinance/bin/lane-supervisor.mjs",
        plist: "com.harborline.lane-supervisor.plist",
        logs: &[
            ".lane-supervisor.log",
            ".lane-supervisor-stdout.log",
            ".lane-supervisor-stderr.log",
        ],
        stale_after: Duration::from_secs(15 * 60),
    },
];

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum DaemonState {
    Loaded,
    MaintenanceHeld,
    Disabled,
    Degraded,
    NotConfigured,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CoordinationDaemonStatus {
    pub id: String,
    pub display_name: String,
    pub cadence: String,
    pub state: DaemonState,
    pub detail: String,
    pub loaded: bool,
    pub active_flag_present: bool,
    pub controls_enabled: bool,
    pub can_start: bool,
    pub can_stop: bool,
    pub can_run_now: bool,
    pub logs_available: bool,
    pub last_run_at: Option<u64>,
    pub last_log_line: Option<String>,
    pub capacity_active: Option<u64>,
    pub capacity_maximum: Option<u64>,
    pub conn_provider: Option<String>,
    pub next_candidate: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LaneSupervisorSnapshot {
    detail: String,
    conn_provider: Option<String>,
    capacity: Option<LaneCapacitySnapshot>,
    next_candidate: Option<LaneCandidateSnapshot>,
}

#[derive(Debug, Deserialize)]
struct LaneCapacitySnapshot {
    active: u64,
    maximum: u64,
}

#[derive(Debug, Deserialize)]
struct LaneCandidateSnapshot {
    provider: String,
    role: String,
    id: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FleetDashboardLink {
    pub configured: bool,
    pub url: Option<String>,
    pub detail: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DaemonActionResult {
    pub id: String,
    pub action: String,
    pub detail: String,
}

#[derive(Clone, Copy, Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DaemonAction {
    Start,
    Stop,
    RunNow,
}

fn env_enabled(name: &str) -> bool {
    std::env::var(name)
        .map(|value| {
            matches!(
                value.trim().to_ascii_lowercase().as_str(),
                "1" | "true" | "yes"
            )
        })
        .unwrap_or(false)
}

fn coordination_dir() -> Option<PathBuf> {
    if let Ok(value) = std::env::var(COORDINATION_DIR_ENV) {
        let path = PathBuf::from(value);
        return path.is_dir().then_some(path);
    }

    // Fleet-developer fallback only. Shipped Tender remains standalone and
    // reports `notConfigured` when no sibling checkout exists.
    crate::platform::home_dir()
        .map(|home| home.join("Projects/Harborline-Software/coordination"))
        .filter(|path| path.is_dir())
}

fn launch_agents_dir() -> Option<PathBuf> {
    crate::platform::home_dir().map(|home| home.join("Library/LaunchAgents"))
}

fn lane_supervisor_snapshot() -> Option<LaneSupervisorSnapshot> {
    let home = std::env::var("HOME").ok()?;
    let path = PathBuf::from(home).join(".local/state/harborline/lane-supervisor-status.json");
    serde_json::from_slice(&std::fs::read(path).ok()?).ok()
}

fn uid() -> Result<String, String> {
    let output = Command::new("id")
        .arg("-u")
        .output()
        .map_err(|error| format!("could not determine launchd user domain: {error}"))?;
    if !output.status.success() {
        return Err(output_detail(&output, "id -u failed"));
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn launchd_target(label: &str) -> Result<String, String> {
    Ok(format!("gui/{}/{}", uid()?, label))
}

fn launchd_loaded(label: &str) -> bool {
    let Ok(target) = launchd_target(label) else {
        return false;
    };
    Command::new("launchctl")
        .args(["print", &target])
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn last_nonempty_line(path: &Path) -> Option<String> {
    use std::io::{Read, Seek, SeekFrom};

    let mut file = std::fs::File::open(path).ok()?;
    let size = file.seek(SeekFrom::End(0)).ok()?;
    let read_len = size.min(8 * 1024);
    file.seek(SeekFrom::End(-(read_len as i64))).ok()?;
    let mut bytes = vec![0; read_len as usize];
    file.read_exact(&mut bytes).ok()?;
    let content = String::from_utf8_lossy(&bytes);
    content
        .lines()
        .rev()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .map(|line| line.chars().take(220).collect())
}

#[derive(Default)]
struct LogSnapshot {
    modified: Option<SystemTime>,
    line: Option<String>,
    newest_is_error: bool,
    available: bool,
}

fn log_snapshot(coordination: &Path, spec: DaemonSpec) -> LogSnapshot {
    let mut snapshot = LogSnapshot::default();
    for path in paths_for_spec(coordination, spec) {
        let Ok(metadata) = std::fs::metadata(&path) else {
            continue;
        };
        snapshot.available = true;
        let Ok(modified) = metadata.modified() else {
            continue;
        };
        if snapshot
            .modified
            .map(|current| modified > current)
            .unwrap_or(true)
        {
            snapshot.modified = Some(modified);
            snapshot.line = last_nonempty_line(&path);
            snapshot.newest_is_error = path
                .file_name()
                .map(|name| name.to_string_lossy().contains("stderr"))
                .unwrap_or(false)
                && snapshot.line.is_some();
        }
    }
    snapshot
}

fn paths_for_spec(coordination: &Path, spec: DaemonSpec) -> Vec<PathBuf> {
    spec.logs
        .iter()
        .map(|name| coordination.join(name))
        .collect()
}

/// The allowlisted log paths used by status, the in-app viewer, and Open Log.
pub fn log_paths(id: &str) -> Result<Vec<PathBuf>, String> {
    let spec = spec_for(id)?;
    let coordination = coordination_dir()
        .ok_or_else(|| format!("Set {COORDINATION_DIR_ENV} to the coordination checkout."))?;
    Ok(paths_for_spec(&coordination, spec))
}

fn classify(
    configured: bool,
    loaded: bool,
    active_flag: bool,
    stale: bool,
    newest_is_error: bool,
) -> (DaemonState, &'static str) {
    if !configured {
        return (
            DaemonState::NotConfigured,
            "Coordination checkout, script, or LaunchAgent is missing.",
        );
    }
    if loaded && !active_flag {
        return (
            DaemonState::MaintenanceHeld,
            "LaunchAgent is loaded, but its active marker is absent; the job is safely gated.",
        );
    }
    if !loaded && !active_flag {
        return (
            DaemonState::Disabled,
            "LaunchAgent is unloaded and inactive.",
        );
    }
    if !loaded && active_flag {
        return (
            DaemonState::Degraded,
            "Active marker is present while the LaunchAgent is unloaded; it can return at login.",
        );
    }
    if newest_is_error {
        return (
            DaemonState::Degraded,
            "The newest daemon output is from stderr; inspect the log.",
        );
    }
    if stale {
        return (
            DaemonState::Degraded,
            "The LaunchAgent is loaded, but its activity log is stale.",
        );
    }
    (
        DaemonState::Loaded,
        "LaunchAgent is loaded and its activity is current.",
    )
}

fn status_for(spec: DaemonSpec, coordination: Option<&Path>) -> CoordinationDaemonStatus {
    let controls_enabled = env_enabled(CONTROL_ENV);
    let Some(coordination) = coordination else {
        return CoordinationDaemonStatus {
            id: spec.id.into(),
            display_name: spec.display_name.into(),
            cadence: spec.cadence.into(),
            state: DaemonState::NotConfigured,
            detail: format!("Set {COORDINATION_DIR_ENV} to the coordination checkout."),
            loaded: false,
            active_flag_present: false,
            controls_enabled,
            can_start: false,
            can_stop: false,
            can_run_now: false,
            logs_available: false,
            last_run_at: None,
            last_log_line: None,
            capacity_active: None,
            capacity_maximum: None,
            conn_provider: None,
            next_candidate: None,
        };
    };

    let plist = launch_agents_dir().map(|dir| dir.join(spec.plist));
    let configured = coordination.join(spec.script).is_file()
        && plist.as_ref().map(|path| path.is_file()).unwrap_or(false);
    let active_flag = coordination.join(spec.flag).is_file();
    let loaded = configured && launchd_loaded(spec.label);
    let logs = log_snapshot(coordination, spec);
    let stale = logs
        .modified
        .and_then(|modified| SystemTime::now().duration_since(modified).ok())
        .map(|age| age > spec.stale_after)
        .unwrap_or(loaded);
    let (state, classified_detail) =
        classify(configured, loaded, active_flag, stale, logs.newest_is_error);
    let supervisor = (configured && spec.id == "lane-supervisor")
        .then(lane_supervisor_snapshot)
        .flatten();
    let detail = supervisor
        .as_ref()
        .map(|snapshot| snapshot.detail.as_str())
        .unwrap_or(classified_detail);

    CoordinationDaemonStatus {
        id: spec.id.into(),
        display_name: spec.display_name.into(),
        cadence: spec.cadence.into(),
        state,
        detail: detail.into(),
        loaded,
        active_flag_present: active_flag,
        controls_enabled,
        can_start: configured && controls_enabled && (!loaded || !active_flag),
        can_stop: configured && (loaded || active_flag),
        can_run_now: configured && controls_enabled && active_flag && loaded,
        logs_available: logs.available,
        last_run_at: logs
            .modified
            .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
            .map(|duration| duration.as_secs()),
        last_log_line: logs.line,
        capacity_active: supervisor
            .as_ref()
            .and_then(|snapshot| snapshot.capacity.as_ref().map(|capacity| capacity.active)),
        capacity_maximum: supervisor
            .as_ref()
            .and_then(|snapshot| snapshot.capacity.as_ref().map(|capacity| capacity.maximum)),
        conn_provider: supervisor
            .as_ref()
            .and_then(|snapshot| snapshot.conn_provider.clone()),
        next_candidate: supervisor.as_ref().and_then(|snapshot| {
            snapshot.next_candidate.as_ref().map(|candidate| {
                format!("{}:{}-{}", candidate.provider, candidate.role, candidate.id)
            })
        }),
    }
}

pub fn statuses() -> Vec<CoordinationDaemonStatus> {
    #[cfg(not(target_os = "macos"))]
    {
        return DAEMONS
            .iter()
            .map(|spec| CoordinationDaemonStatus {
                id: spec.id.into(),
                display_name: spec.display_name.into(),
                cadence: "Managed on macOS fleet nodes".into(),
                state: DaemonState::NotConfigured,
                detail: "This legacy LaunchAgent is not a Windows service. WinHub uses the Fleet Coordinator shown above.".into(),
                loaded: false,
                active_flag_present: false,
                controls_enabled: false,
                can_start: false,
                can_stop: false,
                can_run_now: false,
                logs_available: false,
                last_run_at: None,
                last_log_line: None,
                capacity_active: None,
                capacity_maximum: None,
                conn_provider: None,
                next_candidate: None,
            })
            .collect();
    }

    #[cfg(target_os = "macos")]
    let coordination = coordination_dir();
    #[cfg(target_os = "macos")]
    DAEMONS
        .iter()
        .map(|spec| status_for(*spec, coordination.as_deref()))
        .collect()
}

fn spec_for(id: &str) -> Result<DaemonSpec, String> {
    DAEMONS
        .iter()
        .copied()
        .find(|spec| spec.id == id)
        .ok_or_else(|| format!("Unknown coordination daemon: {id}"))
}

fn output_detail(output: &Output, fallback: &str) -> String {
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if !stderr.is_empty() {
        stderr
    } else if !stdout.is_empty() {
        stdout
    } else {
        fallback.to_string()
    }
}

fn run_launchctl(args: &[&str]) -> Result<(), String> {
    let output = Command::new("launchctl")
        .args(args)
        .output()
        .map_err(|error| format!("launchctl could not run: {error}"))?;
    if output.status.success() {
        Ok(())
    } else {
        Err(output_detail(&output, "launchctl returned an error"))
    }
}

fn arm_active_marker(path: &Path) -> Result<bool, String> {
    if path.is_file() {
        return Ok(false);
    }
    std::fs::write(path, [])
        .map(|_| true)
        .map_err(|error| format!("Could not create active marker: {error}"))
}

fn hold_active_marker(path: &Path) -> Result<bool, String> {
    if !path.exists() {
        return Ok(false);
    }
    std::fs::remove_file(path)
        .map(|_| true)
        .map_err(|error| format!("Could not remove active marker: {error}"))
}

pub fn control(id: &str, action: DaemonAction) -> Result<DaemonActionResult, String> {
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (id, action);
        return Err(
            "Legacy coordination LaunchAgent controls are available only on macOS fleet nodes."
                .into(),
        );
    }

    #[cfg(target_os = "macos")]
    {
        let spec = spec_for(id)?;
        let coordination = coordination_dir()
            .ok_or_else(|| format!("Set {COORDINATION_DIR_ENV} to the coordination checkout."))?;
        let plist = launch_agents_dir()
            .map(|dir| dir.join(spec.plist))
            .filter(|path| path.is_file())
            .ok_or_else(|| format!("LaunchAgent plist is missing for {}.", spec.display_name))?;
        if !coordination.join(spec.script).is_file() {
            return Err(format!(
                "{} is missing from the coordination checkout.",
                spec.script
            ));
        }

        let target = launchd_target(spec.label)?;
        let loaded = launchd_loaded(spec.label);
        let detail = match action {
            DaemonAction::Stop => {
                let flag = coordination.join(spec.flag);
                hold_active_marker(&flag).map_err(|error| {
                    format!("Could not establish the persistent maintenance hold: {error}")
                })?;
                if loaded {
                    run_launchctl(&["bootout", &target]).map_err(|error| {
                    format!(
                        "The active marker was removed, but launchctl could not unload the job: {error}"
                    )
                })?;
                    "Persistent maintenance hold set and LaunchAgent unloaded.".to_string()
                } else {
                    "Persistent maintenance hold set; LaunchAgent was already unloaded.".to_string()
                }
            }
            DaemonAction::Start => {
                if !env_enabled(CONTROL_ENV) {
                    return Err(format!(
                    "Start controls are locked. Set {CONTROL_ENV}=1 only after the daemon safety fix is installed."
                ));
                }
                let flag = coordination.join(spec.flag);
                arm_active_marker(&flag)
                    .map_err(|error| format!("Could not arm {}: {error}", spec.display_name))?;
                let rollback_flag = || {
                    // A failed start must always return to a reboot-safe hold,
                    // including recovery from a pre-existing armed/unloaded state.
                    let _ = hold_active_marker(&flag);
                };
                if !loaded {
                    let domain = target
                        .rsplit_once('/')
                        .map(|(domain, _)| domain)
                        .ok_or_else(|| "Invalid launchd target.".to_string())?;
                    if let Err(error) = run_launchctl(&["enable", &target]) {
                        rollback_flag();
                        return Err(error);
                    }
                    if let Err(error) =
                        run_launchctl(&["bootstrap", &domain, &plist.to_string_lossy()])
                    {
                        rollback_flag();
                        return Err(error);
                    }
                }
                if let Err(error) = run_launchctl(&["kickstart", "-k", &target]) {
                    rollback_flag();
                    return Err(error);
                }
                "Active marker created; LaunchAgent loaded and kicked once.".to_string()
            }
            DaemonAction::RunNow => {
                if !env_enabled(CONTROL_ENV) {
                    return Err(format!(
                    "Run-now controls are locked. Set {CONTROL_ENV}=1 only after the daemon safety fix is installed."
                ));
                }
                if !loaded || !coordination.join(spec.flag).is_file() {
                    return Err("Run now requires a loaded, armed LaunchAgent.".into());
                }
                run_launchctl(&["kickstart", "-k", &target])?;
                "LaunchAgent kicked for an immediate run.".to_string()
            }
        };

        Ok(DaemonActionResult {
            id: spec.id.into(),
            action: match action {
                DaemonAction::Start => "start",
                DaemonAction::Stop => "stop",
                DaemonAction::RunNow => "runNow",
            }
            .into(),
            detail,
        })
    }
}

pub fn open_log(id: &str) -> Result<(), String> {
    let spec = spec_for(id)?;
    let path = log_paths(id)?
        .into_iter()
        .filter(|path| path.is_file())
        .max_by_key(|path| {
            std::fs::metadata(path)
                .and_then(|meta| meta.modified())
                .ok()
        })
        .ok_or_else(|| format!("No log file exists yet for {}.", spec.display_name))?;
    crate::platform::open_path(&path)
}

pub fn dashboard_link() -> FleetDashboardLink {
    resolve_dashboard_link(
        crate::settings::load().fleet_dashboard_url,
        std::env::var(DASHBOARD_URL_ENV).ok(),
    )
}

fn resolve_dashboard_link(
    saved: Option<String>,
    environment: Option<String>,
) -> FleetDashboardLink {
    if let Some(value) = saved {
        return match crate::settings::normalize_web_url(Some(&value)) {
            Ok(Some(value)) => FleetDashboardLink {
                configured: true,
                url: Some(value),
                detail: "Fleet Dashboard URL saved in Dock Settings.".into(),
            },
            _ => FleetDashboardLink {
                configured: false,
                url: None,
                detail: "The Fleet Dashboard URL saved in Dock Settings is invalid.".into(),
            },
        };
    }

    match environment {
        Some(value) if valid_web_url(&value) => FleetDashboardLink {
            configured: true,
            url: Some(value),
            detail: "Fleet Dashboard URL supplied by the session environment.".into(),
        },
        Some(_) => FleetDashboardLink {
            configured: false,
            url: None,
            detail: format!("{DASHBOARD_URL_ENV} must be an http or https URL."),
        },
        None => FleetDashboardLink {
            configured: false,
            url: None,
            detail: "Set Fleet Dashboard URL in Dock Settings.".into(),
        },
    }
}

fn valid_web_url(value: &str) -> bool {
    crate::settings::normalize_web_url(Some(value))
        .ok()
        .flatten()
        .is_some()
}

pub fn open_dashboard() -> Result<(), String> {
    let link = dashboard_link();
    let url = link.url.ok_or(link.detail)?;
    crate::platform::open_url(&url)
        .map_err(|error| format!("Could not open fleet dashboard: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn loaded_without_marker_is_maintenance_held() {
        let (state, _) = classify(true, true, false, true, false);
        assert_eq!(state, DaemonState::MaintenanceHeld);
    }

    #[test]
    fn armed_but_unloaded_is_degraded() {
        let (state, _) = classify(true, false, true, false, false);
        assert_eq!(state, DaemonState::Degraded);
    }

    #[test]
    fn unloaded_without_marker_is_disabled() {
        let (state, _) = classify(true, false, false, false, false);
        assert_eq!(state, DaemonState::Disabled);
    }

    #[test]
    fn current_loaded_daemon_is_healthy() {
        let (state, _) = classify(true, true, true, false, false);
        assert_eq!(state, DaemonState::Loaded);
    }

    #[test]
    fn dashboard_url_allows_only_http_with_a_host() {
        assert!(valid_web_url("https://example.internal/fleet/"));
        assert!(valid_web_url("http://localhost:8880/fleet/"));
        assert!(!valid_web_url("file:///tmp/fleet.html"));
        assert!(!valid_web_url("javascript:alert(1)"));
        assert!(!valid_web_url("not a url"));
    }

    #[test]
    fn saved_dashboard_url_takes_priority_over_environment() {
        let link = resolve_dashboard_link(
            Some("http://saved.example/fleet/".to_string()),
            Some("http://environment.example/fleet/".to_string()),
        );
        assert_eq!(link.url.as_deref(), Some("http://saved.example/fleet/"));
        assert!(link.detail.contains("Dock Settings"));
    }

    #[test]
    fn dashboard_environment_remains_a_fallback() {
        let link =
            resolve_dashboard_link(None, Some("http://environment.example/fleet/".to_string()));
        assert_eq!(
            link.url.as_deref(),
            Some("http://environment.example/fleet/")
        );
        assert!(link.detail.contains("session environment"));
    }

    #[test]
    fn daemon_states_serialize_to_frontend_contract() {
        assert_eq!(
            serde_json::to_string(&DaemonState::MaintenanceHeld).unwrap(),
            "\"maintenanceHeld\""
        );
        assert_eq!(
            serde_json::to_string(&DaemonState::NotConfigured).unwrap(),
            "\"notConfigured\""
        );
    }

    #[test]
    fn lane_supervisor_snapshot_deserializes_capacity_contract() {
        let snapshot: LaneSupervisorSnapshot = serde_json::from_str(
            r#"{
                "detail":"Capacity available.",
                "connProvider":"codex",
                "capacity":{"active":1,"maximum":3},
                "nextCandidate":{"provider":"claude","role":"bosun","id":"claude-w1"}
            }"#,
        )
        .unwrap();

        assert_eq!(snapshot.capacity.unwrap().maximum, 3);
        assert_eq!(snapshot.conn_provider.as_deref(), Some("codex"));
        assert_eq!(snapshot.next_candidate.unwrap().provider, "claude");
    }

    #[test]
    fn active_marker_primitives_round_trip_and_hold_is_idempotent() {
        let dir = std::env::temp_dir().join(format!(
            "tender-coordination-marker-test-{}",
            std::process::id()
        ));
        let marker = dir.join(".active");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        assert!(arm_active_marker(&marker).unwrap());
        assert!(!arm_active_marker(&marker).unwrap(), "arming is idempotent");
        assert!(marker.is_file(), "start transaction arms the marker");
        assert!(hold_active_marker(&marker).unwrap());
        assert!(!marker.exists(), "hold transaction clears the marker");
        assert!(
            !hold_active_marker(&marker).unwrap(),
            "a repeated hold leaves the marker safely absent"
        );

        let _ = std::fs::remove_dir_all(&dir);
    }
}
