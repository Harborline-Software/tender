//! Capability profile record (ADR 0116 D2 / D2.1).
//!
//! C0 defines the **record type only** — the persisted shape a hardware probe
//! resolves to. The probe→named-profile **mapping function** (ADR 0116 H4, the
//! threshold split Tender owns) and the per-axis selection tables (ADR 0114
//! item-2 for persistence) are **C1**; they are deliberately absent here so C0
//! ships no speculative threshold logic.
//!
//! Axis `key`s and their allowed `values` are governed by the fleet axis
//! registry (ADR 0116 D2.1). Tender **records** a profile's per-axis selections;
//! each consuming subsystem **owns** the selector that reads them (D5).

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Named capability profile (ADR 0116 D2). Ordered floor → ceiling so an
/// opt-up/opt-down (D3) is a simple comparison.
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize,
)]
#[serde(rename_all = "lowercase")]
pub enum ProfileName {
    Minimum,
    Standard,
    Capable,
    Max,
}

/// A resolved capability profile: a named tier plus its per-axis selections
/// (ADR 0116 D2). Persisted to install config (C1).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CapabilityProfile {
    /// The resolved named tier.
    pub name: ProfileName,
    /// Per-axis selections keyed by axis `key` (e.g. `persistence` → `sqlite`).
    /// Allowed values are governed by the fleet axis registry (D2.1) and owned
    /// by each axis's subsystem (D5); Tender only records them.
    pub axes: BTreeMap<String, String>,
    /// `true` when the user opted up/down from the probe's recommendation (D3),
    /// `false` when this is the recommended profile as probed. Recorded so the
    /// install config is honest about provenance.
    pub user_overridden: bool,
}

impl CapabilityProfile {
    /// The ADR 0116 H2 fail-safe floor: the `minimum` tier with no axis
    /// selections yet. Used when the probe cannot positively support an opt-up.
    /// Concrete per-axis floor values are filled by the C1 mapping + each
    /// subsystem's selector (D5); C0 only fixes the safe tier.
    pub fn minimum_floor() -> Self {
        Self {
            name: ProfileName::Minimum,
            axes: BTreeMap::new(),
            user_overridden: false,
        }
    }

    /// Resolve the **recommended** capability profile for a hardware probe
    /// (ADR 0116 H4 mapping + the axis selections Tender records). The named
    /// tier is `ProfileName::recommend`; the `persistence` axis is filled from
    /// the ADR 0114 item-2 table (Tender records it; the persistence subsystem
    /// owns the runtime selector, D5). `user_overridden` is `false` — this is
    /// the probe recommendation, not an opt-up/down.
    pub fn recommend(probe: &crate::probe::ProbeResult) -> Self {
        let name = ProfileName::recommend(probe);
        let mut axes = BTreeMap::new();
        let (engine, _opt_up) = persistence_default(name);
        axes.insert(PERSISTENCE_AXIS.to_string(), engine.to_string());
        Self {
            name,
            axes,
            user_overridden: false,
        }
    }
}

// ── Probe → named-profile mapping (ADR 0116 H4 — Tender-owned threshold split) ──

const GIB: u64 = 1024 * 1024 * 1024;

/// One profile's threshold gate: a box must satisfy ALL of these stable-keying
/// minimums (RAM, physical cores, free disk on the largest data volume) to be
/// recommended that tier. Best-effort GPU/battery never gate (ADR 0116 H1).
struct Gate {
    min_ram_bytes: u64,
    min_physical_cores: u32,
    min_free_disk_bytes: u64,
}

// Thresholds (ADR 0116 H4 — Tender owns these). Anchored on ADR 0088 tier
// floors (Light 4 GB / Standard 8 GB). DRAFT pending Admiral ratification of
// the axis-registry beacon (engineer-tender-status-2026-06-14T2204Z); change
// here is a one-line redline.
const STANDARD_GATE: Gate = Gate {
    min_ram_bytes: 8 * GIB,
    min_physical_cores: 2,
    min_free_disk_bytes: 4 * GIB,
};
const CAPABLE_GATE: Gate = Gate {
    min_ram_bytes: 16 * GIB,
    min_physical_cores: 4,
    min_free_disk_bytes: 10 * GIB,
};
const MAX_GATE: Gate = Gate {
    min_ram_bytes: 32 * GIB,
    min_physical_cores: 8,
    min_free_disk_bytes: 20 * GIB,
};

impl ProfileName {
    /// ADR 0116 H4 probe→named-profile mapping. Returns the richest tier whose
    /// gate the box fully satisfies. **Fails safe to `Minimum`** when the
    /// probe's keying is incomplete (H2) — never an optimistic guess. Keys off
    /// stable signals only (RAM, physical cores, free disk); best-effort
    /// GPU/battery never gate (H1).
    pub fn recommend(probe: &crate::probe::ProbeResult) -> ProfileName {
        if !probe.keying_complete {
            return ProfileName::Minimum; // H2 fail-safe-to-floor
        }
        let p = &probe.profile;
        // Free disk on the data volume with the most headroom.
        let free_disk = p
            .disk_volumes
            .iter()
            .map(|v| v.free_bytes)
            .max()
            .unwrap_or(0);
        let meets = |g: &Gate| {
            p.total_ram_bytes >= g.min_ram_bytes
                && p.physical_cores >= g.min_physical_cores
                && free_disk >= g.min_free_disk_bytes
        };
        if meets(&MAX_GATE) {
            ProfileName::Max
        } else if meets(&CAPABLE_GATE) {
            ProfileName::Capable
        } else if meets(&STANDARD_GATE) {
            ProfileName::Standard
        } else {
            ProfileName::Minimum
        }
    }
}

// ── Persistence axis (ADR 0114 item-2) ────────────────────────────────────────

/// The fleet-axis-registry `key` for the persistence axis (ADR 0114 / D2.1).
pub const PERSISTENCE_AXIS: &str = "persistence";

/// Default persistence engine + whether a Postgres opt-up is offered, per
/// ADR 0114 item-2, for a **local-first (Bridge-absent)** install. Returns
/// `(engine, postgres_opt_up_available)`.
///
/// Local-first defaults to SQLite at every tier (ADR 0114: minimum = SQLite
/// only; capable stand-alone = SQLite default + embedded-Postgres opt-up). The
/// ADR 0114 "Bridge present ⇒ Postgres forced" row is a deployment-topology
/// concern **out of the first local-first cohorts** (ONR §6, Bridge deferred).
/// Tender RECORDS this selection; the persistence subsystem owns the runtime
/// selector that reads it (ADR 0116 D5).
pub fn persistence_default(profile: ProfileName) -> (&'static str, bool) {
    match profile {
        ProfileName::Minimum => ("sqlite", false), // SQLite only, no override
        ProfileName::Standard => ("sqlite", false),
        ProfileName::Capable => ("sqlite", true), // opt-up → embedded Postgres
        ProfileName::Max => ("sqlite", true),
    }
}

/// A probe paired with the profile Tender recommends for it (ADR 0116 D2/H4).
/// Carries the probe so the profile-selection UI can show the recommendation's
/// basis (and the H2 fail-safe `keyingComplete` flag) alongside it.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileRecommendation {
    pub probe: crate::probe::ProbeResult,
    pub recommended: CapabilityProfile,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn minimum_floor_is_minimum_tier_with_no_axes() {
        let p = CapabilityProfile::minimum_floor();
        assert_eq!(p.name, ProfileName::Minimum);
        assert!(p.axes.is_empty());
        assert!(!p.user_overridden);
    }

    #[test]
    fn profile_names_are_ordered_floor_to_ceiling() {
        assert!(ProfileName::Minimum < ProfileName::Standard);
        assert!(ProfileName::Standard < ProfileName::Capable);
        assert!(ProfileName::Capable < ProfileName::Max);
    }

    #[test]
    fn profile_name_serialises_to_adr_tokens() {
        assert_eq!(
            serde_json::to_string(&ProfileName::Minimum).unwrap(),
            "\"minimum\""
        );
        assert_eq!(
            serde_json::to_string(&ProfileName::Max).unwrap(),
            "\"max\""
        );
    }

    #[test]
    fn capability_profile_round_trips_through_json() {
        let mut axes = BTreeMap::new();
        axes.insert("persistence".to_string(), "sqlite".to_string());
        let p = CapabilityProfile {
            name: ProfileName::Standard,
            axes,
            user_overridden: false,
        };
        let json = serde_json::to_string(&p).unwrap();
        let back: CapabilityProfile = serde_json::from_str(&json).unwrap();
        assert_eq!(back.name, ProfileName::Standard);
        assert_eq!(back.axes.get("persistence").map(String::as_str), Some("sqlite"));
    }

    // ── Mapping (H4) tests ───────────────────────────────────────────────────

    use crate::probe::{Architecture, HardwareProfile, OsFamily, ProbeResult, DiskVolume};

    /// Build a keying-complete probe with the given stable signals (GiB inputs).
    fn probe(ram_gib: u64, cores: u32, free_gib: u64) -> ProbeResult {
        ProbeResult {
            profile: HardwareProfile {
                total_ram_bytes: ram_gib * 1024 * 1024 * 1024,
                available_ram_bytes: ram_gib * 1024 * 1024 * 1024 / 2,
                physical_cores: cores,
                logical_cores: cores * 2,
                disk_volumes: vec![DiskVolume {
                    mount_point: "/".to_string(),
                    free_bytes: free_gib * 1024 * 1024 * 1024,
                    total_bytes: free_gib * 2 * 1024 * 1024 * 1024,
                }],
                architecture: Architecture::Arm64,
                has_discrete_gpu: None,
                gpu_vram_bytes: None,
                is_battery_powered: None,
                os_family: OsFamily::Macos,
            },
            keying_complete: true,
            warnings: vec![],
        }
    }

    #[test]
    fn keying_incomplete_always_recommends_minimum_h2() {
        // Even a maxed-out box fails safe to minimum when keying is incomplete.
        let mut p = probe(64, 16, 100);
        p.keying_complete = false;
        assert_eq!(ProfileName::recommend(&p), ProfileName::Minimum);
    }

    #[test]
    fn low_ram_box_recommends_minimum() {
        // 4 GB box (below the 8 GB standard gate) → minimum.
        assert_eq!(ProfileName::recommend(&probe(4, 4, 50)), ProfileName::Minimum);
    }

    #[test]
    fn eight_gb_box_recommends_standard() {
        assert_eq!(ProfileName::recommend(&probe(8, 2, 4)), ProfileName::Standard);
    }

    #[test]
    fn sixteen_gb_box_recommends_capable() {
        assert_eq!(ProfileName::recommend(&probe(16, 4, 10)), ProfileName::Capable);
    }

    #[test]
    fn workstation_recommends_max() {
        assert_eq!(ProfileName::recommend(&probe(32, 8, 20)), ProfileName::Max);
    }

    #[test]
    fn weakest_gated_axis_caps_the_tier() {
        // Lots of RAM + cores but only 5 GB free disk: fails the capable gate's
        // 10 GB disk floor → caps at standard.
        assert_eq!(ProfileName::recommend(&probe(32, 8, 5)), ProfileName::Standard);
    }

    #[test]
    fn recommend_records_persistence_axis() {
        let profile = CapabilityProfile::recommend(&probe(8, 2, 4));
        assert_eq!(profile.name, ProfileName::Standard);
        assert_eq!(
            profile.axes.get(PERSISTENCE_AXIS).map(String::as_str),
            Some("sqlite")
        );
        assert!(!profile.user_overridden);
    }

    #[test]
    fn persistence_opt_up_only_at_capable_and_above() {
        assert_eq!(persistence_default(ProfileName::Minimum), ("sqlite", false));
        assert_eq!(persistence_default(ProfileName::Standard), ("sqlite", false));
        assert_eq!(persistence_default(ProfileName::Capable), ("sqlite", true));
        assert_eq!(persistence_default(ProfileName::Max), ("sqlite", true));
    }
}
