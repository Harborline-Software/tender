//! Login-item — auto-start Tender at login via a per-user LaunchAgent.
//!
//! Tender is a menu-bar app, so the natural auto-start is a `RunAtLoad`
//! LaunchAgent under `~/Library/LaunchAgents/`. This module owns writing,
//! removing, and querying that plist. The plist's `ProgramArguments` points at
//! the running Tender binary (resolved via `current_exe()` by the command
//! layer), so it works wherever Tender is installed (e.g. `/Applications`).
//!
//! `enable` writes the plist only — `RunAtLoad` makes launchd start Tender at
//! the next login. It deliberately does NOT `launchctl load` immediately:
//! Tender has no single-instance guard, so force-loading would spawn a second
//! tray instance. `disable` best-effort `launchctl unload`s (to deregister an
//! agent already loaded at login) and removes the plist.

use std::path::{Path, PathBuf};

/// LaunchAgent label / plist basename (reverse-DNS, matches the bundle id).
pub const AUTOSTART_LABEL: &str = "io.harborline.tender";

/// `~/Library/LaunchAgents`.
pub fn launch_agents_dir() -> Option<PathBuf> {
    std::env::var_os("HOME").map(|h| PathBuf::from(h).join("Library").join("LaunchAgents"))
}

/// Absolute path to Tender's LaunchAgent plist.
pub fn plist_path() -> Option<PathBuf> {
    launch_agents_dir().map(|d| d.join(format!("{AUTOSTART_LABEL}.plist")))
}

/// Minimal XML escaping for a value placed in a plist `<string>`.
fn xml_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

/// Render the LaunchAgent plist XML for a program path.
fn render_plist(program: &str) -> String {
    format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>{label}</string>
    <key>ProgramArguments</key>
    <array>
        <string>{program}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>ProcessType</key>
    <string>Interactive</string>
    <key>KeepAlive</key>
    <false/>
</dict>
</plist>
"#,
        label = AUTOSTART_LABEL,
        program = xml_escape(program),
    )
}

fn write_plist_at(plist_path: &Path, program: &str) -> Result<(), String> {
    if let Some(dir) = plist_path.parent() {
        std::fs::create_dir_all(dir)
            .map_err(|e| format!("create LaunchAgents dir {}: {e}", dir.display()))?;
    }
    std::fs::write(plist_path, render_plist(program))
        .map_err(|e| format!("write plist {}: {e}", plist_path.display()))
}

fn remove_plist_at(plist_path: &Path) -> Result<(), String> {
    match std::fs::remove_file(plist_path) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()), // already disabled
        Err(e) => Err(format!("remove plist {}: {e}", plist_path.display())),
    }
}

fn is_enabled_at(plist_path: &Path) -> bool {
    plist_path.exists()
}

/// Enable auto-start: write the LaunchAgent pointing at `program`. Takes effect
/// at the next login (`RunAtLoad`). Does not force-load (no single-instance guard).
pub fn enable(program: &str) -> Result<(), String> {
    let path = plist_path().ok_or("cannot resolve LaunchAgents path (HOME unset)")?;
    write_plist_at(&path, program)
}

/// Disable auto-start: best-effort deregister an already-loaded agent, then
/// remove the plist. Idempotent.
pub fn disable() -> Result<(), String> {
    let path = plist_path().ok_or("cannot resolve LaunchAgents path (HOME unset)")?;
    if path.exists() {
        let _ = std::process::Command::new("launchctl")
            .args(["unload", "-w", &path.to_string_lossy()])
            .output();
    }
    remove_plist_at(&path)
}

/// Whether auto-start is currently enabled (the LaunchAgent plist exists).
pub fn is_enabled() -> bool {
    plist_path().map(|p| is_enabled_at(&p)).unwrap_or(false)
}

/// Repoint an existing auto-start LaunchAgent at `current_program` if it's
/// currently pointing somewhere else.
///
/// Exists for the "shipped app moved" case (e.g. the Tender → Harborline
/// Toolbox identity change: `productName`/`mainBinaryName` changed, so a
/// rebuilt `.app` lands at a new path — `Harborline Toolbox.app` instead of
/// `Tender.app` — while the LaunchAgent **label** (`AUTOSTART_LABEL`, which
/// mirrors the stable bundle `identifier`) does not change. A plist already
/// on disk from a prior install still points at the OLD `.app` path, so
/// without this it would silently stop working at next login instead of
/// being cleanly migrated.
///
/// No-op (`Ok(false)`) when auto-start isn't enabled, or the plist already
/// points at `current_program` — so calling this unconditionally at every
/// startup is safe and idempotent. Returns `Ok(true)` when a rewrite
/// happened. Best-effort: a read/write failure is returned as `Err`, never
/// panics — callers should log and continue, not fail app startup over it.
pub fn migrate_program_path(current_program: &str) -> Result<bool, String> {
    let path = plist_path().ok_or("cannot resolve LaunchAgents path (HOME unset)")?;
    migrate_program_path_at(&path, current_program)
}

/// Testable seam over an explicit plist path — see [`migrate_program_path`].
fn migrate_program_path_at(path: &Path, current_program: &str) -> Result<bool, String> {
    if !path.exists() {
        return Ok(false); // auto-start not enabled — nothing to migrate
    }
    let body =
        std::fs::read_to_string(path).map_err(|e| format!("read plist {}: {e}", path.display()))?;
    if body.contains(current_program) {
        return Ok(false); // already points at the current install
    }
    // Same label, same enabled/RunAtLoad shape — only the program path moves.
    write_plist_at(path, current_program)?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A per-test-labeled tmp plist path. Tests run in parallel threads within
    /// the same process, so keying only on `process::id()` (as a prior
    /// single-consumer version of this helper did) collides once more than
    /// one test uses it concurrently — `label` keeps each test's fixture dir
    /// isolated.
    fn tmp_plist(label: &str) -> PathBuf {
        std::env::temp_dir()
            .join(format!(
                "tender-autostart-test-{}-{}",
                std::process::id(),
                label
            ))
            .join("io.harborline.tender.plist")
    }

    #[test]
    fn render_plist_has_required_keys_and_program() {
        let xml = render_plist("/Applications/Tender.app/Contents/MacOS/tender");
        assert!(xml.contains("<string>io.harborline.tender</string>"));
        assert!(xml.contains("/Applications/Tender.app/Contents/MacOS/tender"));
        assert!(xml.contains("<key>RunAtLoad</key>"));
        assert!(xml.contains("<true/>"));
    }

    #[test]
    fn migrate_program_path_noop_when_not_enabled() {
        let path = tmp_plist("migrate-noop-not-enabled");
        let _ = std::fs::remove_dir_all(path.parent().unwrap());

        let migrated = migrate_program_path_at(
            &path,
            "/Applications/Harborline Toolbox.app/Contents/MacOS/Harborline Toolbox",
        )
        .expect("noop ok");
        assert!(!migrated, "no plist ⇒ nothing to migrate");

        let _ = std::fs::remove_dir_all(path.parent().unwrap());
    }

    #[test]
    fn migrate_program_path_noop_when_already_current() {
        let path = tmp_plist("migrate-noop-current");
        let _ = std::fs::remove_dir_all(path.parent().unwrap());
        let current = "/Applications/Harborline Toolbox.app/Contents/MacOS/Harborline Toolbox";
        write_plist_at(&path, current).expect("write");

        let migrated = migrate_program_path_at(&path, current).expect("noop ok");
        assert!(
            !migrated,
            "already pointing at current program ⇒ no rewrite"
        );

        let _ = std::fs::remove_dir_all(path.parent().unwrap());
    }

    #[test]
    fn migrate_program_path_rewrites_stale_tender_path() {
        let path = tmp_plist("migrate-rewrite-stale");
        let _ = std::fs::remove_dir_all(path.parent().unwrap());
        // Simulate a pre-rename install: plist points at the old Tender.app.
        write_plist_at(&path, "/Applications/Tender.app/Contents/MacOS/tender").expect("write");

        let current = "/Applications/Harborline Toolbox.app/Contents/MacOS/Harborline Toolbox";
        let migrated = migrate_program_path_at(&path, current).expect("migrate ok");
        assert!(migrated, "stale program path ⇒ rewrite");

        let body = std::fs::read_to_string(&path).unwrap();
        assert!(
            body.contains(current),
            "plist now points at the new install"
        );
        assert!(
            body.contains("<string>io.harborline.tender</string>"),
            "label is unchanged — same LaunchAgent, only the program path moved"
        );

        let _ = std::fs::remove_dir_all(path.parent().unwrap());
    }

    #[test]
    fn xml_escape_escapes_markup_chars() {
        assert_eq!(xml_escape("a&b<c>d"), "a&amp;b&lt;c&gt;d");
    }

    #[test]
    fn write_then_is_enabled_then_remove_round_trips() {
        let path = tmp_plist("write-enable-remove-roundtrip");
        let _ = std::fs::remove_dir_all(path.parent().unwrap());

        assert!(!is_enabled_at(&path));
        write_plist_at(&path, "/X/Tender.app/Contents/MacOS/tender").expect("write");
        assert!(is_enabled_at(&path));
        let body = std::fs::read_to_string(&path).unwrap();
        assert!(body.contains("/X/Tender.app/Contents/MacOS/tender"));

        remove_plist_at(&path).expect("remove");
        assert!(!is_enabled_at(&path));
        // Idempotent: removing again is fine.
        remove_plist_at(&path).expect("remove idempotent");

        let _ = std::fs::remove_dir_all(path.parent().unwrap());
    }

    /// LIVE: enable auto-start for the installed Tender + leave it on.
    /// `#[ignore]` — run with `cargo test live_enable_autostart -- --ignored`.
    #[test]
    #[ignore]
    fn live_enable_autostart_for_installed() {
        let program = "/Applications/Tender.app/Contents/MacOS/tender";
        enable(program).expect("enable");
        assert!(is_enabled(), "plist should exist after enable");
        let body = std::fs::read_to_string(plist_path().unwrap()).unwrap();
        assert!(body.contains(program));
        eprintln!("[autostart] enabled → {}", plist_path().unwrap().display());
    }
}
