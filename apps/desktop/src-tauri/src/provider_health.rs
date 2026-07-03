//! Bridge provider-health probing.
//!
//! Calls the Bridge admin/providers endpoint and maps its response onto
//! `ProviderHealthRecord` for the Tender frontend. This is Tender's side of the
//! R10 Q6 v2 live-probing feature; the Bridge endpoint is implemented in
//! `signal-bridge/Sunfish.Bridge/Admin/AdminProvidersEndpoints.cs`.
//!
//! # Bridge base URL resolution
//!
//! The Bridge base URL is read from the `TENDER_BRIDGE_BASE_URL` environment
//! variable. When absent the default is `http://localhost:5000` (Aspire dev
//! convention for the `bridge-web` project; actual port is Aspire-assigned but
//! operators can pin it via a `launchSettings.json` profile or env override).
//!
//! # Auth framing
//!
//! The admin/providers endpoint is gated by `AdminOperatorPolicy`. In the
//! standard dev posture `DemoTenantContext` resolves and the demo user carries
//! the `admin` role claim implicitly. In production the Tauri call will get a
//! 401/403 when Tender is not running as an authenticated operator session —
//! this is surfaced as `ProbeStatus::AuthRequired` (honest UX; not "unknown").

use serde::{Deserialize, Serialize};
use url::Url;

// ── DTO shapes (mirror the Bridge wire contract) ────────────────────────────

/// Bridge /api/v1/admin/providers wire DTO (mirrors `AdminProvidersResponseDto`).
#[derive(Debug, Deserialize)]
struct BridgeProvidersResponse {
    providers: Vec<BridgeProviderSlot>,
}

/// One provider-slot row from the Bridge admin endpoint.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BridgeProviderSlot {
    provider_slot: String,
    env_var_key: String,
    configured: bool,
    using_mock: bool,
    reachability: String,
    reachability_detail: Option<String>,
}

// ── Frontend-facing types ────────────────────────────────────────────────────

/// Status for a single provider slot — passed to the Tender frontend.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ProbeStatus {
    /// Provider is configured AND the reachability probe returned ok.
    Ok,
    /// Provider is configured but the reachability probe failed.
    Error,
    /// Provider is configured but was not probed (no probe registered).
    NotProbed,
    /// Provider is not configured; the mock fallback is active.
    Unconfigured,
    /// Bridge returned 401 / 403 — Tender is not authenticated as an operator.
    AuthRequired,
    /// Bridge is unreachable (not running, wrong port, etc.).
    BridgeUnreachable,
    /// Some other unexpected response from Bridge.
    Unknown,
}

/// Provider health record surfaced to the Tender frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderHealthRecord {
    /// Vendor-neutral contract name (e.g. `IEmailProvider`).
    pub provider_slot: String,
    /// Environment variable key that activates the real adapter.
    pub env_var_key: String,
    /// Whether the env-var is set (real adapter active in Bridge).
    pub configured: bool,
    /// Whether Bridge is using the mock fallback.
    pub using_mock: bool,
    /// Resolved probe status.
    pub status: ProbeStatus,
    /// Optional short detail for the `Error` state (from Bridge or Tender).
    pub status_detail: Option<String>,
}

// ── Bridge base URL ──────────────────────────────────────────────────────────

/// Returns the Bridge base URL from `TENDER_BRIDGE_BASE_URL` env var or falls
/// back to the Aspire dev default `http://localhost:5000`.
fn bridge_base_url() -> String {
    std::env::var("TENDER_BRIDGE_BASE_URL")
        .unwrap_or_else(|_| "http://localhost:5000".to_string())
}

// ── Provider health fetcher ──────────────────────────────────────────────────

/// Fetch live provider health from the Bridge admin endpoint.
///
/// Returns `Ok(Vec<ProviderHealthRecord>)` on any successful parse —
/// individual slot errors are captured in each record's `status` field.
/// Returns `Err(String)` only when the fetch is completely unresolvable
/// (e.g., Bridge is not running).
/// Returns `true` only when running a debug build AND the target host resolves
/// to loopback (localhost, 127.0.0.1, or ::1). Release builds always return
/// `false` — TLS certificate validation is never relaxed for remote targets.
fn allow_invalid_certs_for(base: &str) -> bool {
    cfg!(debug_assertions)
        && Url::parse(base)
            .ok()
            .and_then(|u| u.host_str().map(|h| h == "localhost" || h == "127.0.0.1" || h == "::1"))
            .unwrap_or(false)
}

pub async fn fetch_provider_health() -> Result<Vec<ProviderHealthRecord>, String> {
    let base = bridge_base_url();
    let url = format!("{}/api/v1/admin/providers", base);

    // Relax cert validation ONLY for loopback targets in debug builds.
    // Release builds never accept invalid certs regardless of target host.
    let allow_invalid = allow_invalid_certs_for(&base);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(6))
        .danger_accept_invalid_certs(allow_invalid)
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let response = match client.get(&url).send().await {
        Ok(r) => r,
        Err(e) if e.is_connect() || e.is_timeout() => {
            // Bridge is not running or not reachable at the configured URL.
            return Ok(vec![ProviderHealthRecord {
                provider_slot: "Bridge".to_string(),
                env_var_key: String::new(),
                configured: false,
                using_mock: false,
                status: ProbeStatus::BridgeUnreachable,
                status_detail: Some(format!("Cannot reach Bridge at {}: {}", url, e)),
            }]);
        }
        Err(e) => return Err(format!("Bridge request failed: {}", e)),
    };

    let status_code = response.status();

    if status_code == reqwest::StatusCode::UNAUTHORIZED
        || status_code == reqwest::StatusCode::FORBIDDEN
    {
        return Ok(vec![ProviderHealthRecord {
            provider_slot: "Bridge".to_string(),
            env_var_key: String::new(),
            configured: false,
            using_mock: false,
            status: ProbeStatus::AuthRequired,
            status_detail: Some(format!(
                "Bridge returned {} — Harborline Toolbox is not authenticated as an admin/operator.",
                status_code
            )),
        }]);
    }

    if !status_code.is_success() {
        return Ok(vec![ProviderHealthRecord {
            provider_slot: "Bridge".to_string(),
            env_var_key: String::new(),
            configured: false,
            using_mock: false,
            status: ProbeStatus::Unknown,
            status_detail: Some(format!("Bridge returned unexpected status: {}", status_code)),
        }]);
    }

    let body: BridgeProvidersResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Bridge providers response: {}", e))?;

    let records = body
        .providers
        .into_iter()
        .map(|slot| {
            let status = if !slot.configured {
                ProbeStatus::Unconfigured
            } else {
                match slot.reachability.as_str() {
                    "ok" => ProbeStatus::Ok,
                    "error" => ProbeStatus::Error,
                    "skipped" => ProbeStatus::Unconfigured,
                    "not_probed" => ProbeStatus::NotProbed,
                    _ => ProbeStatus::Unknown,
                }
            };

            ProviderHealthRecord {
                provider_slot: slot.provider_slot,
                env_var_key: slot.env_var_key,
                configured: slot.configured,
                using_mock: slot.using_mock,
                status,
                status_detail: slot.reachability_detail,
            }
        })
        .collect();

    Ok(records)
}
