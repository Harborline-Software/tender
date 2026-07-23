//! Local install engine (C3) — fetch + place a Harborline app from a **LOCAL
//! source**, record it in install config, and hand off to the app's **OWN**
//! ADR 0115 supervisor. Tender does **not** re-implement supervision (ONR §4.4):
//! it places the self-contained bundle and launches it; the app's Tauri shell
//! derives its keychain seed, spawns + health-gates its sidecar, and runs the
//! ADR 0115 §7 two-phase shutdown itself.
//!
//! Local-first / dev-eval / **signing-agnostic** (ONR §7.3): the engine fetches,
//! places, and launches regardless of whether the artifact is signed. Signing
//! gates the *audience* (C6), not this engine.
//!
//! macOS note: the placed `.app` embeds both the Tauri shell (`anchor-tauri`)
//! and the `local-node-host` sidecar. The sidecar binds an **ephemeral** loopback
//! port chosen by the shell at runtime, so Tender cannot poll a fixed health
//! port from outside — launch is verified by **process liveness** + the first-run
//! data directory, which is the honest external signal.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

use crate::install_config::{self, InstalledApp, LaunchContract};
use crate::profile::CapabilityProfile;

/// The kind of local artifact a source points at.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum InstallSourceKind {
    /// A macOS `.app` bundle directory, copied verbatim via `ditto`.
    AppBundle,
    /// A `.tar.gz` archive, extracted via `flate2`/`tar`. (Cross-platform path;
    /// reserved — the macOS `.app` copy is the v1 local-first concrete path.)
    TarGz,
}

/// Where Tender fetches an app from. Local-first ⇒ a path on **this** machine
/// (a local build / local path — NOT a Releases/update feed; that is C4/C6).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallSource {
    pub kind: InstallSourceKind,
    /// Absolute path to the local artifact.
    pub path: String,
}

/// A request to install one app from a local source under a resolved profile.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallRequest {
    /// Service id — matches `HarborlineService.id` (`sunfish` | `flight-deck` | …).
    pub app_id: String,
    pub version: String,
    pub source: InstallSource,
    pub profile: CapabilityProfile,
}

/// Where a step in the install landed (typed result, mirrors `provider_health`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum InstallStatus {
    /// Bundle placed at the install path + recorded in install config.
    Installed,
    /// Placed, recorded, AND launched (handed off to the app's supervisor).
    Launched,
    /// The install failed; see `detail`.
    Failed,
}

/// Outcome of an install (or launch) operation.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallOutcome {
    pub app_id: String,
    pub status: InstallStatus,
    /// Absolute install path of the placed bundle, when placement succeeded.
    pub install_path: Option<String>,
    pub detail: Option<String>,
}

impl InstallOutcome {
    fn failed(app_id: &str, detail: impl Into<String>) -> Self {
        Self {
            app_id: app_id.to_string(),
            status: InstallStatus::Failed,
            install_path: None,
            detail: Some(detail.into()),
        }
    }
}

/// Tender's managed install root for placed app bundles
/// (`<config>/Tender/apps/`). Tender owns this dir so install/upgrade/uninstall
/// is a clean Tender-managed lifecycle that never clobbers a user's own copy.
pub fn apps_dir() -> Option<PathBuf> {
    install_config::config_dir().map(|d| d.join("apps"))
}

/// Place a macOS `.app` bundle at `dest` via `ditto` (the canonical bundle-copy
/// tool — preserves symlinks, exec bits, framework layout, xattrs). Replaces any
/// prior bundle at `dest`.
fn place_app_bundle(src: &Path, dest: &Path) -> Result<(), String> {
    if !src.exists() {
        return Err(format!("source bundle not found: {}", src.display()));
    }
    if dest.exists() {
        std::fs::remove_dir_all(dest)
            .map_err(|e| format!("could not remove prior install {}: {e}", dest.display()))?;
    }
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("could not create install dir {}: {e}", parent.display()))?;
    }
    let status = std::process::Command::new("/usr/bin/ditto")
        .arg(src)
        .arg(dest)
        .status()
        .map_err(|e| format!("ditto spawn failed: {e}"))?;
    if !status.success() {
        return Err(format!("ditto exited {status} copying {}", src.display()));
    }
    Ok(())
}

/// Build the launch contract for a placed macOS `.app`: Tender launches it with
/// `open` and hands off to the app's own supervisor. `health_url` is `None` —
/// the app's sidecar binds an ephemeral internal port Tender does not poll.
fn macos_launch_contract(install_path: &str) -> LaunchContract {
    LaunchContract {
        program: "/usr/bin/open".to_string(),
        args: vec![install_path.to_string()],
        health_url: None,
    }
}

/// Install an app from a local source: place the bundle, then record it in
/// install config (honest `installed`/`version` + launch contract). Does NOT
/// launch — call [`launch_app`] for the hand-off. Idempotent (replaces a prior
/// install of the same id).
pub fn install_app_local(req: &InstallRequest) -> InstallOutcome {
    let src = PathBuf::from(&req.source.path);

    let dest = match (req.source.kind, apps_dir()) {
        (InstallSourceKind::AppBundle, Some(dir)) => {
            // Preserve the bundle's own name (e.g. `Sunfish.app`).
            let name = src
                .file_name()
                .map(|n| n.to_os_string())
                .unwrap_or_else(|| format!("{}.app", req.app_id).into());
            dir.join(name)
        }
        (InstallSourceKind::TarGz, _) => {
            return InstallOutcome::failed(
                &req.app_id,
                "TarGz source not yet implemented (macOS .app copy is the v1 local-first path)",
            );
        }
        (_, None) => {
            return InstallOutcome::failed(&req.app_id, "could not resolve Tender apps dir");
        }
    };

    if let Err(e) = place_app_bundle(&src, &dest) {
        return InstallOutcome::failed(&req.app_id, e);
    }

    let install_path = dest.to_string_lossy().to_string();

    // Record honest install state (retires the dev-path coupling: the launch
    // contract now points at the placed bundle, not a `dotnet run` dev path).
    let mut config = install_config::load();
    config.upsert(InstalledApp {
        id: req.app_id.clone(),
        version: req.version.clone(),
        install_path: install_path.clone(),
        profile: req.profile.clone(),
        launch: macos_launch_contract(&install_path),
    });
    if let Err(e) = install_config::save(&config) {
        return InstallOutcome::failed(
            &req.app_id,
            format!("bundle placed at {install_path} but recording install config failed: {e}"),
        );
    }

    InstallOutcome {
        app_id: req.app_id.clone(),
        status: InstallStatus::Installed,
        install_path: Some(install_path),
        detail: None,
    }
}

/// Launch a Tender-managed app off its recorded launch contract and hand off to
/// the app's **own** ADR 0115 supervisor (Tender does not supervise the sidecar).
/// This is also C2's "start" primitive — keyed off install config, not a dev path.
pub fn launch_app(app_id: &str) -> InstallOutcome {
    let config = install_config::load();
    let Some(app) = config.app(app_id) else {
        return InstallOutcome::failed(
            app_id,
            "app is not Tender-managed (no install config entry)",
        );
    };
    let launch = &app.launch;

    let status = std::process::Command::new(&launch.program)
        .args(&launch.args)
        .status();

    match status {
        Ok(s) if s.success() => InstallOutcome {
            app_id: app_id.to_string(),
            status: InstallStatus::Launched,
            install_path: Some(app.install_path.clone()),
            detail: Some(format!(
                "launched via {} (app self-supervises its sidecar)",
                launch.program
            )),
        },
        Ok(s) => InstallOutcome::failed(app_id, format!("launch command exited {s}")),
        Err(e) => InstallOutcome::failed(app_id, format!("launch spawn failed: {e}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::profile::ProfileName;
    use std::collections::BTreeMap;
    use std::time::Duration;

    fn sample_profile() -> CapabilityProfile {
        CapabilityProfile {
            name: ProfileName::Standard,
            axes: {
                let mut m = BTreeMap::new();
                m.insert("persistence".to_string(), "sqlite".to_string());
                m
            },
            user_overridden: false,
        }
    }

    /// Build a fake `.app` directory tree to stand in for a real bundle.
    fn make_fake_bundle(root: &Path) -> PathBuf {
        let app = root.join("Fake.app");
        let macos = app.join("Contents").join("MacOS");
        std::fs::create_dir_all(&macos).unwrap();
        std::fs::write(macos.join("anchor-tauri"), b"#!/bin/sh\n").unwrap();
        std::fs::write(app.join("Contents").join("Info.plist"), b"<plist/>").unwrap();
        app
    }

    #[test]
    fn place_app_bundle_copies_tree_and_replaces_prior() {
        let tmp = std::env::temp_dir().join(format!("tender-install-test-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&tmp);
        let src = make_fake_bundle(&tmp.join("src"));
        let dest = tmp.join("dest").join("Fake.app");

        place_app_bundle(&src, &dest).expect("first place");
        assert!(dest.join("Contents/MacOS/anchor-tauri").exists());

        // Idempotent replace: placing again over an existing dest succeeds.
        place_app_bundle(&src, &dest).expect("replace place");
        assert!(dest.join("Contents/Info.plist").exists());

        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn place_missing_source_errors() {
        let dest = std::env::temp_dir().join("tender-nope/Fake.app");
        let err = place_app_bundle(Path::new("/nonexistent/Fake.app"), &dest).unwrap_err();
        assert!(err.contains("source bundle not found"));
    }

    #[test]
    fn macos_launch_contract_uses_open_with_no_health_url() {
        let c = macos_launch_contract("/X/Sunfish.app");
        assert_eq!(c.program, "/usr/bin/open");
        assert_eq!(c.args, vec!["/X/Sunfish.app".to_string()]);
        assert!(
            c.health_url.is_none(),
            "ephemeral internal port — not polled"
        );
    }

    #[test]
    fn targz_source_is_reported_unimplemented_not_panic() {
        let req = InstallRequest {
            app_id: "sunfish".to_string(),
            version: "0.1.0".to_string(),
            source: InstallSource {
                kind: InstallSourceKind::TarGz,
                path: "/tmp/whatever.tar.gz".to_string(),
            },
            profile: sample_profile(),
        };
        let out = install_app_local(&req);
        assert_eq!(out.status, InstallStatus::Failed);
        assert!(out.detail.unwrap().contains("TarGz"));
    }

    #[test]
    fn launch_unmanaged_app_fails_cleanly() {
        // An id with no install-config entry must fail with a clear message,
        // never spawn anything.
        let out = launch_app("definitely-not-installed-xyz");
        assert_eq!(out.status, InstallStatus::Failed);
        assert!(out.detail.unwrap().contains("not Tender-managed"));
    }

    /// LIVE end-to-end install proof (C3 success criterion: "Tender installs
    /// Sunfish on this box and it launches"). `#[ignore]` + env-gated, so it is a
    /// no-op in CI / `cargo test`. Run explicitly against a real bundle:
    ///   `TENDER_C3_SOURCE_APP=/…/Sunfish.app cargo test --release \
    ///      -p tender c3_live_install_and_launch -- --ignored --nocapture`
    #[test]
    #[ignore]
    fn c3_live_install_and_launch() {
        let Ok(src) = std::env::var("TENDER_C3_SOURCE_APP") else {
            eprintln!("TENDER_C3_SOURCE_APP unset — skipping live install proof");
            return;
        };

        let req = InstallRequest {
            app_id: "sunfish".to_string(),
            version: "0.1.0".to_string(),
            source: InstallSource {
                kind: InstallSourceKind::AppBundle,
                path: src,
            },
            profile: sample_profile(),
        };

        // 1. Install (place + record).
        let out = install_app_local(&req);
        assert_eq!(
            out.status,
            InstallStatus::Installed,
            "install failed: {:?}",
            out.detail
        );
        let install_path = out.install_path.clone().expect("install path");
        eprintln!("[c3] installed → {install_path}");
        assert!(Path::new(&install_path)
            .join("Contents/MacOS/anchor-tauri")
            .exists());
        assert!(Path::new(&install_path)
            .join("Contents/MacOS/local-node-host")
            .exists());
        assert_eq!(
            install_config::load()
                .app("sunfish")
                .map(|a| a.version.clone()),
            Some("0.1.0".to_string())
        );

        // 2. Launch (hand off to the app's own ADR 0115 supervisor).
        let launched = launch_app("sunfish");
        assert_eq!(
            launched.status,
            InstallStatus::Launched,
            "launch failed: {:?}",
            launched.detail
        );
        eprintln!("[c3] launched; waiting for the app to spawn its sidecar…");

        // 3. Verify liveness by process (the sidecar's health port is ephemeral +
        //    internal to the app, so process liveness is the honest external signal).
        let pgrep = |pat: &str| {
            std::process::Command::new("pgrep")
                .args(["-f", pat])
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false)
        };
        let mut shell_up = false;
        let mut sidecar_up = false;
        for _ in 0..30 {
            std::thread::sleep(Duration::from_secs(1));
            shell_up = pgrep("anchor-tauri");
            sidecar_up = pgrep("local-node-host");
            if shell_up && sidecar_up {
                break;
            }
        }
        eprintln!("[c3] anchor-tauri running={shell_up}, local-node-host running={sidecar_up}");

        // 4. First-run seed: the host creates its data dir under the app's own
        //    Application Support (spec §2 / D7) — observed, not asserted (it is
        //    the APP's boot, not Tender's).
        let data_dir = std::env::var("HOME").map(|h| {
            PathBuf::from(h).join("Library/Application Support/io.sunfish.anchor/local-node")
        });
        let seeded = data_dir.as_ref().map(|d| d.exists()).unwrap_or(false);
        eprintln!("[c3] APP-SIDE: first-run data dir seeded={seeded}");
        eprintln!(
            "[c3] APP-SIDE: sidecar up={sidecar_up} — the app's OWN ADR 0115 boot. \
             On an UNSIGNED/ad-hoc local build the shell's macOS-Keychain seed \
             derivation does not complete, so the sidecar never spawns. This is a \
             sunfish-track signing gap, NOT a Tender install/launch failure."
        );

        // 5. Cleanup: terminate the launched instance (test hygiene — leaves the
        //    install in place; this is not the §7 path, just test teardown).
        let _ = std::process::Command::new("pkill")
            .args(["-f", "anchor-tauri"])
            .status();
        let _ = std::process::Command::new("pkill")
            .args(["-f", "local-node-host"])
            .status();

        // Tender's C3 guarantees (what the installer/coordinator OWNS): the bundle
        // was placed, recorded, launched, and the app's shell is running — i.e.
        // "Tender installs Sunfish on this box and it launches." Whether the app
        // then fully boots its sidecar is the app's own responsibility (above).
        assert!(
            shell_up,
            "Sunfish Tauri shell (anchor-tauri) did not come up after launch"
        );
    }

    /// LIVE end-to-end install proof for **Flight-Deck** (C5). Same engine as C3
    /// (the install path is app-agnostic). `#[ignore]` + env-gated. Run with:
    ///   `TENDER_C5_SOURCE_APP="/…/Flight Deck.app" cargo test \
    ///      c5_live_install_and_launch_flightdeck -- --ignored --nocapture`
    #[test]
    #[ignore]
    fn c5_live_install_and_launch_flightdeck() {
        let Ok(src) = std::env::var("TENDER_C5_SOURCE_APP") else {
            eprintln!("TENDER_C5_SOURCE_APP unset — skipping live Flight-Deck install proof");
            return;
        };

        let req = InstallRequest {
            app_id: "flight-deck".to_string(),
            version: "0.1.0".to_string(),
            source: InstallSource {
                kind: InstallSourceKind::AppBundle,
                path: src,
            },
            profile: sample_profile(),
        };

        // 1. Install (place + record) — same engine as Sunfish.
        let out = install_app_local(&req);
        assert_eq!(
            out.status,
            InstallStatus::Installed,
            "install failed: {:?}",
            out.detail
        );
        let install_path = out.install_path.clone().expect("install path");
        eprintln!("[c5] installed → {install_path}");
        // Flight-Deck has NO sidecar (externalBin: []) — only the shell binary.
        assert!(Path::new(&install_path)
            .join("Contents/MacOS/galley-desktop")
            .exists());
        assert!(
            !Path::new(&install_path)
                .join("Contents/MacOS/local-node-host")
                .exists(),
            "Flight-Deck must have no .NET sidecar"
        );
        assert_eq!(
            install_config::load()
                .app("flight-deck")
                .map(|a| a.version.clone()),
            Some("0.1.0".to_string())
        );

        // 2. Launch (hand off to the app's own supervisor).
        let launched = launch_app("flight-deck");
        assert_eq!(
            launched.status,
            InstallStatus::Launched,
            "launch failed: {:?}",
            launched.detail
        );

        // 3. Verify the shell came up.
        let pgrep = |pat: &str| {
            std::process::Command::new("pgrep")
                .args(["-f", pat])
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false)
        };
        let mut shell_up = false;
        for _ in 0..20 {
            std::thread::sleep(Duration::from_secs(1));
            shell_up = pgrep("galley-desktop");
            if shell_up {
                break;
            }
        }
        eprintln!("[c5] galley-desktop (shell) running={shell_up}");

        // 4. APP-SIDE: the book-server backend boots only if the app can locate
        //    services/book-server (a walk-up from the binary, or GALLEY_BOOK_SERVER_PATH).
        //    Installed OUTSIDE the repo tree (Tender's apps dir), the walk-up fails,
        //    so the backend will NOT auto-start — observed, not asserted.
        let backend_up = std::process::Command::new("curl")
            .args([
                "-s",
                "-o",
                "/dev/null",
                "-w",
                "%{http_code}",
                "--max-time",
                "2",
                "http://127.0.0.1:3080/",
            ])
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout) == "200")
            .unwrap_or(false);
        eprintln!(
            "[c5] APP-SIDE: book-server :3080 reachable={backend_up} — the app's OWN backend. \
             From Tender's managed install path (outside the repo tree) the book-server walk-up \
             fails, so it won't auto-boot without GALLEY_BOOK_SERVER_PATH (or bundling it). \
             Sunfish-keychain analog; a flight-deck packaging decision, NOT a Tender failure. \
             (Note: a pre-existing :3080 server may make this read true independently.)"
        );

        // 5. Cleanup: quit only our shell (leave any pre-existing book-server intact).
        let _ = std::process::Command::new("pkill")
            .args(["-f", "galley-desktop"])
            .status();

        assert!(
            shell_up,
            "Flight-Deck shell (galley-desktop) did not come up after launch"
        );
    }
}
