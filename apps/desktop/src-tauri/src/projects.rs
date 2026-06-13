//! Project discovery for the Projects tab.
//!
//! Two-layer resolution (first layer that has data wins):
//!
//! 1. `~/Library/Application Support/Tender/projects.json`
//!    Operator-curated list. When this file exists and is non-empty it takes
//!    precedence over autodiscovery. Format: `[{ name, path, status, lastOpened? }]`
//!
//! 2. Autodiscovery: walk `~/Projects/` at depth ≤ 2, emit any directory that
//!    contains a `.git/` subdirectory. All discovered repos are marked `active`.
//!    Paths are tilde-shortened for display (`~/Projects/foo`).
//!
//! Returns an empty `Vec` when neither source is available — never errors.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectEntry {
    pub name: String,
    /// Display path — tilde-shortened where possible (e.g. `~/Projects/foo`).
    pub path: String,
    pub status: ProjectStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_opened: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ProjectStatus {
    Active,
    Paused,
    Archived,
}

// ── App-support path ──────────────────────────────────────────────────────────

fn app_support_projects_path() -> Option<std::path::PathBuf> {
    let home = std::env::var("HOME").ok()?;
    Some(
        std::path::PathBuf::from(home)
            .join("Library")
            .join("Application Support")
            .join("Tender")
            .join("projects.json"),
    )
}

// ── Tilde-shortening ──────────────────────────────────────────────────────────

fn tilde_shorten(path: &std::path::Path) -> String {
    if let Ok(home) = std::env::var("HOME") {
        if let Ok(rel) = path.strip_prefix(&home) {
            return format!("~/{}", rel.display());
        }
    }
    path.display().to_string()
}

// ── Layer 1: curated projects.json ───────────────────────────────────────────

fn load_curated() -> Option<Vec<ProjectEntry>> {
    let path = app_support_projects_path()?;
    let text = std::fs::read_to_string(path).ok()?;
    let entries: Vec<ProjectEntry> = serde_json::from_str(&text).ok()?;
    if entries.is_empty() {
        None
    } else {
        Some(entries)
    }
}

// ── Layer 2: autodiscovery under ~/Projects/ ─────────────────────────────────

fn discover_projects() -> Vec<ProjectEntry> {
    let home = match std::env::var("HOME") {
        Ok(h) => h,
        Err(_) => return vec![],
    };

    let root = std::path::PathBuf::from(&home).join("Projects");
    if !root.exists() {
        return vec![];
    }

    let mut entries: Vec<ProjectEntry> = Vec::new();

    // Depth 1: ~/Projects/<repo>
    let depth1 = match std::fs::read_dir(&root) {
        Ok(d) => d,
        Err(_) => return vec![],
    };

    for entry in depth1.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        if path.join(".git").is_dir() {
            let name = path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "unknown".to_string());
            entries.push(ProjectEntry {
                name,
                path: tilde_shorten(&path),
                status: ProjectStatus::Active,
                last_opened: None,
            });
        } else {
            // Depth 2: ~/Projects/<org>/<repo>
            if let Ok(depth2) = std::fs::read_dir(&path) {
                for sub in depth2.flatten() {
                    let sub_path = sub.path();
                    if sub_path.is_dir() && sub_path.join(".git").is_dir() {
                        let name = sub_path
                            .file_name()
                            .map(|n| n.to_string_lossy().to_string())
                            .unwrap_or_else(|| "unknown".to_string());
                        entries.push(ProjectEntry {
                            name,
                            path: tilde_shorten(&sub_path),
                            status: ProjectStatus::Active,
                            last_opened: None,
                        });
                    }
                }
            }
        }
    }

    // Stable ordering: sort by name so UI renders consistently across polls
    entries.sort_by(|a, b| a.name.cmp(&b.name));
    entries
}

// ── Public entry point ────────────────────────────────────────────────────────

/// Resolve projects: curated list if present, otherwise autodiscovery.
pub fn get_projects() -> Vec<ProjectEntry> {
    if let Some(curated) = load_curated() {
        return curated;
    }
    discover_projects()
}
