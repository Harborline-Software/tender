//! Tender settings (CFG-2) — Tender's own configuration: the third layer of the
//! config model (catalog / install-state / **settings**, APP-CATALOG-CONFIG.md §3).
//!
//! The load-bearing setting is `mode` (dev | end-user, §10): **dev** shows
//! `packaged`+ apps (caveats surfaced, install affordances on) — the buildout
//! posture while everything is in motion; **end-user** shows only `released`
//! apps, so not-ready apps are honestly hidden. Persisted to
//! `<config>/Tender/tender-settings.json`. **Fail-soft**: a missing or unreadable
//! file yields the default (`dev`).
//!
//! The fleet-dashboard URL also lives here so operators can correct connection
//! targets without rebuilding or editing launch environments. Autostart is NOT
//! mirrored here — it stays single-sourced in its LaunchAgent (`autostart.rs`);
//! the UI reads it via `get_autostart`.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::install_config;

/// Current settings schema version (for forward-compatible migration).
pub const SETTINGS_SCHEMA_VERSION: u32 = 1;

/// Dev vs end-user posture (§10). Drives the readiness gate (which apps the
/// fleet shows / offers to install) and the header DEV pill.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum Mode {
    /// Builder's box, work in motion: shows `packaged`+ apps with caveats +
    /// install affordances. The default while everything is still being built.
    #[default]
    Dev,
    /// Clean deployment: shows only `released` apps; not-ready apps are hidden.
    EndUser,
}

/// Tender's persisted settings.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TenderSettings {
    pub schema_version: u32,
    pub mode: Mode,
    #[serde(default)]
    pub fleet_dashboard_url: Option<String>,
}

impl Default for TenderSettings {
    fn default() -> Self {
        Self {
            schema_version: SETTINGS_SCHEMA_VERSION,
            mode: Mode::Dev,
            fleet_dashboard_url: None,
        }
    }
}

// ── Persistence ──────────────────────────────────────────────────────────────

/// Absolute path to the settings file (`<config>/Tender/tender-settings.json`).
pub fn settings_path() -> Option<PathBuf> {
    install_config::config_dir().map(|d| d.join("tender-settings.json"))
}

/// Load settings. **Fail-soft**: missing/unreadable/unparseable ⇒ default (`dev`).
pub fn load() -> TenderSettings {
    load_from(settings_path().as_deref())
}

/// Load from an explicit path (testable seam). `None` ⇒ default.
fn load_from(path: Option<&std::path::Path>) -> TenderSettings {
    let Some(path) = path else {
        return TenderSettings::default();
    };
    match std::fs::read_to_string(path) {
        Ok(text) => serde_json::from_str(&text).unwrap_or_default(),
        Err(_) => TenderSettings::default(),
    }
}

/// Persist settings (creating the config dir if needed).
pub fn save(settings: &TenderSettings) -> Result<(), String> {
    let path = settings_path().ok_or_else(|| "cannot resolve config dir".to_string())?;
    save_to(settings, &path)
}

fn save_to(settings: &TenderSettings, path: &std::path::Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("create config dir {}: {e}", parent.display()))?;
    }
    let json = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("serialise settings: {e}"))?;
    std::fs::write(path, json).map_err(|e| format!("write {}: {e}", path.display()))
}

/// Set the mode + persist; returns the updated settings.
pub fn set_mode(mode: Mode) -> Result<TenderSettings, String> {
    let mut settings = load();
    settings.mode = mode;
    save(&settings)?;
    Ok(settings)
}

/// Validate, normalize, and persist the optional fleet-dashboard URL.
/// An empty string clears the saved value. Only HTTP(S) URLs with a host are
/// accepted; credentials are rejected because this value is stored as plain
/// operator configuration.
pub fn set_fleet_dashboard_url(value: Option<String>) -> Result<TenderSettings, String> {
    let normalized = normalize_web_url(value.as_deref())?;
    let mut settings = load();
    settings.fleet_dashboard_url = normalized;
    save(&settings)?;
    Ok(settings)
}

pub fn normalize_web_url(value: Option<&str>) -> Result<Option<String>, String> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    let parsed = url::Url::parse(value)
        .map_err(|_| "Fleet Dashboard must be a valid http or https URL.".to_string())?;
    if !matches!(parsed.scheme(), "http" | "https") || parsed.host_str().is_none() {
        return Err("Fleet Dashboard must be a valid http or https URL.".to_string());
    }
    if !parsed.username().is_empty() || parsed.password().is_some() {
        return Err("Fleet Dashboard URL must not contain credentials.".to_string());
    }
    Ok(Some(parsed.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_mode_is_dev() {
        assert_eq!(TenderSettings::default().mode, Mode::Dev);
        assert_eq!(TenderSettings::default().fleet_dashboard_url, None);
    }

    #[test]
    fn mode_serialises_to_design_tokens() {
        assert_eq!(serde_json::to_string(&Mode::Dev).unwrap(), "\"dev\"");
        assert_eq!(serde_json::to_string(&Mode::EndUser).unwrap(), "\"end-user\"");
    }

    #[test]
    fn missing_file_loads_default() {
        let s = load_from(Some(std::path::Path::new("/nonexistent/tender-settings.json")));
        assert_eq!(s.mode, Mode::Dev);
        assert_eq!(s.schema_version, SETTINGS_SCHEMA_VERSION);
    }

    #[test]
    fn corrupt_file_fails_soft_to_default() {
        let dir = std::env::temp_dir().join(format!("tender-settings-corrupt-{}", std::process::id()));
        let path = dir.join("tender-settings.json");
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(&path, "{ not json").unwrap();
        assert_eq!(load_from(Some(&path)).mode, Mode::Dev);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn save_then_load_round_trips_end_user() {
        let dir = std::env::temp_dir().join(format!("tender-settings-rt-{}", std::process::id()));
        let path = dir.join("tender-settings.json");
        let _ = std::fs::remove_dir_all(&dir);

        let s = TenderSettings {
            schema_version: SETTINGS_SCHEMA_VERSION,
            mode: Mode::EndUser,
            fleet_dashboard_url: Some("http://dashboard.example:8880/fleet/".to_string()),
        };
        save_to(&s, &path).expect("save");
        let back = load_from(Some(&path));
        assert_eq!(back.mode, Mode::EndUser);
        assert_eq!(back.fleet_dashboard_url, s.fleet_dashboard_url);

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn dashboard_url_normalizes_and_rejects_unsafe_values() {
        assert_eq!(normalize_web_url(Some("  ")).unwrap(), None);
        assert_eq!(
            normalize_web_url(Some("http://dashboard.example:8880/fleet")).unwrap(),
            Some("http://dashboard.example:8880/fleet".to_string())
        );
        assert!(normalize_web_url(Some("file:///tmp/dashboard")).is_err());
        assert!(normalize_web_url(Some("http://user:secret@dashboard.example/")).is_err());
    }

    #[test]
    fn legacy_settings_without_dashboard_url_still_load() {
        let settings: TenderSettings =
            serde_json::from_str(r#"{"schemaVersion":1,"mode":"dev"}"#)
                .expect("legacy settings parse");
        assert_eq!(settings.fleet_dashboard_url, None);
    }
}
