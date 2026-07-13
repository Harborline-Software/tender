//! Paid-compute pane — Toolbox #137, ONR harness-landscape survey slice **G3**
//! (`_shared/research/onr-ai-harness-landscape-2026-07-07.md` §3 "Slice G3").
//!
//! The one thing nothing off-the-shelf provides: a single cross-provider view of
//! **what the fleet's paid compute costs**. It splits three ways by what each
//! provider actually exposes (survey §3 / §5 Q4-Q5):
//!
//!   1. **Bifrost gateway ledger** (WRAP) — the fleet's OWN LLM-token spend
//!      ledger. Reads the internal gateway's governance API for per-virtual-key
//!      usage vs budget. This is the **authoritative gateway-routed spend**
//!      (spend that actually flowed through the fleet gateway), distinct from a
//!      provider's account-level balance (CIC ruling / survey §5 Q5).
//!   2. **WRAP-API providers** (OpenRouter, fal) — real balance/usage APIs, read
//!      through a READ-ONLY management-key SLOT that lives **only on the internal
//!      plane / winhub**, never on this Mac and never in the public gateway
//!      process (the binding audience-segregation wall — survey §3, §5 Q4, open
//!      Q2). An empty slot renders an honest `notConfigured` tile — never a fake
//!      balance.
//!   3. **DEEP-LINK providers** (Modal, Recraft) — no usable balance API at the
//!      fleet's tier (Modal's billing API is Team/Enterprise-gated; Recraft is
//!      prepaid units, dashboard-only). These tiles show a health-neutral
//!      "balance on provider dashboard" state + a click-through — never a
//!      fabricated number.
//!
//! # The audience-segregation wall (BINDING) — how it is honored here
//! Two independent mechanisms, both structural rather than policy-checked:
//!   - **The Bifrost governance response embeds each virtual key's bearer secret
//!     in a `value` field.** [`parse_governance_vkeys`] deserializes ONLY the
//!     non-secret fields (`id` / `name` / `is_active` / `budgets`) — the `value`
//!     field is simply not present on the parse struct, so serde drops it. The
//!     secret is never deserialized into a Toolbox type, never logged, never
//!     crosses the IPC boundary to the frontend. "Nothing to steal", applied at
//!     the parse boundary. (The raw HTTP body is never logged either.)
//!   - **The paid-provider management keys live on winhub, not this Mac.** The
//!     slot-presence check is a remote `Test-Path` over SSH that reads only the
//!     file's *existence and length*, never its contents; and when a slot IS
//!     populated, the balance probe runs the provider call **on winhub** (the
//!     key is read + used inside the remote PowerShell), returning only the
//!     resulting numbers over SSH — the paid credential never reaches this box.
//!     Same custody rule the `openrouter.key` inference slot already follows
//!     (`shipyard/tooling/llm-gateway/README.md`).
//!
//! # Honest states, never a fake balance (the G1/G2/G3 honesty doctrine)
//! A provider the Toolbox can't reach → "can't tell", not a guessed number; an
//! unconfigured slot → `notConfigured`, not `$0`; a dashboard-only provider →
//! `dashboardOnly`, not a scraped figure. Mirrors G1's `InventoryStatus` and
//! G2's `ResidencyStatus` honesty vocabulary for UI/UX continuity.

use serde::{Deserialize, Serialize};
use std::time::Duration;

// ── Wire types (frontend-facing) ─────────────────────────────────────────────

/// The Bifrost gateway ledger's own reachability. It is either read (`Ok`) or
/// not (`Unreachable`) — there is no partial state; a per-key row simply has no
/// `budget` if the gateway reported none.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum LedgerStatus {
    Ok,
    Unreachable,
}

/// One virtual key's budget window, as the gateway's governance API reports it.
/// `current_usage` / `max_limit` are in the gateway's spend unit (USD).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BudgetInfo {
    pub max_limit: f64,
    pub current_usage: f64,
    /// The reset window, e.g. `"1M"` (monthly) — the gateway's own token.
    pub reset_duration: String,
    /// ISO 8601 of the last budget reset, when the gateway reports it.
    pub last_reset: Option<String>,
}

/// One virtual key row in the gateway ledger. Carries the key's identity +
/// budget window ONLY — never its bearer secret (see [`parse_governance_vkeys`]).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VkeyRow {
    pub id: String,
    pub name: String,
    pub is_active: bool,
    /// The key's first budget window, when one is configured.
    pub budget: Option<BudgetInfo>,
}

/// The Bifrost gateway ledger — the authoritative gateway-routed spend view.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GatewayLedger {
    /// Human label naming what this table is (authoritative gateway-routed spend).
    pub label: String,
    /// The Tailscale host:port the ledger was read from.
    pub host: String,
    pub status: LedgerStatus,
    pub rows: Vec<VkeyRow>,
    /// Present on `Unreachable` — a short honest reason (never a raw body).
    pub detail: Option<String>,
}

/// How a provider tile gets its data.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ProviderKind {
    /// Has a real balance/usage API the Toolbox reads (via the winhub key slot).
    WrapApi,
    /// No usable API at the fleet's tier — a click-through to the dashboard.
    DeepLink,
}

/// Honest per-provider tile status — never a fabricated balance.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ProviderStatus {
    /// A real balance/usage was read.
    Ok,
    /// A WRAP-API provider whose management-key slot is empty — no probe made.
    NotConfigured,
    /// A WRAP-API provider whose slot couldn't be checked / probed (winhub
    /// unreachable, or the provider call failed).
    Unreachable,
    /// A DEEP-LINK provider — balance is only on the provider dashboard by
    /// design (no API at the fleet's tier). Not a failure; an honest "elsewhere".
    DashboardOnly,
}

/// One provider tile in the roster.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderTile {
    pub id: String,
    pub display_name: String,
    pub kind: ProviderKind,
    pub status: ProviderStatus,
    /// Remaining balance / credits in the provider's native unit — `None` unless
    /// a real value was read (`status == Ok`).
    pub balance: Option<f64>,
    /// This-period usage in the provider's native unit — `None` unless real.
    pub usage: Option<f64>,
    /// The unit `balance`/`usage` are denominated in ("USD" | "credits" | "units").
    pub unit: String,
    /// Present on non-`Ok` tiles — a short, honest, human-readable reason.
    pub detail: Option<String>,
    /// Click-through to the provider's account / subscription / usage page.
    pub subscription_url: String,
}

/// The whole pane's data: the gateway ledger + the provider roster.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaidComputeSnapshot {
    pub gateway_ledger: GatewayLedger,
    pub providers: Vec<ProviderTile>,
    /// ISO 8601 UTC — when this snapshot was probed.
    pub probed_at: String,
}

// ── Host / slot resolution ───────────────────────────────────────────────────

/// The Bifrost gateway base URL, configured via `TENDER_BIFROST_HOST` (host or
/// host:port; a bare host gets port `8892` appended). A private gateway that
/// binds only to a Tailscale interface IP is addressed by that IP — no default
/// is baked in.
///
/// Empty by default: a stock build reaches NO gateway host until the operator
/// sets `TENDER_BIFROST_HOST`. When unset, this returns an empty string and the
/// ledger read is skipped ([`fetch_gateway_ledger`]) — never a call to a private
/// fleet IP.
fn bifrost_base_url() -> String {
    let host = std::env::var("TENDER_BIFROST_HOST").unwrap_or_default();
    if host.is_empty() {
        return String::new();
    }
    let host = if host.contains(':') { host } else { format!("{host}:8892") };
    format!("http://{host}")
}

/// The `ssh` target for remote slot-presence checks + on-host balance probes,
/// configured via `TENDER_WINHUB_SSH_HOST` (same env var G1's inventory probe uses).
/// Empty by default; when empty the `ssh` slot-presence/balance probes are
/// skipped and the WRAP-API tiles report `NotConfigured` rather than running
/// `ssh` against a nonexistent host.
fn winhub_ssh_host() -> String {
    std::env::var("TENDER_WINHUB_SSH_HOST").unwrap_or_default()
}

// ── Timestamp helper (no chrono dep — mirrors inventory.rs / backup.rs) ───────

fn now_iso() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let epoch = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let secs = epoch % 86400;
    let mut days = epoch / 86400;
    let (h, m, s) = (secs / 3600, (secs % 3600) / 60, secs % 60);
    let mut year = 1970u64;
    loop {
        let year_days = if is_leap(year) { 366 } else { 365 };
        if days < year_days {
            break;
        }
        days -= year_days;
        year += 1;
    }
    let leap = is_leap(year);
    let month_lengths = [31, if leap { 29 } else { 28 }, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let mut month = 1u64;
    for len in month_lengths {
        if days < len {
            break;
        }
        days -= len;
        month += 1;
    }
    format!("{year:04}-{month:02}-{:02}T{h:02}:{m:02}:{s:02}Z", days + 1)
}

fn is_leap(year: u64) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

// ── Bifrost gateway ledger (WRAP) ────────────────────────────────────────────

/// The governance API's virtual-keys shape — a DELIBERATELY NARROW mirror.
///
/// The real response additionally carries a `value` field on each key: the vkey
/// bearer SECRET (`sk-bf-…`). It is intentionally absent from this struct so
/// serde never deserializes it — the secret can't leak through a type that has
/// no field to hold it. Do NOT add a `value` field here.
#[derive(Deserialize)]
struct GovVkeysResponse {
    virtual_keys: Vec<GovVkey>,
}

#[derive(Deserialize)]
struct GovVkey {
    id: String,
    name: String,
    is_active: bool,
    #[serde(default)]
    budgets: Vec<GovBudget>,
    // NO `value` field — see the struct doc above. The secret is dropped here.
}

#[derive(Deserialize)]
struct GovBudget {
    max_limit: f64,
    current_usage: f64,
    reset_duration: String,
    last_reset: Option<String>,
}

/// Preferred display order for the fleet's known virtual keys; unknown keys sort
/// after these (stable), so a newly-added key still shows, just at the end.
const VKEY_ORDER: [&str; 3] = ["pilot-dogfood", "code-review", "fleet-offload"];

fn vkey_sort_index(name: &str) -> usize {
    VKEY_ORDER.iter().position(|n| *n == name).unwrap_or(VKEY_ORDER.len())
}

/// Pure parse — no I/O — of the governance virtual-keys response. Deserializes
/// ONLY the non-secret fields (see [`GovVkey`]); the vkey bearer `value` secret
/// is structurally dropped. Rows are returned in [`VKEY_ORDER`].
fn parse_governance_vkeys(body: &str) -> Result<Vec<VkeyRow>, String> {
    let parsed: GovVkeysResponse = serde_json::from_str(body)
        .map_err(|e| format!("unparseable Bifrost governance response: {e}"))?;
    let mut rows: Vec<VkeyRow> = parsed
        .virtual_keys
        .into_iter()
        .map(|k| VkeyRow {
            budget: k.budgets.into_iter().next().map(|b| BudgetInfo {
                max_limit: b.max_limit,
                current_usage: b.current_usage,
                reset_duration: b.reset_duration,
                last_reset: b.last_reset,
            }),
            id: k.id,
            is_active: k.is_active,
            name: k.name,
        })
        .collect();
    rows.sort_by_key(|r| (vkey_sort_index(&r.name), r.name.clone()));
    Ok(rows)
}

async fn fetch_gateway_ledger() -> GatewayLedger {
    let base = bifrost_base_url();
    let label = "Bifrost gateway ledger — authoritative gateway-routed spend".to_string();

    // No gateway host configured (stock build) — skip the read entirely rather
    // than reaching a private fleet IP. Report an honest not-configured ledger.
    if base.is_empty() {
        return unreachable_ledger(
            label,
            String::new(),
            "not configured — set TENDER_BIFROST_HOST to the gateway host:port to show the ledger"
                .to_string(),
        );
    }
    let host = base.trim_start_matches("http://").to_string();

    // `/api/governance/virtual-keys` carries budgets inline (usage vs limit per
    // key). The bare `/health` path is the real health check (`/v1/*` is a SPA
    // catch-all trap — bug-logged in the gateway README), but we don't need it
    // here: an unreachable governance read is itself the honest failure signal.
    let url = format!("{base}/api/governance/virtual-keys");
    let client = match reqwest::Client::builder().timeout(Duration::from_secs(6)).build() {
        Ok(c) => c,
        Err(e) => return unreachable_ledger(label, host, format!("HTTP client build failed: {e}")),
    };

    let resp = match client.get(&url).send().await {
        Ok(r) => r,
        Err(e) => {
            return unreachable_ledger(
                label,
                host,
                format!("cannot reach the internal gateway (is winhub / Tailscale up?): {e}"),
            )
        }
    };
    if !resp.status().is_success() {
        let code = resp.status();
        return unreachable_ledger(label, host, format!("gateway governance API returned {code}"));
    }
    // The raw body carries vkey bearer secrets in `value` fields — NEVER log it.
    let body = match resp.text().await {
        Ok(b) => b,
        Err(e) => return unreachable_ledger(label, host, format!("could not read gateway response: {e}")),
    };
    match parse_governance_vkeys(&body) {
        Ok(rows) => GatewayLedger { label, host, status: LedgerStatus::Ok, rows, detail: None },
        Err(e) => unreachable_ledger(label, host, e),
    }
}

fn unreachable_ledger(label: String, host: String, detail: String) -> GatewayLedger {
    GatewayLedger { label, host, status: LedgerStatus::Unreachable, rows: Vec::new(), detail: Some(detail) }
}

// ── WRAP-API providers via the winhub key slot (OpenRouter, fal) ─────────────

/// Result of the remote slot-presence check — never reads the slot's contents.
#[derive(Debug, PartialEq)]
enum SlotState {
    /// The slot file exists and is non-empty (a key is present).
    Present,
    /// The slot file is absent or empty (no key configured).
    Empty,
    /// The winhub host couldn't be reached to check.
    SshError(String),
}

const SLOT_PRESENT_SENTINEL: &str = "__SLOT_PRESENT__";
const SLOT_EMPTY_SENTINEL: &str = "__SLOT_EMPTY__";

/// Build the remote PowerShell that reports ONLY whether the slot exists and is
/// non-empty — it never reads or emits the key's contents. The slot path is
/// resolved from `$env:USERPROFILE` on winhub (portable across operators; no
/// hardcoded username), under the fleet's `.config\harborline\` secrets dir.
fn slot_presence_command(slot_filename: &str) -> String {
    format!(
        "$p = Join-Path $env:USERPROFILE '.config\\harborline\\{slot}'; \
         if ((Test-Path $p) -and (Get-Item $p).Length -gt 0) {{ '{present}' }} else {{ '{empty}' }}",
        slot = slot_filename,
        present = SLOT_PRESENT_SENTINEL,
        empty = SLOT_EMPTY_SENTINEL,
    )
}

/// Interpret the slot-presence command's stdout into a [`SlotState`].
fn parse_slot_presence(stdout: &str) -> SlotState {
    let t = stdout.trim();
    if t.contains(SLOT_PRESENT_SENTINEL) {
        SlotState::Present
    } else if t.contains(SLOT_EMPTY_SENTINEL) {
        SlotState::Empty
    } else {
        SlotState::SshError(format!("unexpected slot-check output: {t}"))
    }
}

async fn check_slot(ssh_host: &str, slot_filename: &str) -> SlotState {
    let command = slot_presence_command(slot_filename);
    let output = tokio::time::timeout(
        Duration::from_secs(12),
        tokio::process::Command::new("ssh")
            .args(["-o", "BatchMode=yes", "-o", "ConnectTimeout=6", ssh_host, &command])
            .output(),
    )
    .await;
    match output {
        Ok(Ok(o)) if o.status.success() => parse_slot_presence(&String::from_utf8_lossy(&o.stdout)),
        Ok(Ok(o)) => SlotState::SshError(format!(
            "ssh {ssh_host} exited {}: {}",
            o.status,
            String::from_utf8_lossy(&o.stderr).trim()
        )),
        Ok(Err(e)) => SlotState::SshError(format!("could not spawn ssh: {e}")),
        Err(_) => SlotState::SshError(format!("ssh to {ssh_host} timed out after 12s")),
    }
}

// -- OpenRouter --------------------------------------------------------------

/// OpenRouter `GET /api/v1/credits` (management key) → `{data:{total_credits,
/// total_usage}}`. Balance = `total_credits - total_usage` (survey §3 G3).
#[derive(Deserialize)]
struct OpenRouterCreditsResponse {
    data: OpenRouterCredits,
}
#[derive(Deserialize)]
struct OpenRouterCredits {
    total_credits: f64,
    total_usage: f64,
}

/// Pure parse of the OpenRouter credits response → `(balance, usage)` in USD.
fn parse_openrouter_credits(body: &str) -> Result<(f64, f64), String> {
    let parsed: OpenRouterCreditsResponse = serde_json::from_str(body)
        .map_err(|e| format!("unparseable OpenRouter /credits response: {e}"))?;
    let balance = parsed.data.total_credits - parsed.data.total_usage;
    Ok((balance, parsed.data.total_usage))
}

/// Build the on-winhub PowerShell that reads the OpenRouter management key from
/// the slot and calls `/api/v1/credits`, emitting ONLY the two numbers as JSON.
/// The key is read + used inside this remote script; it never returns over SSH —
/// only `{total_credits, total_usage}` does (the audience-segregation custody
/// rule). Runs only when [`check_slot`] reported `Present`.
fn openrouter_probe_command() -> String {
    // `$k` (the key) is used to build the Authorization header and is never
    // emitted — only the numeric `data` fields are piped to ConvertTo-Json.
    "$p = Join-Path $env:USERPROFILE '.config\\harborline\\openrouter-management.key'; \
     $k = (Get-Content -Raw $p).Trim(); \
     $c = Invoke-RestMethod -Headers @{ Authorization = \"Bearer $k\" } 'https://openrouter.ai/api/v1/credits'; \
     [pscustomobject]@{ total_credits = $c.data.total_credits; total_usage = $c.data.total_usage } | ConvertTo-Json -Compress"
        .to_string()
}

// -- fal ---------------------------------------------------------------------

/// fal account-billing/credits endpoint (`/platform-apis/v1/account/billing`,
/// "billing information and credit balances" — survey §3 G3 / open Q1). The
/// exact field name is unconfirmed until a fal account is provisioned; the
/// parser is written against the documented "credit balance" shape and accepts
/// the common field spellings, so it works the moment a slot is filled and its
/// live shape is confirmed (survey: verify at provisioning).
#[derive(Deserialize)]
struct FalBillingResponse {
    /// Documented as a credit balance; accept the likely spellings.
    #[serde(alias = "credit_balance", alias = "creditBalance", alias = "credits")]
    balance: Option<f64>,
}

/// Pure parse of the fal billing response → remaining credit balance.
fn parse_fal_billing(body: &str) -> Result<f64, String> {
    let parsed: FalBillingResponse = serde_json::from_str(body)
        .map_err(|e| format!("unparseable fal billing response: {e}"))?;
    parsed
        .balance
        .ok_or_else(|| "fal billing response had no recognizable credit-balance field".to_string())
}

/// Build the on-winhub PowerShell that reads the fal key from the slot and calls
/// the account-billing endpoint, emitting ONLY the raw billing JSON (the key is
/// used inside the remote script and never returned). Runs only when the slot is
/// `Present`; verify the exact response shape at provisioning (survey open Q1).
fn fal_probe_command() -> String {
    "$p = Join-Path $env:USERPROFILE '.config\\harborline\\fal.key'; \
     $k = (Get-Content -Raw $p).Trim(); \
     Invoke-RestMethod -Headers @{ Authorization = \"Key $k\" } 'https://api.fal.ai/platform-apis/v1/account/billing' | ConvertTo-Json -Compress"
        .to_string()
}

/// Run a probe command on winhub over SSH and return its stdout. The command
/// reads a key locally on winhub; only its emitted result (numbers/JSON) returns.
async fn ssh_run(ssh_host: &str, command: &str) -> Result<String, String> {
    let output = tokio::time::timeout(
        Duration::from_secs(15),
        tokio::process::Command::new("ssh")
            .args(["-o", "BatchMode=yes", "-o", "ConnectTimeout=6", ssh_host, command])
            .output(),
    )
    .await;
    match output {
        Ok(Ok(o)) if o.status.success() => Ok(String::from_utf8_lossy(&o.stdout).to_string()),
        Ok(Ok(o)) => Err(format!(
            "probe on {ssh_host} exited {}: {}",
            o.status,
            String::from_utf8_lossy(&o.stderr).trim()
        )),
        Ok(Err(e)) => Err(format!("could not spawn ssh: {e}")),
        Err(_) => Err(format!("probe on {ssh_host} timed out")),
    }
}

// ── Provider tile builders ────────────────────────────────────────────────────

const OPENROUTER_SUBSCRIPTION_URL: &str = "https://openrouter.ai/settings/credits";
const FAL_SUBSCRIPTION_URL: &str = "https://fal.ai/dashboard/billing";
const MODAL_USAGE_URL: &str = "https://modal.com/settings/usage";
const RECRAFT_PROFILE_URL: &str = "https://www.recraft.ai/profile";

/// OpenRouter tile — WRAP-API via the winhub management-key slot.
async fn build_openrouter_tile(ssh_host: &str) -> ProviderTile {
    let base = ProviderTile {
        id: "openrouter".to_string(),
        display_name: "OpenRouter".to_string(),
        kind: ProviderKind::WrapApi,
        status: ProviderStatus::NotConfigured,
        balance: None,
        usage: None,
        unit: "USD".to_string(),
        detail: None,
        subscription_url: OPENROUTER_SUBSCRIPTION_URL.to_string(),
    };

    if ssh_host.is_empty() {
        return ProviderTile {
            detail: Some(
                "not configured — set TENDER_WINHUB_SSH_HOST to the key-slot host to show balance"
                    .to_string(),
            ),
            ..base
        };
    }

    match check_slot(ssh_host, "openrouter-management.key").await {
        SlotState::Empty => ProviderTile {
            detail: Some(
                "no balance key configured — add a read-only OpenRouter provisioning/management key \
                 to the winhub slot (%USERPROFILE%\\.config\\harborline\\openrouter-management.key) \
                 to show account balance + usage here"
                    .to_string(),
            ),
            ..base
        },
        SlotState::SshError(e) => ProviderTile {
            status: ProviderStatus::Unreachable,
            detail: Some(format!("couldn't check the winhub key slot: {e}")),
            ..base
        },
        SlotState::Present => match ssh_run(ssh_host, &openrouter_probe_command()).await {
            Ok(out) => match parse_openrouter_credits(&out) {
                Ok((balance, usage)) => ProviderTile {
                    status: ProviderStatus::Ok,
                    balance: Some(balance),
                    usage: Some(usage),
                    ..base
                },
                Err(e) => ProviderTile {
                    status: ProviderStatus::Unreachable,
                    detail: Some(format!("OpenRouter balance read failed: {e}")),
                    ..base
                },
            },
            Err(e) => ProviderTile {
                status: ProviderStatus::Unreachable,
                detail: Some(format!("OpenRouter balance probe failed: {e}")),
                ..base
            },
        },
    }
}

/// fal tile — WRAP-API via the winhub key slot (shape verified at provisioning).
async fn build_fal_tile(ssh_host: &str) -> ProviderTile {
    let base = ProviderTile {
        id: "fal".to_string(),
        display_name: "fal.ai".to_string(),
        kind: ProviderKind::WrapApi,
        status: ProviderStatus::NotConfigured,
        balance: None,
        usage: None,
        unit: "USD".to_string(),
        detail: None,
        subscription_url: FAL_SUBSCRIPTION_URL.to_string(),
    };

    if ssh_host.is_empty() {
        return ProviderTile {
            detail: Some(
                "not configured — set TENDER_WINHUB_SSH_HOST to the key-slot host to show balance"
                    .to_string(),
            ),
            ..base
        };
    }

    match check_slot(ssh_host, "fal.key").await {
        SlotState::Empty => ProviderTile {
            detail: Some(
                "no balance key configured — add a read-only fal platform/admin key to the winhub \
                 slot (%USERPROFILE%\\.config\\harborline\\fal.key) to show credit balance here \
                 (verify the billing endpoint shape at provisioning)"
                    .to_string(),
            ),
            ..base
        },
        SlotState::SshError(e) => ProviderTile {
            status: ProviderStatus::Unreachable,
            detail: Some(format!("couldn't check the winhub key slot: {e}")),
            ..base
        },
        SlotState::Present => match ssh_run(ssh_host, &fal_probe_command()).await {
            Ok(out) => match parse_fal_billing(&out) {
                Ok(balance) => ProviderTile {
                    status: ProviderStatus::Ok,
                    balance: Some(balance),
                    unit: "credits".to_string(),
                    ..base
                },
                Err(e) => ProviderTile {
                    status: ProviderStatus::Unreachable,
                    detail: Some(format!("fal balance read failed (verify endpoint shape): {e}")),
                    ..base
                },
            },
            Err(e) => ProviderTile {
                status: ProviderStatus::Unreachable,
                detail: Some(format!("fal balance probe failed: {e}")),
                ..base
            },
        },
    }
}

/// A DEEP-LINK tile — no usable API at the fleet's tier; honest "dashboard-only".
fn deep_link_tile(id: &str, display_name: &str, url: &str, why: &str) -> ProviderTile {
    ProviderTile {
        id: id.to_string(),
        display_name: display_name.to_string(),
        kind: ProviderKind::DeepLink,
        status: ProviderStatus::DashboardOnly,
        balance: None,
        usage: None,
        unit: "USD".to_string(),
        detail: Some(format!("balance on the provider dashboard — {why}")),
        subscription_url: url.to_string(),
    }
}

// ── Public entry point ────────────────────────────────────────────────────────

/// Read the whole paid-compute view: the Bifrost gateway ledger + the provider
/// roster. Never errors to the caller — the ledger's reachability and each
/// provider tile's own status carry any failure honestly (the fleet's
/// fail-soft-to-frontend convention, matching G1/G2 + `provider_health`).
pub async fn get_paid_compute() -> PaidComputeSnapshot {
    let ssh_host = winhub_ssh_host();
    let (gateway_ledger, openrouter, fal) = tokio::join!(
        fetch_gateway_ledger(),
        build_openrouter_tile(&ssh_host),
        build_fal_tile(&ssh_host),
    );

    let providers = vec![
        openrouter,
        fal,
        deep_link_tile(
            "modal",
            "Modal",
            MODAL_USAGE_URL,
            "the billing API is Team/Enterprise-gated; the fleet's Starter plan has no balance API",
        ),
        deep_link_tile(
            "recraft",
            "Recraft",
            RECRAFT_PROFILE_URL,
            "prepaid API units, dashboard-checked (no balance API)",
        ),
    ];

    PaidComputeSnapshot { gateway_ledger, providers, probed_at: now_iso() }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── De-fleet defaults (public-release hardening) ─────────────────────

    /// A stock build (no `TENDER_*` env vars) must report the gateway ledger
    /// unreachable/not-configured and the WRAP-API tiles not-configured —
    /// without reaching any gateway host or running `ssh`.
    #[tokio::test]
    async fn unset_hosts_yield_not_configured_snapshot() {
        std::env::remove_var("TENDER_BIFROST_HOST");
        std::env::remove_var("TENDER_WINHUB_SSH_HOST");
        let snap = get_paid_compute().await;
        assert!(matches!(snap.gateway_ledger.status, LedgerStatus::Unreachable));
        assert!(snap.gateway_ledger.host.is_empty());
        assert!(snap.gateway_ledger.detail.as_deref().unwrap_or("").contains("not configured"));
        for tile in snap.providers.iter().filter(|t| t.kind == ProviderKind::WrapApi) {
            assert!(
                tile.detail.as_deref().unwrap_or("").contains("not configured"),
                "{} tile should be not configured",
                tile.id
            );
            assert!(tile.balance.is_none());
        }
    }

    // ── Bifrost governance parsing — the SECRET-DROP guarantee ────────────────

    /// Shape-matched fixture (winhub internal gateway governance response,
    /// UUID/count/budget shape preserved) with a SYNTHETIC `value` bearer-secret
    /// field — to prove the parser drops it. The `value` field only needs to be
    /// PRESENT for the secret-drop assertion to be meaningful; it does not need
    /// to be a real credential. Do not paste a real gateway response body into a
    /// fixture again — see .wolf/buglog.json (live vkey bearer leak, 2026-07-07).
    const REAL_GOV_BODY_WITH_SECRETS: &str = r#"{
        "count": 2, "total_count": 2,
        "virtual_keys": [
          {
            "id": "vk-fleet-code-review", "name": "code-review", "is_active": true,
            "provider_configs": [], "mcp_configs": [], "calendar_aligned": false,
            "budgets": [
              {"id": "budget-code-review", "max_limit": 5, "reset_duration": "1M",
               "last_reset": "2026-07-07T11:16:52.7443096-04:00", "current_usage": 0.42,
               "virtual_key_id": "vk-fleet-code-review"}
            ],
            "value": "sk-bf-FAKEFAKE-0000-0000-0000-000000000001"
          },
          {
            "id": "vk-fleet-pilot-dogfood", "name": "pilot-dogfood", "is_active": true,
            "budgets": [
              {"id": "budget-pilot-dogfood", "max_limit": 5, "reset_duration": "1M",
               "last_reset": "2026-07-07T11:16:52Z", "current_usage": 0}
            ],
            "value": "sk-bf-FAKEFAKE-0000-0000-0000-000000000002"
          }
        ]
    }"#;

    #[test]
    fn parses_real_governance_vkeys_and_orders_them() {
        let rows = parse_governance_vkeys(REAL_GOV_BODY_WITH_SECRETS).expect("parses");
        assert_eq!(rows.len(), 2);
        // VKEY_ORDER puts pilot-dogfood before code-review.
        assert_eq!(rows[0].name, "pilot-dogfood");
        assert_eq!(rows[1].name, "code-review");
        let b = rows[1].budget.as_ref().expect("code-review has a budget");
        assert_eq!(b.max_limit, 5.0);
        assert_eq!(b.current_usage, 0.42);
        assert_eq!(b.reset_duration, "1M");
        assert!(b.last_reset.is_some());
    }

    #[test]
    fn secret_value_field_is_never_deserialized_or_reserialized() {
        // The parse struct has no `value` field, so the bearer secret is dropped
        // at deserialize. Re-serializing the frontend-facing rows must therefore
        // contain NO `sk-bf-…` secret and no `value` key at all — the
        // audience-segregation "nothing to steal" rule at the parse boundary.
        let rows = parse_governance_vkeys(REAL_GOV_BODY_WITH_SECRETS).expect("parses");
        let json = serde_json::to_string(&rows).expect("serializes");
        assert!(!json.contains("sk-bf-"), "a vkey bearer secret leaked into frontend JSON");
        assert!(!json.contains("value"), "a `value` secret field leaked into frontend JSON");
        // But the safe fields ARE present.
        assert!(json.contains("code-review"));
        assert!(json.contains("currentUsage"));
    }

    #[test]
    fn vkey_with_no_budget_is_honestly_none() {
        let body = r#"{"virtual_keys":[{"id":"vk-x","name":"x","is_active":false,"budgets":[]}]}"#;
        let rows = parse_governance_vkeys(body).expect("parses");
        assert_eq!(rows.len(), 1);
        assert!(rows[0].budget.is_none());
        assert!(!rows[0].is_active);
    }

    #[test]
    fn unknown_vkey_names_sort_after_known_ones() {
        let body = r#"{"virtual_keys":[
          {"id":"vk-z","name":"zzz-new-key","is_active":true,"budgets":[]},
          {"id":"vk-cr","name":"code-review","is_active":true,"budgets":[]}
        ]}"#;
        let rows = parse_governance_vkeys(body).expect("parses");
        assert_eq!(rows[0].name, "code-review");
        assert_eq!(rows[1].name, "zzz-new-key");
    }

    #[test]
    fn governance_malformed_json_is_an_error() {
        assert!(parse_governance_vkeys("not json").is_err());
    }

    // ── OpenRouter parsing ────────────────────────────────────────────────────

    #[test]
    fn parses_openrouter_credits_balance_is_credits_minus_usage() {
        // Documented /api/v1/credits shape (survey §3 G3).
        let body = r#"{"data":{"total_credits":20.0,"total_usage":7.5}}"#;
        let (balance, usage) = parse_openrouter_credits(body).expect("parses");
        assert_eq!(balance, 12.5);
        assert_eq!(usage, 7.5);
    }

    #[test]
    fn openrouter_malformed_is_an_error() {
        assert!(parse_openrouter_credits(r#"{"data":{}}"#).is_err());
    }

    // ── fal parsing (documented shape; verify live at provisioning) ───────────

    #[test]
    fn parses_fal_billing_credit_balance_field_variants() {
        assert_eq!(parse_fal_billing(r#"{"balance":42.0}"#).unwrap(), 42.0);
        assert_eq!(parse_fal_billing(r#"{"credit_balance":15.25}"#).unwrap(), 15.25);
        assert_eq!(parse_fal_billing(r#"{"credits":3.0}"#).unwrap(), 3.0);
    }

    #[test]
    fn fal_missing_balance_field_is_an_honest_error_not_a_zero() {
        // A response with no recognizable balance field must error (→ Unreachable
        // tile), never silently become a fake `0` balance.
        assert!(parse_fal_billing(r#"{"unexpected":"shape"}"#).is_err());
    }

    // ── Slot-presence command safety (never reads key contents) ───────────────

    #[test]
    fn slot_presence_command_only_checks_existence_never_reads_contents() {
        let cmd = slot_presence_command("openrouter-management.key");
        assert!(cmd.contains("Test-Path"));
        assert!(cmd.contains(".Length -gt 0"));
        assert!(cmd.contains("$env:USERPROFILE"), "path must be portable, no hardcoded username");
        assert!(cmd.contains("openrouter-management.key"));
        // Must NOT read the file's contents.
        assert!(!cmd.contains("Get-Content"), "presence check must never read the key contents");
    }

    #[test]
    fn parse_slot_presence_maps_sentinels() {
        assert_eq!(parse_slot_presence("__SLOT_PRESENT__\n"), SlotState::Present);
        assert_eq!(parse_slot_presence("  __SLOT_EMPTY__  "), SlotState::Empty);
        assert!(matches!(parse_slot_presence("ssh banner noise"), SlotState::SshError(_)));
    }

    // ── Balance-probe command safety (key used on winhub, never returned) ─────

    #[test]
    fn openrouter_probe_emits_only_numbers_never_the_key() {
        let cmd = openrouter_probe_command();
        assert!(cmd.contains("api/v1/credits"));
        assert!(cmd.contains("total_credits"));
        assert!(cmd.contains("total_usage"));
        // The key variable ($k) is used only in the Authorization header; the
        // emitted object is a fixed numeric field set — $k is never in the output.
        assert!(cmd.contains("Authorization = \"Bearer $k\""));
        assert!(!cmd.contains("$k }"), "the key must not be piped into the output object");
        assert!(!cmd.contains("key = $k"), "the key must not appear as an emitted field");
    }

    #[test]
    fn fal_probe_targets_documented_billing_endpoint() {
        let cmd = fal_probe_command();
        assert!(cmd.contains("platform-apis/v1/account/billing"));
        assert!(cmd.contains("Authorization = \"Key $k\""));
    }

    // ── Tile shaping ──────────────────────────────────────────────────────────

    #[test]
    fn deep_link_tile_is_dashboard_only_with_no_fake_balance() {
        let t = deep_link_tile("modal", "Modal", MODAL_USAGE_URL, "no API");
        assert_eq!(t.status, ProviderStatus::DashboardOnly);
        assert_eq!(t.kind, ProviderKind::DeepLink);
        assert!(t.balance.is_none(), "a deep-link provider must never carry a fabricated balance");
        assert!(t.usage.is_none());
        assert!(t.subscription_url.contains("modal.com"));
    }

    // ── Serde wire-shape guards (frontend contract) ───────────────────────────

    #[test]
    fn enums_serialise_camel_case() {
        assert_eq!(serde_json::to_string(&LedgerStatus::Unreachable).unwrap(), "\"unreachable\"");
        assert_eq!(serde_json::to_string(&ProviderKind::WrapApi).unwrap(), "\"wrapApi\"");
        assert_eq!(serde_json::to_string(&ProviderKind::DeepLink).unwrap(), "\"deepLink\"");
        assert_eq!(serde_json::to_string(&ProviderStatus::NotConfigured).unwrap(), "\"notConfigured\"");
        assert_eq!(serde_json::to_string(&ProviderStatus::DashboardOnly).unwrap(), "\"dashboardOnly\"");
    }

    #[test]
    fn budget_info_serialises_camel_case_fields() {
        let b = BudgetInfo {
            max_limit: 5.0,
            current_usage: 1.25,
            reset_duration: "1M".to_string(),
            last_reset: None,
        };
        let json = serde_json::to_string(&b).unwrap();
        assert!(json.contains("maxLimit"));
        assert!(json.contains("currentUsage"));
        assert!(json.contains("resetDuration"));
    }
}
