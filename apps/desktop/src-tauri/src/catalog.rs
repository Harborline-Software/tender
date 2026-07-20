//! App catalog (CFG-1) — the declarative manifest layer Tender *knows about*.
//!
//! This is the **"available" layer** of the three-layer config model
//! (APP-CATALOG-CONFIG.md §3): catalog (what Tender knows about) over
//! install-state (`install_config`, what's actually installed) over settings
//! (Tender's own config — CFG-2). It de-hardcodes the managed apps that
//! `telemetry.rs` formerly baked in (id, display name, process pattern, health
//! URL) into one declarative **app manifest** per app.
//!
//! # Distinct from the business-case bundle manifests
//!
//! This is a **different layer** from `bundles.rs` (`*.bundle.json`). A
//! bundle manifest = business-case provisioning *inside* an installed app
//! (which modules a tenant turns on); an app manifest (`*.app.json`) = the
//! app *package* itself. Per the ONR scoping warning (§12) they are kept
//! separate types and separate files.
//!
//! # Resolution + override (§4)
//!
//! Bundled defaults ship at `resources/catalog/<id>.app.json`; user overrides
//! live at `<config>/Tender/catalog/<id>.app.json`. An override wins by `id`.
//! Loading is **fail-soft**: a missing or unparseable manifest is skipped with
//! a logged warning, never a hard error — a bad manifest can never blank the
//! whole catalog.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::PathBuf;

use crate::install::InstallSourceKind;
use crate::install_config::{self, InstalledApp};

// ── Manifest enums ──────────────────────────────────────────────────────────

/// Where an app sits on the readiness ladder (§5).
///
/// `planned ──► packaged ──► released` (+ `deprecated`). The mode gate (CFG-2)
/// keys off this: dev-mode shows `packaged` and up; end-user-mode shows
/// `released` only — so a not-yet-ready app is honestly hidden, not faked.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Availability {
    /// No packaging exists yet — visible (dev), not installable.
    Planned,
    /// Local build, unsigned, with known caveats — installable in dev-mode.
    Packaged,
    /// Signed, backend boots clean, shippable off a feed — installable anywhere.
    Released,
    /// Retired; kept for honesty / migration.
    Deprecated,
}

/// Severity of a structured caveat (§6).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CaveatSeverity {
    /// Blocks the app from working until resolved (e.g. unsigned keychain boot).
    Blocker,
    /// Degrades or constrains the app but it still runs.
    Warning,
    /// Purely informational.
    Info,
}

// ── Manifest sub-structs ────────────────────────────────────────────────────

/// How Tender detects whether the app is running (§8). Replaces the hardcoded
/// `pgrep` pattern / health URL constants from `telemetry.rs`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectSpec {
    /// The `pgrep -f` pattern that identifies the app's process.
    pub process_pattern: String,
    /// Optional health URL. `None` ⇒ process-only detection (the app binds an
    /// ephemeral internal port Tender cannot poll from outside).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub health_url: Option<String>,
}

/// Where + how Tender installs the app (§4). Reuses the C3 `InstallSourceKind`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallSpec {
    /// The kind of local artifact (`appBundle` | `tarGz`), shared with C3.
    pub source_kind: InstallSourceKind,
    /// Where to fetch from: a local build ref (`local:auto`), a path, or (later)
    /// a feed ref. `None` ⇒ not resolvable yet (e.g. a `planned` app).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
    /// Whether a signed artifact is required (gates the `released` rung / audience).
    pub requires_signing: bool,
}

/// A sub-service the app owns (§9), with its own boot + health scope.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceDef {
    /// Stable sub-service id (e.g. `local-node`, `book-server`, `relay`).
    pub id: String,
    /// How the sub-service boots (e.g. `self-supervised`, `supervised`, `process`).
    pub boot: String,
    /// How (or whether) the detector can probe it: `internal` | `local-port` | `remote`.
    pub health_scope: String,
}

/// A declarative app action (§4) — generalises the hardcoded
/// `emergency_stop` / `restart_signal_bridge` commands.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionDef {
    /// Stable action id (e.g. `restart`, `emergency-stop`).
    pub id: String,
    /// Action kind (e.g. `process-restart`, `http-post`).
    pub kind: String,
}

/// A structured routed finding (§6) — a caveat that used to be tribal knowledge
/// now lives in the manifest as data.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Caveat {
    /// Stable caveat id (e.g. `unsigned-keychain-boot`).
    pub id: String,
    /// How severe the caveat is.
    pub severity: CaveatSeverity,
    /// Human-readable one-line summary.
    pub summary: String,
    /// Optional condition under which the caveat applies (e.g.
    /// `availability < released`). Free-form; consumed by CFG-2/CFG-3.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub applies_when: Option<String>,
}

// ── Primary manifest ────────────────────────────────────────────────────────

/// One declarative app manifest (`<id>.app.json`). The unit the catalog is
/// composed of; replaces the closed `signal-bridge | sunfish | flight-deck`
/// hardcoding with an open `id` string.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppManifest {
    /// Open string id (e.g. `sunfish`). Matches `HarborlineService.id` +
    /// `InstalledApp.id`. The merge + dedup key.
    pub id: String,
    /// Human-readable name.
    pub display_name: String,
    /// Optional vendor label.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub vendor: Option<String>,
    /// Optional icon resource key.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    /// Where the app sits on the readiness ladder (§5).
    pub availability: Availability,
    /// How Tender detects whether it is running (§8).
    pub detect: DetectSpec,
    /// Where + how Tender installs it (§4).
    pub install: InstallSpec,
    /// Sub-services the app owns (§9).
    #[serde(default)]
    pub services: Vec<ServiceDef>,
    /// Declarative app actions (§4).
    #[serde(default)]
    pub actions: Vec<ActionDef>,
    /// Structured routed caveats (§6).
    #[serde(default)]
    pub caveats: Vec<Caveat>,
}

// ── Fleet DTO (the resolved per-app state CFG-3's Fleet tab consumes) ───────

/// The resolved per-app state for the state-driven Fleet UI: the manifest plus
/// the honest live install/run state composed over it. This is the NEW surface
/// the catalog-driven Fleet tab consumes (distinct from the legacy
/// `HarborlineService` list `get_services` still returns).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FleetEntry {
    /// The declarative manifest.
    pub manifest: AppManifest,
    /// Honest `installed` (C1: Tender-managed OR currently running).
    pub installed: bool,
    /// Honest `version` (C1: recorded version, else `"unknown"`/`""`).
    pub version: String,
    /// `running` | `stopped` (process/health detection per the manifest).
    pub status: String,
    /// Whether this app is shown in end-user mode (`availability == released`).
    /// The CFG-1 surface of the §10 mode gate; CFG-2 wires the live mode toggle.
    pub visible_in_end_user_mode: bool,
}

// ── Catalog directory resolution ────────────────────────────────────────────

/// Resolve the **bundled default** catalog directory (`resources/catalog/`).
///
/// Mirrors `bundles::bundle_manifests_dir` resolution: try the Tauri resource
/// dir relative to the current executable first (shipped `.app` + `cargo tauri
/// dev`), then fall back to the dev sibling fleet layout for bare
/// `cargo build` / `cargo test` without a full Tauri context. Returns `None`
/// when no candidate exists (fail-soft: an empty bundled set is valid).
fn bundled_catalog_dir() -> Option<PathBuf> {
    if let Ok(exe) = std::env::current_exe() {
        // Shipped .app:  Tender.app/Contents/MacOS/tender
        // Resources at:  Tender.app/Contents/Resources/resources/catalog/
        if let Some(rp) = exe
            .parent() // MacOS/
            .and_then(|p| p.parent()) // Contents/
            .map(|p| p.join("Resources").join("resources").join("catalog"))
        {
            if rp.exists() {
                return Some(rp);
            }
        }

        // `cargo tauri dev`: resources are placed next to the exe under target/.
        if let Some(drp) = exe.parent().map(|p| p.join("resources").join("catalog")) {
            if drp.exists() {
                return Some(drp);
            }
        }
    }

    // Source-tree fallback so bare `cargo test` / `cargo check` (no Tauri
    // bundling) still see the manifests — resolved from the crate root at COMPILE
    // time (`CARGO_MANIFEST_DIR`), NOT a hardcoded fleet-layout path (we retired
    // those dev-isms). In a shipped build the Resources candidate above wins; the
    // baked crate path simply won't exist on an end-user box (fail-soft → None).
    let crate_local = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join("catalog");
    if crate_local.exists() {
        return Some(crate_local);
    }

    None
}

/// Resolve the **user override** catalog directory
/// (`<config>/Tender/catalog/`). `None` when the config dir cannot be resolved.
fn user_catalog_dir() -> Option<PathBuf> {
    install_config::config_dir().map(|d| d.join("catalog"))
}

// ── Loader ──────────────────────────────────────────────────────────────────

/// Read every `*.app.json` from a directory, fail-soft. A missing directory is
/// an empty map; an unparseable file is **skipped with a logged warning**,
/// never a hard error.
fn read_manifests_from(dir: Option<&std::path::Path>) -> BTreeMap<String, AppManifest> {
    let mut out = BTreeMap::new();
    let Some(dir) = dir else {
        return out;
    };
    let Ok(entries) = std::fs::read_dir(dir) else {
        return out; // missing dir ⇒ empty set (fail-soft)
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or_default();
        if !name.ends_with(".app.json") {
            continue;
        }
        match std::fs::read_to_string(&path) {
            Ok(text) => match serde_json::from_str::<AppManifest>(&text) {
                Ok(manifest) => {
                    out.insert(manifest.id.clone(), manifest);
                }
                Err(e) => {
                    eprintln!(
                        "[catalog] skipping unparseable manifest {}: {e}",
                        path.display()
                    );
                }
            },
            Err(e) => {
                eprintln!(
                    "[catalog] skipping unreadable manifest {}: {e}",
                    path.display()
                );
            }
        }
    }
    out
}

/// Load the resolved app catalog: bundled defaults MERGED with user overrides,
/// override winning by `id` (§4). Fail-soft throughout — a missing or bad
/// manifest is skipped, never an error. Returns manifests sorted by `id` (the
/// `BTreeMap` ordering) for stable UI rendering.
pub fn load_catalog() -> Vec<AppManifest> {
    load_catalog_from(
        bundled_catalog_dir().as_deref(),
        user_catalog_dir().as_deref(),
    )
}

/// Loader seam over explicit dirs (testable). Bundled first, then user
/// overrides layered on top (override wins by `id`).
fn load_catalog_from(
    bundled: Option<&std::path::Path>,
    user: Option<&std::path::Path>,
) -> Vec<AppManifest> {
    let mut merged = read_manifests_from(bundled);
    for (id, manifest) in read_manifests_from(user) {
        merged.insert(id, manifest); // override wins by id
    }
    merged.into_values().collect()
}

// ── Fleet resolution (the catalog ∪ install-state composition) ─────────────

/// Whether an app at this rung is shown in end-user mode (§5/§10): only
/// `released`. The CFG-1 surface of the mode gate (CFG-2 wires the live toggle).
fn visible_in_end_user_mode(availability: Availability) -> bool {
    matches!(availability, Availability::Released)
}

/// Compose the catalog with the install-state into the resolved Fleet DTO list.
///
/// Pure over its inputs (no I/O) so it is unit-testable. The `running`
/// determination (process/health probe) is the caller's concern (it's async +
/// shells out); this folds an already-resolved `running` per id. `installed` /
/// `version` follow the **C1 honest rules** exactly (managed-or-running;
/// recorded-or-unknown), mirroring `telemetry::honest_install`.
pub fn resolve_fleet_entries(
    catalog: &[AppManifest],
    config: &install_config::InstallConfig,
    running_by_id: &BTreeMap<String, bool>,
) -> Vec<FleetEntry> {
    catalog
        .iter()
        .map(|manifest| {
            let managed = config.app(&manifest.id);
            let running = running_by_id.get(&manifest.id).copied().unwrap_or(false);
            let (installed, version) = honest_install(managed, running);
            FleetEntry {
                manifest: manifest.clone(),
                installed,
                version,
                status: if running { "running" } else { "stopped" }.to_string(),
                visible_in_end_user_mode: visible_in_end_user_mode(manifest.availability),
            }
        })
        .collect()
}

/// The C1 honest `installed`/`version` rule, shared with `telemetry`.
///
/// `installed` = Tender-managed OR currently running (present on this box in
/// some form). `version` = the recorded version of a managed install; for an
/// unmanaged-but-running app the real version is not yet known (a probe is C3),
/// so `"unknown"`; for an absent app `""`. This is the SAME logic
/// `telemetry::honest_install` applies — kept here so the catalog DTO resolution
/// is honest by construction.
pub(crate) fn honest_install(managed: Option<&InstalledApp>, running: bool) -> (bool, String) {
    match managed {
        Some(app) => (true, app.version.clone()),
        None if running => (true, "unknown".to_string()),
        None => (false, String::new()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::install_config::{InstallConfig, InstalledApp, LaunchContract};
    use crate::profile::CapabilityProfile;

    fn sample_manifest_json(id: &str, display: &str, availability: &str) -> String {
        format!(
            r#"{{
  "id": "{id}",
  "displayName": "{display}",
  "vendor": "Harborline",
  "availability": "{availability}",
  "detect": {{ "processPattern": "Some.Proc", "healthUrl": null }},
  "install": {{ "sourceKind": "appBundle", "source": "local:auto", "requiresSigning": false }},
  "services": [ {{ "id": "local-node", "boot": "self-supervised", "healthScope": "internal" }} ],
  "actions": [ {{ "id": "restart", "kind": "process-restart" }} ],
  "caveats": [ {{ "id": "x", "severity": "blocker", "summary": "s", "appliesWhen": "availability < released" }} ]
}}"#
        )
    }

    #[test]
    fn manifest_round_trips_through_json() {
        let json = sample_manifest_json("sunfish", "Sunfish", "packaged");
        let m: AppManifest = serde_json::from_str(&json).expect("parse");
        assert_eq!(m.id, "sunfish");
        assert_eq!(m.display_name, "Sunfish");
        assert_eq!(m.availability, Availability::Packaged);
        assert_eq!(m.detect.process_pattern, "Some.Proc");
        assert!(m.detect.health_url.is_none());
        assert_eq!(m.install.source_kind, InstallSourceKind::AppBundle);
        assert_eq!(m.install.source.as_deref(), Some("local:auto"));
        assert!(!m.install.requires_signing);
        assert_eq!(m.services.len(), 1);
        assert_eq!(m.actions.len(), 1);
        assert_eq!(m.caveats.len(), 1);
        assert_eq!(m.caveats[0].severity, CaveatSeverity::Blocker);

        // Serialize back out and re-parse — fields survive the round trip.
        let back = serde_json::to_string(&m).expect("serialize");
        let m2: AppManifest = serde_json::from_str(&back).expect("re-parse");
        assert_eq!(m2.id, m.id);
        assert_eq!(m2.availability, m.availability);
    }

    /// Availability serialises lowercase (frontend-facing).
    #[test]
    fn availability_serde_is_lowercase() {
        assert_eq!(
            serde_json::to_string(&Availability::Released).unwrap(),
            "\"released\""
        );
        let a: Availability = serde_json::from_str("\"planned\"").unwrap();
        assert_eq!(a, Availability::Planned);
    }

    fn write_manifest(dir: &std::path::Path, id: &str, body: &str) {
        std::fs::create_dir_all(dir).unwrap();
        std::fs::write(dir.join(format!("{id}.app.json")), body).unwrap();
    }

    #[test]
    fn override_wins_by_id() {
        let tmp = std::env::temp_dir().join(format!("tender-catalog-ovr-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&tmp);
        let bundled = tmp.join("bundled");
        let user = tmp.join("user");

        // Bundled: sunfish=packaged + flight-deck=packaged.
        write_manifest(
            &bundled,
            "sunfish",
            &sample_manifest_json("sunfish", "Sunfish", "packaged"),
        );
        write_manifest(
            &bundled,
            "flight-deck",
            &sample_manifest_json("flight-deck", "Flight-Deck", "packaged"),
        );
        // User override: sunfish bumped to released (must win); a new app added.
        write_manifest(
            &user,
            "sunfish",
            &sample_manifest_json("sunfish", "Sunfish (override)", "released"),
        );
        write_manifest(
            &user,
            "extra-app",
            &sample_manifest_json("extra-app", "Extra", "planned"),
        );

        let catalog = load_catalog_from(Some(&bundled), Some(&user));
        assert_eq!(catalog.len(), 3, "two bundled + one new override app");

        let sunfish = catalog.iter().find(|m| m.id == "sunfish").unwrap();
        assert_eq!(
            sunfish.display_name, "Sunfish (override)",
            "override wins by id"
        );
        assert_eq!(sunfish.availability, Availability::Released);

        assert!(
            catalog.iter().any(|m| m.id == "extra-app"),
            "user-only app present"
        );
        assert!(
            catalog.iter().any(|m| m.id == "flight-deck"),
            "non-overridden bundled app present"
        );

        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn fail_soft_on_bad_json_skips_only_the_bad_manifest() {
        let tmp = std::env::temp_dir().join(format!("tender-catalog-bad-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&tmp);
        let bundled = tmp.join("bundled");

        write_manifest(
            &bundled,
            "good",
            &sample_manifest_json("good", "Good", "packaged"),
        );
        write_manifest(&bundled, "bad", "{ this is not valid json ");
        // A non-manifest file in the dir must be ignored entirely.
        std::fs::write(bundled.join("README.md"), "not a manifest").unwrap();

        let catalog = load_catalog_from(Some(&bundled), None);
        assert_eq!(
            catalog.len(),
            1,
            "the bad manifest is skipped, the good one survives"
        );
        assert_eq!(catalog[0].id, "good");

        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn missing_dirs_yield_empty_catalog_not_error() {
        let catalog = load_catalog_from(
            Some(std::path::Path::new("/nonexistent/tender/catalog")),
            None,
        );
        assert!(catalog.is_empty());
    }

    fn managed_app(id: &str, version: &str) -> InstalledApp {
        InstalledApp {
            id: id.to_string(),
            version: version.to_string(),
            install_path: format!("/opt/{id}"),
            profile: CapabilityProfile::minimum_floor(),
            launch: LaunchContract {
                program: format!("/opt/{id}/run"),
                args: vec![],
                health_url: None,
            },
        }
    }

    #[test]
    fn resolve_fleet_entries_honours_c1_honest_rules() {
        let catalog: Vec<AppManifest> = serde_json::from_str(&format!(
            "[{},{},{}]",
            sample_manifest_json("sunfish", "Sunfish", "packaged"),
            sample_manifest_json("flight-deck", "Flight-Deck", "packaged"),
            sample_manifest_json("signal-bridge", "Signal-Bridge", "planned"),
        ))
        .unwrap();

        let mut config = InstallConfig::default();
        config.upsert(managed_app("sunfish", "0.3.0-dev")); // managed, not running

        let mut running = BTreeMap::new();
        running.insert("flight-deck".to_string(), true); // unmanaged, running
                                                         // signal-bridge: neither managed nor running

        let entries = resolve_fleet_entries(&catalog, &config, &running);
        let by_id = |id: &str| entries.iter().find(|e| e.manifest.id == id).unwrap();

        // Managed + stopped ⇒ installed, recorded version, status stopped.
        let sf = by_id("sunfish");
        assert!(sf.installed);
        assert_eq!(sf.version, "0.3.0-dev");
        assert_eq!(sf.status, "stopped");
        assert!(!sf.visible_in_end_user_mode, "packaged is dev-only");

        // Unmanaged + running ⇒ installed, version unknown (no fiction), running.
        let fd = by_id("flight-deck");
        assert!(fd.installed);
        assert_eq!(fd.version, "unknown");
        assert_eq!(fd.status, "running");

        // Neither ⇒ not installed, empty version (the case the old hardcoding lied about).
        let sb = by_id("signal-bridge");
        assert!(!sb.installed);
        assert_eq!(sb.version, "");
        assert_eq!(sb.status, "stopped");
    }

    #[test]
    fn end_user_visibility_only_for_released() {
        assert!(visible_in_end_user_mode(Availability::Released));
        assert!(!visible_in_end_user_mode(Availability::Packaged));
        assert!(!visible_in_end_user_mode(Availability::Planned));
        assert!(!visible_in_end_user_mode(Availability::Deprecated));
    }

    /// The 3 bundled default manifests parse via the loader from the source tree.
    /// Guards against a malformed shipped manifest (loads from the dev sibling
    /// path so it works under bare `cargo test`).
    #[test]
    fn bundled_default_manifests_parse() {
        // Resolve the catalog resources dir relative to this source file so the
        // test is independent of cwd / HOME.
        let dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("resources")
            .join("catalog");
        let catalog = load_catalog_from(Some(&dir), None);
        let ids: Vec<&str> = catalog.iter().map(|m| m.id.as_str()).collect();
        assert!(
            ids.contains(&"sunfish"),
            "sunfish manifest loaded: got {ids:?}"
        );
        assert!(
            ids.contains(&"flight-deck"),
            "flight-deck manifest loaded: got {ids:?}"
        );
        assert!(
            ids.contains(&"signal-bridge"),
            "signal-bridge manifest loaded: got {ids:?}"
        );

        let sunfish = catalog.iter().find(|m| m.id == "sunfish").unwrap();
        assert_eq!(sunfish.availability, Availability::Packaged);
        assert_eq!(sunfish.detect.process_pattern, "Sunfish.Anchor");
        assert!(
            sunfish
                .caveats
                .iter()
                .any(|c| c.id == "unsigned-keychain-boot"),
            "sunfish carries the unsigned-keychain-boot caveat"
        );

        // signal-bridge + flight-deck retired 2026-07-06: both source repos were
        // archived 2026-06-29 (moved out of the active fleet tree), so the
        // Toolbox no longer offers to install/manage them — the catalog's
        // existing `deprecated` rung (not deletion) marks that honestly.
        let sb = catalog.iter().find(|m| m.id == "signal-bridge").unwrap();
        assert_eq!(sb.availability, Availability::Deprecated);
        assert_eq!(sb.detect.process_pattern, "Sunfish.Bridge.AppHost");
        assert!(
            sb.caveats.iter().any(|c| c.id == "repo-archived"),
            "signal-bridge carries the repo-archived retirement caveat"
        );

        let fd = catalog.iter().find(|m| m.id == "flight-deck").unwrap();
        assert_eq!(fd.availability, Availability::Deprecated);
        assert!(
            fd.caveats.iter().any(|c| c.id == "repo-archived"),
            "flight-deck carries the repo-archived retirement caveat"
        );
    }
}
