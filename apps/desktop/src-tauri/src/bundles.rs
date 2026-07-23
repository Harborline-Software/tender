//! Bundle manifest types and filesystem reader.
//!
//! # Three-way mirror discipline
//!
//! These types mirror the C# canonical record and the TypeScript mirror. The
//! authoritative source is the C# record. Changes to the C# record MUST be
//! propagated here and to the TypeScript mirror in `@sunfish/contracts/src/bundles.ts`.
//!
//! Canonical sources (by authority):
//!   1. C#  canonical: shipyard/packages/foundation-catalog/Bundles/BusinessCaseBundleManifest.cs
//!   2. TS  mirror   : shipyard/packages/contracts/src/bundles.ts
//!   3. Rust mirror  : (this file)
//!
//! Drift detection: the TypeScript fixture-roundtrip test in
//! `packages/contracts/src/__tests__/bundles.test.ts` reads the same JSON files
//! this reader consumes. Run it after any manifest or struct change.
//!
//! # JSON field naming
//!
//! The C# record uses `System.Text.Json` with default `camelCase` property names.
//! All fields here use `#[serde(rename_all = "camelCase")]`.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ── Enums ────────────────────────────────────────────────────────────────────

/// Business-case bundle category.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum BundleCategory {
    Operations,
    Diligence,
    Finance,
    Platform,
}

/// Bundle lifecycle status.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum BundleStatus {
    Draft,
    Preview,
    #[serde(rename = "GA")]
    Ga,
    Deprecated,
}

/// Deployment mode supported by a bundle.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum DeploymentMode {
    Lite,
    SelfHosted,
    HostedSaaS,
}

/// Provider category for a provider-requirement entry.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ProviderCategory {
    Billing,
    Payments,
    BankingFeed,
    FeatureFlags,
    ChannelManager,
    Messaging,
    Storage,
    IdentityProvider,
    Other,
}

// ── Supporting types ─────────────────────────────────────────────────────────

/// A provider-category requirement declared by a bundle.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderRequirement {
    /// The provider category required or recommended.
    pub category: ProviderCategory,
    /// Whether the provider is strictly required (true) or optional (false).
    pub required: bool,
    /// Human-readable explanation of why the provider is needed.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub purpose: Option<String>,
}

/// Per ADR 0007-A1 — install-time minimum-spec gating per ADR 0063.
/// Non-.NET consumers treat this as opaque-display only.
/// Field is absent from JSON when null (JsonIgnoreCondition.WhenWritingNull in C#).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MinimumSpec {
    /// Spec enforcement policy.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub policy: Option<String>,
    /// Forward-compat: tolerate additional fields from ADR 0063 Phase 1.
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

// ── Primary manifest ─────────────────────────────────────────────────────────

/// Business-case bundle manifest. A bundle is configuration, not code.
///
/// Mirrors `Sunfish.Foundation.Catalog.Bundles.BusinessCaseBundleManifest`.
/// See ADR 0007 for full semantics.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BusinessCaseBundleManifest {
    /// Stable bundle identifier, reverse-DNS style.
    pub key: String,
    /// Human-readable bundle name.
    pub name: String,
    /// Semver.
    pub version: String,
    /// Optional longer description.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// Bundle category.
    pub category: BundleCategory,
    /// Bundle lifecycle status.
    pub status: BundleStatus,
    /// Engineering readiness note.
    pub maturity: String,
    /// Module keys that must be installed for the bundle to activate.
    #[serde(default)]
    pub required_modules: Vec<String>,
    /// Module keys that may be activated per edition.
    #[serde(default)]
    pub optional_modules: Vec<String>,
    /// Default feature values applied at tenant provisioning.
    #[serde(default)]
    pub feature_defaults: HashMap<String, String>,
    /// Edition key -> module keys activated for that edition.
    #[serde(default)]
    pub edition_mappings: HashMap<String, Vec<String>>,
    /// Deployment modes this bundle supports.
    #[serde(default)]
    pub deployment_modes_supported: Vec<DeploymentMode>,
    /// Provider-category requirements.
    #[serde(default)]
    pub provider_requirements: Vec<ProviderRequirement>,
    /// Named provider-configuration profiles.
    #[serde(default)]
    pub integration_profiles: Vec<String>,
    /// Pre-built workspaces/dashboards seeded for new tenants.
    #[serde(default)]
    pub seed_workspaces: Vec<String>,
    /// Personas (drives default roles, navigation, and seed data).
    #[serde(default)]
    pub personas: Vec<String>,
    /// Free-form data-ownership / export / residency policy.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data_ownership: Option<String>,
    /// Free-form compliance framing and notes.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compliance_notes: Option<String>,
    /// Per ADR 0007-A1 — minimum-spec gating. Absent when bundle does not opt in.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub requirements: Option<MinimumSpec>,
}

// ── Plugin health types ───────────────────────────────────────────────────────

/// Health status for a provider slot declared by a bundle.
///
/// Q6 v1: always "unknown" — no probing logic per ADR 0007-A1 halt H4.A ruling.
/// Q6 v2 may add real provider-endpoint health probing.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PluginHealthStatus {
    /// No probing attempted; status cannot be determined without an HTTP hop.
    Unknown,
    /// Provider is responding as expected.
    Ok,
    /// Provider is reachable but degraded.
    Degraded,
    /// Provider is not configured or unreachable.
    Missing,
}

/// Health record for a single provider requirement from a bundle.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginHealthRecord {
    /// Bundle key this record belongs to.
    pub bundle_key: String,
    /// The provider category from the requirement.
    pub provider_category: ProviderCategory,
    /// Whether the requirement is marked required in the bundle manifest.
    pub is_required: bool,
    /// Human-readable purpose, if declared in the manifest.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub purpose: Option<String>,
    /// Health status — always "unknown" in Q6 v1 per H4.A ruling.
    pub status: PluginHealthStatus,
}

// ── Bundle manifest reader ────────────────────────────────────────────────────

/// Resolve the bundle manifests directory.
///
/// Resolution order (first that exists wins):
///
///  1. **Tauri resource directory** — `<app-resources>/resources/bundles/`
///     Populated by the build script from the shipyard snapshot.
///     Available in shipped builds and in `cargo tauri dev` after the first build.
///
///  2. **Dev sibling fleet layout** — `$HOME/Projects/Harborline-Software/shipyard/…`
///     Fallback for bare `cargo build` / `cargo check` without a full tauri context.
///
/// Returns `Err` only when neither location exists.
fn bundle_manifests_dir() -> Result<std::path::PathBuf, String> {
    // (1) Resource directory — resolve relative to the current executable.
    if let Ok(exe) = std::env::current_exe() {
        // In shipped .app:  Tender.app/Contents/MacOS/tender
        // Resources are at: Tender.app/Contents/Resources/resources/bundles/
        let resource_path = exe
            .parent() // MacOS/
            .and_then(|p| p.parent()) // Contents/
            .map(|p| p.join("Resources").join("resources").join("bundles"));

        if let Some(rp) = resource_path {
            if rp.exists() {
                return Ok(rp);
            }
        }

        // In `cargo tauri dev` the exe lives under target/; the resources dir
        // is placed next to it by Tauri's dev runner.
        let dev_resource = exe.parent().map(|p| p.join("resources").join("bundles"));
        if let Some(drp) = dev_resource {
            if drp.exists() {
                return Ok(drp);
            }
        }
    }

    // (2) Dev sibling fleet layout fallback.
    let home =
        std::env::var("HOME").map_err(|_| "HOME environment variable not set".to_string())?;
    let sibling = std::path::PathBuf::from(home)
        .join("Projects")
        .join("Harborline-Software")
        .join("shipyard")
        .join("packages")
        .join("foundation-catalog")
        .join("Manifests")
        .join("Bundles");

    if sibling.exists() {
        return Ok(sibling);
    }

    Err("Bundle manifest directory not found. \
         Expected either the bundled resources/bundles/ inside the .app, \
         or a sibling shipyard/ clone at ~/Projects/Harborline-Software/."
        .to_string())
}

/// Read all `*.bundle.json` files from the resolved bundles directory.
///
/// Per H3.A ruling: no caching — re-reads on each call (panel-open cadence).
/// Returns an error string if the directory is absent or no manifests are found.
pub fn read_bundle_manifests() -> Result<Vec<BusinessCaseBundleManifest>, String> {
    let dir = bundle_manifests_dir()?;

    if !dir.exists() {
        return Err(format!(
            "Bundle manifest directory not found: {}.",
            dir.display()
        ));
    }

    let entries = std::fs::read_dir(&dir)
        .map_err(|e| format!("Failed to read bundle directory {}: {}", dir.display(), e))?;

    let mut manifests: Vec<BusinessCaseBundleManifest> = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("Directory entry error: {}", e))?;
        let path = entry.path();

        // Only process *.bundle.json files
        let file_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or_default();
        if !file_name.ends_with(".bundle.json") {
            continue;
        }

        let content = std::fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;

        let manifest: BusinessCaseBundleManifest = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse {}: {}", path.display(), e))?;

        manifests.push(manifest);
    }

    if manifests.is_empty() {
        return Err(format!("No *.bundle.json files found in {}", dir.display()));
    }

    // Stable ordering: sort by bundle key so UI renders consistently
    manifests.sort_by(|a, b| a.key.cmp(&b.key));

    Ok(manifests)
}

/// Build plugin health records for all provider requirements across all bundles.
///
/// Per H4.A ruling: Q6 v1 returns "unknown" for every provider requirement.
/// No probing logic. Honest UX: unknown is preferable to false positives.
pub fn build_plugin_health_records(
    manifests: &[BusinessCaseBundleManifest],
) -> Vec<PluginHealthRecord> {
    let mut records = Vec::new();

    for manifest in manifests {
        for req in &manifest.provider_requirements {
            records.push(PluginHealthRecord {
                bundle_key: manifest.key.clone(),
                provider_category: req.category.clone(),
                is_required: req.required,
                purpose: req.purpose.clone(),
                status: PluginHealthStatus::Unknown,
            });
        }
    }

    records
}
