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
}
