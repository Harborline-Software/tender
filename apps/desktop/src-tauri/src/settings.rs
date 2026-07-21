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
//! Deliberately minimal — only `mode` is consumed today (it gates the fleet via
//! `telemetry::get_fleet` + backs the header DEV pill). Extend with telemetry
//! posture / enabled-app allowlist / monitor intervals when those are actually
//! wired, not speculatively. Autostart is NOT mirrored here — it stays
//! single-sourced in its LaunchAgent (`autostart.rs`); the UI reads it via
//! `get_autostart`.

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
}

impl Default for TenderSettings {
    fn default() -> Self {
        Self {
            schema_version: SETTINGS_SCHEMA_VERSION,
            mode: Mode::Dev,
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
    let json =
        serde_json::to_string_pretty(settings).map_err(|e| format!("serialise settings: {e}"))?;
    std::fs::write(path, json).map_err(|e| format!("write {}: {e}", path.display()))
}

/// Set the mode + persist; returns the updated settings.
pub fn set_mode(mode: Mode) -> Result<TenderSettings, String> {
    let mut settings = load();
    settings.mode = mode;
    save(&settings)?;
    Ok(settings)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_mode_is_dev() {
        assert_eq!(TenderSettings::default().mode, Mode::Dev);
    }

    #[test]
    fn mode_serialises_to_design_tokens() {
        assert_eq!(serde_json::to_string(&Mode::Dev).unwrap(), "\"dev\"");
        assert_eq!(
            serde_json::to_string(&Mode::EndUser).unwrap(),
            "\"end-user\""
        );
    }

    #[test]
    fn missing_file_loads_default() {
        let s = load_from(Some(std::path::Path::new(
            "/nonexistent/tender-settings.json",
        )));
        assert_eq!(s.mode, Mode::Dev);
        assert_eq!(s.schema_version, SETTINGS_SCHEMA_VERSION);
    }

    #[test]
    fn corrupt_file_fails_soft_to_default() {
        let dir =
            std::env::temp_dir().join(format!("tender-settings-corrupt-{}", std::process::id()));
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
        };
        save_to(&s, &path).expect("save");
        let back = load_from(Some(&path));
        assert_eq!(back.mode, Mode::EndUser);

        let _ = std::fs::remove_dir_all(&dir);
    }
}
