//! Install config (C1) — Tender's persisted record of what it manages.
//!
//! This is the **spine** of the installer/coordinator: the source of truth for
//! honest `installed`/`version` detection (retiring `telemetry.rs`'s hardcoded
//! fictions) and for the **launch contract** operator-grade start/stop (C2)
//! keys off instead of the dev-path `dotnet run` coupling.
//!
//! Persisted as JSON under the OS app-config dir
//! (`<config>/Tender/install-config.json`). Reads are fail-soft: a missing or
//! unparseable file yields an empty config (nothing is Tender-managed), never
//! an error — Tender simply reports apps as not-installed.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::PathBuf;

use crate::profile::CapabilityProfile;

/// Current install-config schema version (for forward-compatible migration).
pub const SCHEMA_VERSION: u32 = 1;

/// How Tender launches a managed service. C2's operator-grade start/stop reads
/// this in place of the dev-path `dotnet run` coupling. Minimal in C1; extended
/// as install (C3) records real placed-bundle launch details.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchContract {
    /// Absolute path to the executable/bundle Tender launches.
    pub program: String,
    /// Arguments passed to the program.
    #[serde(default)]
    pub args: Vec<String>,
    /// Optional health URL Tender polls to confirm the service is up.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub health_url: Option<String>,
}

/// One Tender-managed app install.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledApp {
    /// Service id — matches `HarborlineService.id`
    /// (`signal-bridge` | `sunfish` | `flight-deck`).
    pub id: String,
    /// Installed version — recorded honestly at install time (not hardcoded).
    pub version: String,
    /// Absolute install location (the placed bundle/dir).
    pub install_path: String,
    /// The capability profile resolved for this install (ADR 0116 D2).
    pub profile: CapabilityProfile,
    /// How Tender launches it (C2 reads this).
    pub launch: LaunchContract,
}

/// Tender's install-config record — the source of truth for what Tender manages.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallConfig {
    /// Schema version for forward-compatible migration.
    pub schema_version: u32,
    /// Installed apps keyed by service id.
    #[serde(default)]
    pub apps: BTreeMap<String, InstalledApp>,
}

impl Default for InstallConfig {
    fn default() -> Self {
        Self {
            schema_version: SCHEMA_VERSION,
            apps: BTreeMap::new(),
        }
    }
}

impl InstallConfig {
    /// Look up a managed app by service id.
    pub fn app(&self, id: &str) -> Option<&InstalledApp> {
        self.apps.get(id)
    }

    /// Record (insert or replace) a managed app install.
    pub fn upsert(&mut self, app: InstalledApp) {
        self.apps.insert(app.id.clone(), app);
    }
}

// ── Persistence ──────────────────────────────────────────────────────────────

/// The OS app-config directory for Tender (cross-platform, dependency-free):
/// - macOS: `$HOME/Library/Application Support/Tender`
/// - Windows: `%APPDATA%\Tender`
/// - Linux: `$XDG_CONFIG_HOME/Tender` or `$HOME/.config/Tender`
pub fn config_dir() -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var_os("HOME")?;
        Some(
            PathBuf::from(home)
                .join("Library")
                .join("Application Support")
                .join("Tender"),
        )
    }
    #[cfg(target_os = "windows")]
    {
        let appdata = std::env::var_os("APPDATA")?;
        Some(PathBuf::from(appdata).join("Tender"))
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        if let Some(xdg) = std::env::var_os("XDG_CONFIG_HOME") {
            Some(PathBuf::from(xdg).join("Tender"))
        } else {
            let home = std::env::var_os("HOME")?;
            Some(PathBuf::from(home).join(".config").join("Tender"))
        }
    }
}

/// Absolute path to the install-config JSON file.
pub fn config_path() -> Option<PathBuf> {
    config_dir().map(|d| d.join("install-config.json"))
}

/// Load the install config from disk. **Fail-soft:** a missing file or an
/// unreadable/unparseable one yields `InstallConfig::default()` (nothing
/// Tender-managed), never an error.
pub fn load() -> InstallConfig {
    load_from(config_path().as_deref())
}

/// Load from an explicit path (testable seam). `None` ⇒ default.
fn load_from(path: Option<&std::path::Path>) -> InstallConfig {
    let Some(path) = path else {
        return InstallConfig::default();
    };
    match std::fs::read_to_string(path) {
        Ok(text) => serde_json::from_str(&text).unwrap_or_default(),
        Err(_) => InstallConfig::default(),
    }
}

/// Persist the install config to disk (creating the config dir if needed).
/// Returns `Err(String)` only on a genuine I/O/serialisation failure.
pub fn save(config: &InstallConfig) -> Result<(), String> {
    let path = config_path().ok_or_else(|| "cannot resolve config dir".to_string())?;
    save_to(config, &path)
}

/// Persist to an explicit path (testable seam).
fn save_to(config: &InstallConfig, path: &std::path::Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("cannot create config dir {}: {e}", parent.display()))?;
    }
    let json = serde_json::to_string_pretty(config)
        .map_err(|e| format!("cannot serialise install config: {e}"))?;
    std::fs::write(path, json)
        .map_err(|e| format!("cannot write {}: {e}", path.display()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::profile::ProfileName;

    fn sample_app(id: &str, version: &str) -> InstalledApp {
        InstalledApp {
            id: id.to_string(),
            version: version.to_string(),
            install_path: format!("/opt/{id}"),
            profile: CapabilityProfile {
                name: ProfileName::Standard,
                axes: BTreeMap::new(),
                user_overridden: false,
            },
            launch: LaunchContract {
                program: format!("/opt/{id}/run"),
                args: vec!["--serve".to_string()],
                health_url: Some("http://localhost:1234/health".to_string()),
            },
        }
    }

    #[test]
    fn missing_file_loads_default_empty_config() {
        let cfg = load_from(Some(std::path::Path::new(
            "/nonexistent/tender/install-config.json",
        )));
        assert_eq!(cfg.schema_version, SCHEMA_VERSION);
        assert!(cfg.apps.is_empty());
        assert!(cfg.app("sunfish").is_none());
    }

    #[test]
    fn none_path_loads_default() {
        let cfg = load_from(None);
        assert!(cfg.apps.is_empty());
    }

    #[test]
    fn save_then_load_round_trips() {
        let dir = std::env::temp_dir().join(format!("tender-ic-test-{}", std::process::id()));
        let path = dir.join("install-config.json");
        let _ = std::fs::remove_dir_all(&dir);

        let mut cfg = InstallConfig::default();
        cfg.upsert(sample_app("sunfish", "0.1.0-dev"));
        save_to(&cfg, &path).expect("save");

        let back = load_from(Some(&path));
        assert_eq!(back.schema_version, SCHEMA_VERSION);
        let app = back.app("sunfish").expect("sunfish recorded");
        assert_eq!(app.version, "0.1.0-dev");
        assert_eq!(app.launch.program, "/opt/sunfish/run");
        assert_eq!(app.profile.name, ProfileName::Standard);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn upsert_replaces_existing() {
        let mut cfg = InstallConfig::default();
        cfg.upsert(sample_app("sunfish", "0.1.0"));
        cfg.upsert(sample_app("sunfish", "0.2.0"));
        assert_eq!(cfg.apps.len(), 1);
        assert_eq!(cfg.app("sunfish").unwrap().version, "0.2.0");
    }

    #[test]
    fn corrupt_file_loads_default_not_error() {
        let dir = std::env::temp_dir().join(format!("tender-ic-corrupt-{}", std::process::id()));
        let path = dir.join("install-config.json");
        let _ = std::fs::create_dir_all(&dir);
        std::fs::write(&path, "{ this is not valid json ").unwrap();

        let cfg = load_from(Some(&path));
        assert!(cfg.apps.is_empty(), "corrupt file must fail soft to empty");

        let _ = std::fs::remove_dir_all(&dir);
    }
}
