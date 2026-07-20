//! Hardware probe — ADR 0116 D1 (`IHardwareProfileProbe`).
//!
//! Returns a [`HardwareProfile`] describing the host machine. The probe is
//! **read-only and side-effect-free** (D1) and **never fails to the frontend**:
//! on a partial probe it returns best-effort values, records `warnings`, and
//! reports `keying_complete: false`.
//!
//! Per ADR 0116 H1 the **best-effort** fields (`has_discrete_gpu`,
//! `gpu_vram_bytes`, `is_battery_powered`) are nullable / `unknown` and the
//! profile recommendation keys off the **stable signals only** (`total_ram_bytes`,
//! free disk, `architecture`, `physical_cores`). Per ADR 0116 H2 a probe that
//! cannot positively obtain a keying field must fail safe to `minimum` — this
//! module surfaces that condition via `keying_complete`; the probe→named-profile
//! mapping that acts on it is C1 (`profile.rs` owns the record type only).
//!
//! `available_ram_bytes` is **advisory only** (volatile) and is never a keying
//! field.

use serde::{Deserialize, Serialize};

/// CPU instruction-set architecture (ADR 0116 D1 `Architecture`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Architecture {
    Arm64,
    X64,
    /// An architecture we do not recognise as a keying value (e.g. 32-bit).
    /// Treated as a probe-incomplete signal (H2).
    Other,
}

impl Architecture {
    fn detect() -> Self {
        match std::env::consts::ARCH {
            "aarch64" => Architecture::Arm64,
            "x86_64" => Architecture::X64,
            _ => Architecture::Other,
        }
    }
}

/// Host OS family (ADR 0116 D1 `OsFamily`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OsFamily {
    Macos,
    Windows,
    Linux,
    Other,
}

impl OsFamily {
    fn detect() -> Self {
        match std::env::consts::OS {
            "macos" => OsFamily::Macos,
            "windows" => OsFamily::Windows,
            "linux" => OsFamily::Linux,
            _ => OsFamily::Other,
        }
    }
}

/// Free + total space on one non-removable data volume (ADR 0116 D1
/// `FreeDiskBytes`, "per data volume").
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskVolume {
    pub mount_point: String,
    pub free_bytes: u64,
    pub total_bytes: u64,
}

/// The host hardware profile (ADR 0116 D1). Field-for-field the D1 contract.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HardwareProfile {
    /// Stable keying signal.
    pub total_ram_bytes: u64,
    /// Advisory only (volatile) — never a keying field (H1).
    pub available_ram_bytes: u64,
    /// Stable keying signal. `0` ⇒ unobtainable (drives `keying_complete:false`).
    pub physical_cores: u32,
    pub logical_cores: u32,
    /// Per-data-volume free/total (stable keying signal — mapping keys off the
    /// data volume with the most free space). Removable volumes are excluded.
    pub disk_volumes: Vec<DiskVolume>,
    /// Stable keying signal.
    pub architecture: Architecture,
    /// Best-effort (H1) — `None` = unknown, never an optimistic guess.
    pub has_discrete_gpu: Option<bool>,
    /// Best-effort (H1) — `None` = unknown.
    pub gpu_vram_bytes: Option<u64>,
    /// Best-effort (H1) — `None` = unknown.
    pub is_battery_powered: Option<bool>,
    pub os_family: OsFamily,
}

/// The result of a hardware probe: the profile plus probe-quality metadata.
///
/// `keying_complete` is `true` only when **every stable keying field**
/// (`total_ram_bytes > 0`, at least one disk volume, a recognised
/// `architecture`, `physical_cores > 0`) was obtained. A `false` here is the
/// ADR 0116 H2 trigger for the C1 mapping to recommend `minimum`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProbeResult {
    pub profile: HardwareProfile,
    pub keying_complete: bool,
    pub warnings: Vec<String>,
}

/// Probe the host hardware. Infallible to the caller (see module docs).
pub async fn probe_hardware() -> ProbeResult {
    tokio::task::spawn_blocking(probe_hardware_sync)
        .await
        .unwrap_or_else(|e| fail_safe(format!("probe task did not complete: {e}")))
}

/// Synchronous probe body (sysinfo + `std::env` are blocking).
fn probe_hardware_sync() -> ProbeResult {
    use sysinfo::{Disks, MemoryRefreshKind, RefreshKind, System};

    let mut warnings: Vec<String> = Vec::new();

    // ── Memory ──────────────────────────────────────────────────────────────
    let sys = System::new_with_specifics(
        RefreshKind::nothing().with_memory(MemoryRefreshKind::everything()),
    );
    let total_ram_bytes = sys.total_memory();
    let available_ram_bytes = sys.available_memory();
    if total_ram_bytes == 0 {
        warnings.push("total RAM unobtainable (keying field)".to_string());
    }

    // ── Cores ───────────────────────────────────────────────────────────────
    let physical_cores = match System::physical_core_count() {
        Some(n) if n > 0 => n as u32,
        _ => {
            warnings.push("physical core count unobtainable (keying field)".to_string());
            0
        }
    };
    let logical_cores = std::thread::available_parallelism()
        .map(|n| n.get() as u32)
        .unwrap_or_else(|_| {
            warnings.push("logical core count unobtainable".to_string());
            0
        });

    // ── Disk (non-removable data volumes only) ────────────────────────────────
    let disks = Disks::new_with_refreshed_list();
    let disk_volumes: Vec<DiskVolume> = disks
        .iter()
        .filter(|d| !d.is_removable())
        .map(|d| DiskVolume {
            mount_point: d.mount_point().to_string_lossy().to_string(),
            free_bytes: d.available_space(),
            total_bytes: d.total_space(),
        })
        .collect();
    if disk_volumes.is_empty() {
        warnings.push("no non-removable data volume found (keying field)".to_string());
    }

    // ── Architecture / OS ─────────────────────────────────────────────────────
    let architecture = Architecture::detect();
    if architecture == Architecture::Other {
        warnings.push(format!(
            "unrecognised architecture '{}' (keying field)",
            std::env::consts::ARCH
        ));
    }
    let os_family = OsFamily::detect();

    // ── Best-effort fields (H1) — not probed in C0, honestly `unknown` ────────
    // GPU + battery detection is platform-specific, additive, and never gates
    // the recommendation (ADR 0116 H1). C0 reports them as unknown rather than
    // guess. (A later cohort may add platform probes.)
    warnings.push("discrete GPU / VRAM not probed (best-effort, unknown)".to_string());
    warnings.push("battery presence not probed (best-effort, unknown)".to_string());

    let profile = HardwareProfile {
        total_ram_bytes,
        available_ram_bytes,
        physical_cores,
        logical_cores,
        disk_volumes,
        architecture,
        has_discrete_gpu: None,
        gpu_vram_bytes: None,
        is_battery_powered: None,
        os_family,
    };

    let keying_complete = total_ram_bytes > 0
        && physical_cores > 0
        && !profile.disk_volumes.is_empty()
        && architecture != Architecture::Other;

    ProbeResult {
        profile,
        keying_complete,
        warnings,
    }
}

/// Construct a maximally-conservative result when the probe could not run at
/// all (e.g. the blocking task panicked). Everything keying is zeroed so the
/// C1 mapping fails safe to `minimum` (H2).
fn fail_safe(reason: String) -> ProbeResult {
    ProbeResult {
        profile: HardwareProfile {
            total_ram_bytes: 0,
            available_ram_bytes: 0,
            physical_cores: 0,
            logical_cores: 0,
            disk_volumes: Vec::new(),
            architecture: Architecture::detect(),
            has_discrete_gpu: None,
            gpu_vram_bytes: None,
            is_battery_powered: None,
            os_family: OsFamily::detect(),
        },
        keying_complete: false,
        warnings: vec![reason],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The probe returns sane, self-consistent values on the host running the
    /// test suite (which always has RAM, ≥1 core, and a root volume).
    #[test]
    fn probe_returns_sane_host_values() {
        let result = probe_hardware_sync();
        let p = &result.profile;

        assert!(p.total_ram_bytes > 0, "host must report RAM");
        assert!(
            p.available_ram_bytes <= p.total_ram_bytes,
            "available RAM cannot exceed total"
        );
        assert!(p.logical_cores >= 1, "host must report ≥1 logical core");
        assert_ne!(
            p.architecture,
            Architecture::Other,
            "test host should be a recognised architecture"
        );
        assert!(
            !p.disk_volumes.is_empty(),
            "host must report ≥1 non-removable volume"
        );
        for v in &p.disk_volumes {
            assert!(v.free_bytes <= v.total_bytes, "free cannot exceed total");
        }
    }

    /// Best-effort fields are honestly `unknown` in C0 (never a guessed value).
    #[test]
    fn best_effort_fields_are_unknown_in_c0() {
        let result = probe_hardware_sync();
        assert_eq!(result.profile.has_discrete_gpu, None);
        assert_eq!(result.profile.gpu_vram_bytes, None);
        assert_eq!(result.profile.is_battery_powered, None);
    }

    /// A fully-zeroed fail-safe result is never keying-complete (H2).
    #[test]
    fn fail_safe_is_not_keying_complete() {
        let result = fail_safe("simulated probe failure".to_string());
        assert!(!result.keying_complete);
        assert_eq!(result.profile.total_ram_bytes, 0);
        assert_eq!(result.profile.physical_cores, 0);
        assert!(result.profile.disk_volumes.is_empty());
    }

    /// Architecture serialises to the ADR 0116 D1 lowercase tokens.
    #[test]
    fn architecture_serialises_to_adr_tokens() {
        assert_eq!(
            serde_json::to_string(&Architecture::Arm64).unwrap(),
            "\"arm64\""
        );
        assert_eq!(
            serde_json::to_string(&Architecture::X64).unwrap(),
            "\"x64\""
        );
    }
}
