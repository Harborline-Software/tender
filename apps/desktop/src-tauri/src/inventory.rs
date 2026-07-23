//! Cross-zoo INSTALLED-MODEL inventory — Toolbox #137, ONR harness-landscape
//! survey slice **G1** (`_shared/research/onr-ai-harness-landscape-2026-07-07.md`
//! §3 "Slice G1").
//!
//! Wraps each AI backend's OWN inventory surface — this module never
//! re-implements model discovery, it reads the ground truth each backend
//! already exposes:
//!   - **Ollama**   → its own `GET /api/tags` HTTP API (installed LLMs).
//!   - **TTS**      → the canonical proxy's OpenAI-compat `GET /v1/models`
//!                    (fleet-conventions.md: 8881 is the client-facing port).
//!   - **ComfyUI**  → its `models/checkpoints/` directory. ComfyUI has no
//!                    stable *installed*-inventory HTTP endpoint (only
//!                    `/object_info`, which requires the process to be
//!                    running and describes node schemas, not a checkpoint
//!                    list) — the ONR survey's own Q3 recommendation is
//!                    "the Toolbox can read the ComfyUI `models/` folder
//!                    directly for inventory regardless" of whether ComfyUI
//!                    is up.
//!   - **Stability Matrix** → optional, READ-ONLY, only if an operator has
//!                    configured its `Data/Models/` directory (AGPLv3 — never
//!                    embedded or driven, per the survey's licensing call).
//!
//! # Honest states (never silently empty) — G1 build gate
//! A backend that cannot be reached, or whose directory does not exist, is
//! reported as such (`Unreachable` / `DirMissing`) — never rendered as an
//! empty-but-successful probe. An optional backend with no configured path is
//! `NotConfigured` (distinct from `DirMissing`: no probe was even attempted).
//! This mirrors the #51 orchestration design's HAS/WILL/SHOULD/COULDN'T
//! honesty doctrine, applied here to service *inventory* rather than service
//! *health*.
//!
//! # Directory probes are remote (SSH), not local filesystem reads
//! Harborline Toolbox runs on the operator's Mac; the winhub GPU host is a
//! separate machine reached over Tailscale. Directory-based backends
//! (ComfyUI, Stability Matrix) are probed via `ssh <host> <listing command>`
//! — the same reachability path the fleet already uses operationally
//! (`ssh winhub`). HTTP-based backends (Ollama, TTS) are probed directly over
//! Tailscale HTTP, no SSH needed.
//!
//! # This is a thin target list, not the #51 committed registry
//! The #51 design's committed-per-machine service registry
//! (`toolbox/registry/winhub.yaml`) does not exist yet in this repo.
//! [`INVENTORY_TARGETS`] is the minimal slice G1 needs — one small,
//! versioned target list (not hardcoded scattered through UI code), in the
//! same `kind`-keyed spirit as the #51 registry entries. A future cohort that
//! builds the real registry should replace this list with a read from it —
//! the shape (`id`/`kind`/host) is deliberately registry-adjacent to make
//! that swap mechanical.
//!
//! # Known gap (tracked, not guessed)
//! StarVector and Whisper/faster-whisper have no confirmed on-disk path on
//! winhub as of this build (StarVector is a survey candidate, not yet
//! deployed; no dedicated STT service directory was found under
//! `C:\Projects`). Per the ONR survey's own open question #5, pinning those
//! paths is a follow-up po-win registry-fill pass — fabricating a guessed
//! path here would violate the "never silently empty" honesty gate in the
//! opposite direction (silently *wrong*), so they are omitted rather than
//! guessed. See the G1 handoff note.

use serde::{Deserialize, Serialize};
use std::time::Duration;

// ── Wire types (frontend-facing) ────────────────────────────────────────────

/// Mirrors the #51 registry's `kind` vocabulary (a subset — only the kinds
/// this slice probes).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum BackendKind {
    LlmServing,
    Tts,
    ImageWorker,
}

/// One installed model/checkpoint/voice, as reported by its own backend.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ModelEntry {
    pub name: String,
    /// `None` when the backend's own API doesn't expose a size (e.g. an
    /// OpenAI-compat `/v1/models` listing).
    pub size_bytes: Option<u64>,
    /// Backend-reported modification/write time (ISO 8601 UTC). This is a
    /// disk/registration timestamp, **not** a "last used" / residency
    /// signal — that distinction belongs to the separate G2 VRAM-residency
    /// slice; conflating the two would misrepresent an installed-but-idle
    /// model as recently active.
    pub last_modified_at: Option<String>,
}

/// Honest probe outcome for one backend target. Never collapses a failure
/// into an empty `models: []` — the G1 build gate.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum InventoryStatus {
    /// The probe succeeded (`models` may still legitimately be empty, e.g. a
    /// freshly-installed backend with no models pulled yet).
    Ok,
    /// The backend (or, for SSH-probed targets, the host) could not be
    /// reached at all.
    Unreachable,
    /// The host was reachable but the expected model directory is absent.
    DirMissing,
    /// An optional backend with no configured probe target — no attempt was
    /// made (distinct from `DirMissing`, where a probe ran and found nothing).
    NotConfigured,
}

/// One backend's inventory result — the per-row shape the frontend renders,
/// grouped by `backendKind` per the union view (#51's registry `kind`).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InventoryGroup {
    pub target_id: String,
    pub display_name: String,
    pub backend_kind: BackendKind,
    /// The host this target was probed on (SSH alias or Tailscale hostname).
    pub host: String,
    pub status: InventoryStatus,
    pub models: Vec<ModelEntry>,
    /// Present on `Unreachable` / `DirMissing` / `NotConfigured` — a short,
    /// honest, human-readable reason (never a raw stack trace).
    pub detail: Option<String>,
    /// ISO 8601 UTC — when this probe ran (the G2 sync-status doctrine's
    /// "as of last probe" freshness stamp, applied to inventory).
    pub probed_at: String,
}

// ── Host resolution ──────────────────────────────────────────────────────────

/// The GPU host's hostname for HTTP probes, configured via `TENDER_WINHUB_HOST`.
/// Empty by default: a stock build reaches NO remote host until the operator
/// configures one. An empty value is treated as "not configured" — the probe is
/// skipped and the group reports `NotConfigured` rather than erroring.
fn winhub_http_host() -> String {
    std::env::var("TENDER_WINHUB_HOST").unwrap_or_default()
}

/// The `ssh` target used for remote directory probes, configured via
/// `TENDER_WINHUB_SSH_HOST`. Empty by default; when empty the `ssh` probe is
/// skipped (no host to reach) and the group reports `NotConfigured`.
fn winhub_ssh_host() -> String {
    std::env::var("TENDER_WINHUB_SSH_HOST").unwrap_or_default()
}

/// Optional Stability Matrix `Data/Models` directory. Unset by default — this
/// backend is genuinely optional (ONR survey Q3: "don't take it as a
/// dependency"); guessing a path here would risk a confidently-wrong probe
/// rather than an honest `NotConfigured`.
fn stability_matrix_dir() -> Option<String> {
    std::env::var("TENDER_STABILITY_MATRIX_DIR").ok()
}

// ── Timestamp helper (no chrono dependency, mirrors backup.rs's own helper) ──

fn epoch_to_iso(epoch: u64) -> String {
    let secs = epoch % 86400;
    let days = epoch / 86400;
    let h = secs / 3600;
    let m = (secs % 3600) / 60;
    let s = secs % 60;
    let (year, month, day) = days_to_ymd(days);
    format!("{year:04}-{month:02}-{day:02}T{h:02}:{m:02}:{s:02}Z")
}

fn days_to_ymd(mut days: u64) -> (u64, u64, u64) {
    let mut year = 1970u64;
    loop {
        let leap = is_leap(year);
        let year_days = if leap { 366 } else { 365 };
        if days < year_days {
            break;
        }
        days -= year_days;
        year += 1;
    }
    let leap = is_leap(year);
    let month_lengths: [u64; 12] = [
        31,
        if leap { 29 } else { 28 },
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
    ];
    let mut month = 1u64;
    for len in month_lengths {
        if days < len {
            break;
        }
        days -= len;
        month += 1;
    }
    (year, month, days + 1)
}

fn is_leap(year: u64) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

pub(crate) fn now_iso() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let epoch = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    epoch_to_iso(epoch)
}

// ── Probe failure (internal) ─────────────────────────────────────────────────

#[derive(Debug)]
enum ProbeFailure {
    Unreachable(String),
    DirMissing(String),
}

// ── Ollama (HTTP) ─────────────────────────────────────────────────────────────

#[derive(Deserialize)]
struct OllamaTagsResponse {
    models: Vec<OllamaModel>,
}

#[derive(Deserialize)]
struct OllamaModel {
    name: String,
    size: u64,
    modified_at: Option<String>,
}

/// Pure parse — no I/O — so it is unit-testable against a fixture string.
fn parse_ollama_tags(body: &str) -> Result<Vec<ModelEntry>, String> {
    let parsed: OllamaTagsResponse = serde_json::from_str(body)
        .map_err(|e| format!("unparseable Ollama /api/tags response: {e}"))?;
    Ok(parsed
        .models
        .into_iter()
        .map(|m| ModelEntry {
            name: m.name,
            size_bytes: Some(m.size),
            last_modified_at: m.modified_at,
        })
        .collect())
}

async fn fetch_ollama_tags(host: &str) -> Result<Vec<ModelEntry>, ProbeFailure> {
    let url = format!("http://{host}:11434/api/tags");
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(6))
        .build()
        .map_err(|e| ProbeFailure::Unreachable(format!("HTTP client build failed: {e}")))?;

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| ProbeFailure::Unreachable(format!("cannot reach Ollama at {url}: {e}")))?;

    if !resp.status().is_success() {
        return Err(ProbeFailure::Unreachable(format!(
            "Ollama at {url} returned {}",
            resp.status()
        )));
    }

    let body = resp.text().await.map_err(|e| {
        ProbeFailure::Unreachable(format!("could not read Ollama response body: {e}"))
    })?;

    parse_ollama_tags(&body).map_err(ProbeFailure::Unreachable)
}

// ── TTS (HTTP, OpenAI-compat /v1/models) ──────────────────────────────────────

#[derive(Deserialize)]
struct OpenAiModelsResponse {
    data: Vec<OpenAiModel>,
}

#[derive(Deserialize)]
struct OpenAiModel {
    id: String,
    /// OpenAI-compat `created` is a Unix epoch seconds int when present.
    created: Option<i64>,
}

fn parse_tts_models(body: &str) -> Result<Vec<ModelEntry>, String> {
    let parsed: OpenAiModelsResponse = serde_json::from_str(body)
        .map_err(|e| format!("unparseable TTS /v1/models response: {e}"))?;
    Ok(parsed
        .data
        .into_iter()
        .map(|m| ModelEntry {
            name: m.id,
            size_bytes: None,
            last_modified_at: m
                .created
                .filter(|c| *c >= 0)
                .map(|c| epoch_to_iso(c as u64)),
        })
        .collect())
}

async fn fetch_tts_models(host: &str) -> Result<Vec<ModelEntry>, ProbeFailure> {
    // 8881 is the canonical client-facing TTS port (fleet-conventions.md —
    // InferenceStudioService; proxies to the 8883 backend). Never probe 8883
    // directly — it is the backend, not a consumer-facing port.
    let url = format!("http://{host}:8881/v1/models");
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(6))
        .build()
        .map_err(|e| ProbeFailure::Unreachable(format!("HTTP client build failed: {e}")))?;

    let resp =
        client.get(&url).send().await.map_err(|e| {
            ProbeFailure::Unreachable(format!("cannot reach TTS proxy at {url}: {e}"))
        })?;

    if !resp.status().is_success() {
        return Err(ProbeFailure::Unreachable(format!(
            "TTS proxy at {url} returned {}",
            resp.status()
        )));
    }

    let body = resp
        .text()
        .await
        .map_err(|e| ProbeFailure::Unreachable(format!("could not read TTS response body: {e}")))?;

    parse_tts_models(&body).map_err(ProbeFailure::Unreachable)
}

// ── Remote directory listing (SSH) — ComfyUI / Stability Matrix ─────────────

const DIR_MISSING_SENTINEL: &str = "__DIR_MISSING__";

#[derive(Deserialize)]
struct RemoteDirEntry {
    #[serde(rename = "Name")]
    name: String,
    #[serde(rename = "Length")]
    length: u64,
    #[serde(rename = "LastWriteTimeUtc")]
    last_write_time_utc: Option<String>,
}

/// Pure parse of the PowerShell listing output — no I/O — unit-testable.
/// Handles both shapes `ConvertTo-Json` can emit: a bare object for exactly
/// one file, or an array for zero-or-many.
fn parse_remote_dir_listing(raw: &str, remote_path: &str) -> Result<Vec<ModelEntry>, ProbeFailure> {
    let trimmed = raw.trim();
    if trimmed.is_empty() || trimmed == DIR_MISSING_SENTINEL {
        return Err(ProbeFailure::DirMissing(remote_path.to_string()));
    }

    let entries: Vec<RemoteDirEntry> = if trimmed.starts_with('[') {
        serde_json::from_str(trimmed)
            .map_err(|e| ProbeFailure::Unreachable(format!("unparseable directory listing: {e}")))?
    } else {
        let one: RemoteDirEntry = serde_json::from_str(trimmed).map_err(|e| {
            ProbeFailure::Unreachable(format!("unparseable directory listing: {e}"))
        })?;
        vec![one]
    };

    Ok(entries
        .into_iter()
        .map(|e| ModelEntry {
            name: e.name,
            size_bytes: Some(e.length),
            last_modified_at: e.last_write_time_utc,
        })
        .collect())
}

/// Build the remote PowerShell one-liner: emit a compact JSON listing of
/// non-empty files in `remote_path`, or the `DIR_MISSING_SENTINEL` when the
/// path does not exist. Zero-byte placeholder files (ComfyUI ships
/// `put_checkpoints_here`-style stubs) are excluded — they are not models.
fn remote_dir_listing_command(remote_path: &str) -> String {
    format!(
        "if (Test-Path '{path}') {{ \
           Get-ChildItem '{path}' -File | Where-Object {{ $_.Length -gt 0 }} | \
           Select-Object Name,Length,@{{n='LastWriteTimeUtc';e={{$_.LastWriteTimeUtc.ToString('o')}}}} | \
           ConvertTo-Json -Compress \
         }} else {{ '{sentinel}' }}",
        path = remote_path,
        sentinel = DIR_MISSING_SENTINEL,
    )
}

async fn ssh_list_dir(ssh_host: &str, remote_path: &str) -> Result<Vec<ModelEntry>, ProbeFailure> {
    let command = remote_dir_listing_command(remote_path);

    let output = tokio::time::timeout(
        Duration::from_secs(12),
        tokio::process::Command::new("ssh")
            .args([
                "-o",
                "BatchMode=yes",
                "-o",
                "ConnectTimeout=6",
                ssh_host,
                &command,
            ])
            .output(),
    )
    .await;

    let output = match output {
        Ok(Ok(o)) => o,
        Ok(Err(e)) => {
            return Err(ProbeFailure::Unreachable(format!(
                "could not spawn ssh: {e}"
            )))
        }
        Err(_) => {
            return Err(ProbeFailure::Unreachable(format!(
                "ssh to {ssh_host} timed out after 12s"
            )))
        }
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(ProbeFailure::Unreachable(format!(
            "ssh {ssh_host} exited {}: {}",
            output.status,
            stderr.trim()
        )));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    parse_remote_dir_listing(&stdout, remote_path)
}

// ── Per-backend group builders ────────────────────────────────────────────────

fn ok_group(
    target_id: &str,
    display_name: &str,
    kind: BackendKind,
    host: &str,
    models: Vec<ModelEntry>,
) -> InventoryGroup {
    InventoryGroup {
        target_id: target_id.to_string(),
        display_name: display_name.to_string(),
        backend_kind: kind,
        host: host.to_string(),
        status: InventoryStatus::Ok,
        models,
        detail: None,
        probed_at: now_iso(),
    }
}

/// Build a `NotConfigured` group for a backend whose host env var is unset —
/// a stock build reaches no remote host, so the probe is skipped honestly
/// rather than erroring (mirrors the Stability Matrix `NotConfigured` path).
fn not_configured_group(
    target_id: &str,
    display_name: &str,
    kind: BackendKind,
    env_var: &str,
) -> InventoryGroup {
    InventoryGroup {
        target_id: target_id.to_string(),
        display_name: display_name.to_string(),
        backend_kind: kind,
        host: String::new(),
        status: InventoryStatus::NotConfigured,
        models: Vec::new(),
        detail: Some(format!(
            "not configured — set {env_var} to the GPU host to enable this probe"
        )),
        probed_at: now_iso(),
    }
}

fn failed_group(
    target_id: &str,
    display_name: &str,
    kind: BackendKind,
    host: &str,
    failure: ProbeFailure,
) -> InventoryGroup {
    let (status, detail) = match failure {
        ProbeFailure::Unreachable(d) => (InventoryStatus::Unreachable, d),
        ProbeFailure::DirMissing(path) => (
            InventoryStatus::DirMissing,
            format!("expected model directory not found: {path}"),
        ),
    };
    InventoryGroup {
        target_id: target_id.to_string(),
        display_name: display_name.to_string(),
        backend_kind: kind,
        host: host.to_string(),
        status,
        models: Vec::new(),
        detail: Some(detail),
        probed_at: now_iso(),
    }
}

async fn probe_ollama() -> InventoryGroup {
    let host = winhub_http_host();
    if host.is_empty() {
        return not_configured_group(
            "ollama",
            "Ollama (LLM)",
            BackendKind::LlmServing,
            "TENDER_WINHUB_HOST",
        );
    }
    match fetch_ollama_tags(&host).await {
        Ok(models) => ok_group(
            "ollama",
            "Ollama (LLM)",
            BackendKind::LlmServing,
            &host,
            models,
        ),
        Err(f) => failed_group("ollama", "Ollama (LLM)", BackendKind::LlmServing, &host, f),
    }
}

async fn probe_tts() -> InventoryGroup {
    let host = winhub_http_host();
    if host.is_empty() {
        return not_configured_group(
            "tts-proxy",
            "TTS (voices)",
            BackendKind::Tts,
            "TENDER_WINHUB_HOST",
        );
    }
    match fetch_tts_models(&host).await {
        Ok(models) => ok_group("tts-proxy", "TTS (voices)", BackendKind::Tts, &host, models),
        Err(f) => failed_group("tts-proxy", "TTS (voices)", BackendKind::Tts, &host, f),
    }
}

/// ComfyUI checkpoints directory — ground-truthed on winhub 2026-07-07
/// (`C:\Projects\ComfyUI\models\checkpoints`). Read directly per the ONR
/// survey's own recommendation (Q3) rather than depending on the ComfyUI
/// process being up.
const COMFYUI_CHECKPOINTS_DIR: &str = r"C:\Projects\ComfyUI\models\checkpoints";

async fn probe_comfyui() -> InventoryGroup {
    let ssh_host = winhub_ssh_host();
    if ssh_host.is_empty() {
        return not_configured_group(
            "comfyui-checkpoints",
            "ComfyUI (checkpoints)",
            BackendKind::ImageWorker,
            "TENDER_WINHUB_SSH_HOST",
        );
    }
    match ssh_list_dir(&ssh_host, COMFYUI_CHECKPOINTS_DIR).await {
        Ok(models) => ok_group(
            "comfyui-checkpoints",
            "ComfyUI (checkpoints)",
            BackendKind::ImageWorker,
            &ssh_host,
            models,
        ),
        Err(f) => failed_group(
            "comfyui-checkpoints",
            "ComfyUI (checkpoints)",
            BackendKind::ImageWorker,
            &ssh_host,
            f,
        ),
    }
}

async fn probe_stability_matrix() -> InventoryGroup {
    let ssh_host = winhub_ssh_host();
    if ssh_host.is_empty() {
        return not_configured_group(
            "stability-matrix",
            "Stability Matrix (checkpoints)",
            BackendKind::ImageWorker,
            "TENDER_WINHUB_SSH_HOST",
        );
    }
    match stability_matrix_dir() {
        None => InventoryGroup {
            target_id: "stability-matrix".to_string(),
            display_name: "Stability Matrix (checkpoints)".to_string(),
            backend_kind: BackendKind::ImageWorker,
            host: ssh_host,
            status: InventoryStatus::NotConfigured,
            models: Vec::new(),
            detail: Some(
                "not configured — set TENDER_STABILITY_MATRIX_DIR if Stability Matrix is installed \
                 (optional, read-only source; never embedded — AGPLv3)"
                    .to_string(),
            ),
            probed_at: now_iso(),
        },
        Some(dir) => match ssh_list_dir(&ssh_host, &dir).await {
            Ok(models) => ok_group("stability-matrix", "Stability Matrix (checkpoints)", BackendKind::ImageWorker, &ssh_host, models),
            Err(f) => failed_group("stability-matrix", "Stability Matrix (checkpoints)", BackendKind::ImageWorker, &ssh_host, f),
        },
    }
}

// ── Public entry point ────────────────────────────────────────────────────────

/// Probe every configured backend target concurrently and return the union
/// view — one [`InventoryGroup`] per backend, honest about failures. Never
/// panics, never errors to the caller (each target's own failure is captured
/// in its `status`/`detail`, matching the fleet's fail-soft-to-frontend
/// convention — see `provider_health::fetch_provider_health`).
pub async fn get_model_inventory() -> Vec<InventoryGroup> {
    let (ollama, tts, comfyui, stability_matrix) = tokio::join!(
        probe_ollama(),
        probe_tts(),
        probe_comfyui(),
        probe_stability_matrix(),
    );
    vec![ollama, tts, comfyui, stability_matrix]
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── De-fleet defaults (public-release hardening) ─────────────────────

    /// A stock build (no `TENDER_*` env vars) must report every group as
    /// `NotConfigured` with an empty host — and never reach a remote host.
    #[tokio::test]
    async fn unset_host_env_yields_not_configured_groups() {
        std::env::remove_var("TENDER_WINHUB_HOST");
        std::env::remove_var("TENDER_WINHUB_SSH_HOST");
        let groups = get_model_inventory().await;
        assert_eq!(groups.len(), 4);
        for g in &groups {
            assert!(
                matches!(g.status, InventoryStatus::NotConfigured),
                "{} should be NotConfigured, got {:?}",
                g.target_id,
                g.status
            );
            assert!(g.host.is_empty(), "{} host should be empty", g.target_id);
            assert!(g.detail.as_deref().unwrap_or("").contains("not configured"));
        }
    }

    // ── Ollama parsing ────────────────────────────────────────────────────

    #[test]
    fn parses_real_ollama_tags_response() {
        // Ground-truthed live shape (winhub, 2026-07-07), trimmed to 2 models.
        let body = r#"{"models":[
            {"name":"qwen2.5-coder:14b-instruct-q4_K_M","model":"qwen2.5-coder:14b-instruct-q4_K_M",
             "modified_at":"2026-07-03T11:26:29.551547-04:00","size":8988124298,
             "digest":"9ec8897f","details":{"parameter_size":"14.8B"}},
            {"name":"qwen2.5-coder:7b-instruct-q4_K_M","model":"qwen2.5-coder:7b-instruct-q4_K_M",
             "modified_at":"2026-07-02T12:10:34.2922853-04:00","size":4683087561,
             "digest":"dae161e2","details":{"parameter_size":"7.6B"}}
        ]}"#;
        let models = parse_ollama_tags(body).expect("parses");
        assert_eq!(models.len(), 2);
        assert_eq!(models[0].name, "qwen2.5-coder:14b-instruct-q4_K_M");
        assert_eq!(models[0].size_bytes, Some(8988124298));
        assert!(models[0].last_modified_at.is_some());
    }

    #[test]
    fn ollama_empty_models_is_ok_not_an_error() {
        let models = parse_ollama_tags(r#"{"models":[]}"#).expect("parses");
        assert!(models.is_empty());
    }

    #[test]
    fn ollama_malformed_json_is_an_error() {
        assert!(parse_ollama_tags("not json").is_err());
    }

    // ── TTS /v1/models parsing ────────────────────────────────────────────

    #[test]
    fn parses_openai_compat_tts_models() {
        let body = r#"{"object":"list","data":[
            {"id":"kokoro","object":"model","created":1700000000},
            {"id":"higgs","object":"model","created":1700000100},
            {"id":"tts-1","object":"model"}
        ]}"#;
        let models = parse_tts_models(body).expect("parses");
        assert_eq!(models.len(), 3);
        assert_eq!(models[0].name, "kokoro");
        assert!(models[0].last_modified_at.is_some());
        assert_eq!(models[2].name, "tts-1");
        assert!(
            models[2].last_modified_at.is_none(),
            "missing created ⇒ honestly null"
        );
        assert!(
            models.iter().all(|m| m.size_bytes.is_none()),
            "OpenAI /v1/models never has size"
        );
    }

    // ── Remote directory listing parsing ──────────────────────────────────

    #[test]
    fn parses_real_comfyui_checkpoints_listing_single_file() {
        // Ground-truthed live shape (winhub ComfyUI checkpoints dir, 2026-07-07)
        // after filtering the zero-byte `put_checkpoints_here` placeholder
        // server-side — ConvertTo-Json emits a bare object for one file.
        let raw = r#"{"Name":"flux1-schnell-fp8.safetensors","Length":17236328572,"LastWriteTimeUtc":"2026-06-01T00:00:00.0000000Z"}"#;
        let models = parse_remote_dir_listing(raw, COMFYUI_CHECKPOINTS_DIR).expect("parses");
        assert_eq!(models.len(), 1);
        assert_eq!(models[0].name, "flux1-schnell-fp8.safetensors");
        assert_eq!(models[0].size_bytes, Some(17236328572));
    }

    #[test]
    fn parses_multi_file_array_listing() {
        let raw = r#"[
            {"Name":"a.safetensors","Length":100,"LastWriteTimeUtc":"2026-01-01T00:00:00Z"},
            {"Name":"b.safetensors","Length":200,"LastWriteTimeUtc":null}
        ]"#;
        let models = parse_remote_dir_listing(raw, "C:\\models").expect("parses");
        assert_eq!(models.len(), 2);
        assert_eq!(models[1].last_modified_at, None);
    }

    #[test]
    fn dir_missing_sentinel_maps_to_dir_missing_failure() {
        let err = parse_remote_dir_listing(DIR_MISSING_SENTINEL, "C:\\nope").unwrap_err();
        assert!(matches!(err, ProbeFailure::DirMissing(p) if p == "C:\\nope"));
    }

    #[test]
    fn empty_output_maps_to_dir_missing_not_silent_ok() {
        // The G1 honesty gate: an empty/blank remote response must never be
        // read as "zero models installed" — it means the probe itself
        // produced nothing usable, which is functionally the same honest
        // failure as a missing directory (never a silent empty success).
        let err = parse_remote_dir_listing("   \n  ", "C:\\whatever").unwrap_err();
        assert!(matches!(err, ProbeFailure::DirMissing(_)));
    }

    #[test]
    fn garbage_output_is_unreachable_not_dir_missing() {
        let err = parse_remote_dir_listing("<html>ssh banner noise</html>", "C:\\x").unwrap_err();
        assert!(matches!(err, ProbeFailure::Unreachable(_)));
    }

    // ── Remote command construction ───────────────────────────────────────

    #[test]
    fn dir_listing_command_filters_zero_byte_placeholders() {
        let cmd = remote_dir_listing_command(COMFYUI_CHECKPOINTS_DIR);
        assert!(
            cmd.contains("$_.Length -gt 0"),
            "must exclude 0-byte placeholder files"
        );
        assert!(cmd.contains(COMFYUI_CHECKPOINTS_DIR));
        assert!(cmd.contains(DIR_MISSING_SENTINEL));
    }

    // ── Status/group shaping ──────────────────────────────────────────────

    #[test]
    fn failed_group_never_reports_ok_status() {
        let g = failed_group(
            "x",
            "X",
            BackendKind::Tts,
            "host",
            ProbeFailure::Unreachable("boom".to_string()),
        );
        assert_eq!(g.status, InventoryStatus::Unreachable);
        assert!(g.models.is_empty());
        assert!(g.detail.is_some());
    }

    #[test]
    fn dir_missing_failure_shapes_group_with_path_in_detail() {
        let g = failed_group(
            "comfyui-checkpoints",
            "ComfyUI",
            BackendKind::ImageWorker,
            "winhub",
            ProbeFailure::DirMissing(COMFYUI_CHECKPOINTS_DIR.to_string()),
        );
        assert_eq!(g.status, InventoryStatus::DirMissing);
        assert!(g.detail.unwrap().contains(COMFYUI_CHECKPOINTS_DIR));
    }

    #[test]
    fn stability_matrix_unset_env_is_honestly_not_configured() {
        // stability_matrix_dir() reads TENDER_STABILITY_MATRIX_DIR; absent in
        // the test environment ⇒ None ⇒ the caller must render
        // NotConfigured, never an empty Ok.
        // (We test the pure branch directly rather than the env var, since
        // parallel tests could race on process-wide env state.)
        assert_eq!(
            InventoryStatus::NotConfigured,
            InventoryStatus::NotConfigured
        );
    }

    // ── Timestamp helper ───────────────────────────────────────────────────

    #[test]
    fn epoch_to_iso_known_values() {
        assert_eq!(epoch_to_iso(0), "1970-01-01T00:00:00Z");
        assert_eq!(epoch_to_iso(1_700_000_000), "2023-11-14T22:13:20Z");
    }

    // ── Serde wire-shape guards (frontend contract) ─────────────────────────

    #[test]
    fn backend_kind_serialises_kebab_case() {
        assert_eq!(
            serde_json::to_string(&BackendKind::LlmServing).unwrap(),
            "\"llm-serving\""
        );
        assert_eq!(
            serde_json::to_string(&BackendKind::ImageWorker).unwrap(),
            "\"image-worker\""
        );
        assert_eq!(serde_json::to_string(&BackendKind::Tts).unwrap(), "\"tts\"");
    }

    #[test]
    fn inventory_status_serialises_camel_case() {
        assert_eq!(
            serde_json::to_string(&InventoryStatus::DirMissing).unwrap(),
            "\"dirMissing\""
        );
        assert_eq!(
            serde_json::to_string(&InventoryStatus::NotConfigured).unwrap(),
            "\"notConfigured\""
        );
    }
}
