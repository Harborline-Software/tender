//! Cross-zoo VRAM RESIDENCY — Toolbox #137, ONR harness-landscape survey
//! slice **G2** (`_shared/research/onr-ai-harness-landscape-2026-07-07.md`
//! §3 "Slice G2"). Answers "what is loaded on the GPU RIGHT NOW", over the
//! same target list [`crate::inventory`] uses for INSTALLED inventory (G1).
//!
//! # WRAP vs BUILD (per the survey)
//! - **WRAP** `nvidia-smi` for VRAM ground truth (aggregate headline +
//!   per-PID compute-app list) and each backend's own "what's loaded"
//!   endpoint (Ollama `GET /api/ps` — the only confirmed one; see the
//!   honest gap note below for TTS/ComfyUI).
//! - **BUILD** the PID → registry-service correlation: this module's own
//!   reason to exist (#51 §4.4's arbiter reconciliation, surfaced as a
//!   pane rather than an enforcement loop).
//!
//! # The driver caveat is REAL on winhub, not hypothetical (#51 assumption A3)
//! Live-probed 2026-07-07: `nvidia-smi --query-compute-apps=pid,used_memory,
//! process_name` returns `used_memory=[N/A]` for **every** process on this
//! consumer RTX 4070 Ti (WDDM driver does not expose per-process VRAM
//! accounting for compute-apps in this configuration). This module never
//! assumes per-PID memory is available — [`GpuResidencySnapshot::
//! per_process_attribution_available`] is `false` on this box, and the
//! headline figure ALWAYS comes from the aggregate `--query-gpu` read
//! (which every driver reports), never a sum of per-PID reads.
//!
//! # Correlation strategy — process PATH prefix, not PID/port games
//! `nvidia-smi`'s `process_name` field is the process's full executable
//! path (ground-truthed live), so a GPU-active process is matched to a
//! registry target by a path-prefix/substring test against each target's
//! own launch location — the SAME non-personal paths G1 already uses
//! (`C:\Projects\ComfyUI\...`, `C:\Projects\higgs-audio`). Ollama's
//! executable path is `%LOCALAPPDATA%\Programs\Ollama\...`, which embeds
//! the OS username — matching is therefore done on the **filename**
//! (`ollama.exe` / `ollama_llama_server.exe`, case-insensitive) rather than
//! the full path, so no personal path fragment is ever read, stored, or
//! logged (PII-gate discipline, fleet-conventions.md).
//!
//! # Honest gap — TTS has no confirmed "what's loaded" endpoint
//! Per the ONR survey's own open question #5 and G1's handoff, no
//! confirmed on-disk/API "what model is currently warm" signal exists for
//! the Higgs/Kokoro TTS backend (its OpenAI-compat `/v1/models` — G1 —
//! lists *installed* voices, not *loaded* state). This module reports TTS
//! residency as [`ResidencyStatus::Unknown`] with an honest detail string
//! rather than guessing — the G1/G2 honesty doctrine applied to residency.
//! ComfyUI has no persistent "loaded" concept at all (jobs are transient),
//! so a ComfyUI process detected on the GPU is reported `Unknown` with the
//! same honest framing, never invented as "Loaded — model X".

use crate::inventory::BackendKind;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;

// ── Wire types (frontend-facing) ────────────────────────────────────────────

/// Aggregate GPU memory — the headline. Always available (every NVIDIA
/// driver reports `--query-gpu`, unlike per-process compute-app memory).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GpuHeadline {
    pub total_vram_mb: u64,
    pub used_vram_mb: u64,
    pub free_vram_mb: u64,
}

/// Honest per-service residency outcome. Mirrors the G1 `InventoryStatus`
/// honesty shape, applied to "is a model loaded right now" instead of "is a
/// model installed".
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ResidencyStatus {
    /// A model is confirmed warm — backend-reported (Ollama `/api/ps`) or
    /// GPU-process-correlated.
    Loaded,
    /// The backend was reached and confirmed nothing is currently loaded.
    Idle,
    /// The backend/host could not be reached at all.
    Unreachable,
    /// Reachable (or GPU-detected), but this backend has no confirmed
    /// "what's loaded" signal — never guessed (see module docs).
    Unknown,
}

/// One row of the residency pane: service | model | VRAM MB | since-when.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResidencyRow {
    pub service_id: String,
    pub display_name: String,
    pub backend_kind: BackendKind,
    pub status: ResidencyStatus,
    /// The warm model/voice name, when known (Ollama `/api/ps`, or a
    /// best-effort label for a path-correlated process).
    pub model_name: Option<String>,
    /// Best-known VRAM figure for this row. Backend-self-reported (Ollama's
    /// own `size_vram`) takes priority over `nvidia-smi` per-PID reads
    /// (which are `None` when the driver doesn't report them — see module
    /// docs); `None` when no figure is available at all.
    pub vram_mb: Option<u64>,
    /// The `nvidia-smi` PID this row was correlated to, when a GPU-active
    /// process matched this service (never a personal path — see module
    /// docs).
    pub pid: Option<u32>,
    /// Backend-reported freshness signal — for Ollama this is `expires_at`
    /// (when it will idle-unload), NOT a "loaded since" timestamp (Ollama's
    /// API does not expose one). Honestly `None` for path-correlated rows,
    /// which carry no timing signal at all.
    pub since: Option<String>,
    /// Present on `Unreachable` / `Unknown` — a short, honest reason.
    pub detail: Option<String>,
}

/// The full residency pane payload.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuResidencySnapshot {
    pub gpu: GpuHeadline,
    /// `false` on drivers that don't report per-process VRAM for compute
    /// apps (confirmed the common case on winhub's consumer RTX 4070 Ti,
    /// WDDM) — the #51 assumption A3 degrade-to-aggregate path, live not
    /// hypothetical.
    pub per_process_attribution_available: bool,
    /// `usedVramMb` minus the sum of every row's own `vramMb` where known.
    /// `None` when no row carries a VRAM figure at all (nothing to
    /// subtract from) — never a fabricated zero. A large positive value is
    /// the #51 §4.4 "accounting drift" finding, surfaced here as data
    /// rather than a claim.
    pub unattributed_vram_mb: Option<u64>,
    pub rows: Vec<ResidencyRow>,
    pub probed_at: String,
}

// ── Host resolution (mirrors inventory.rs) ──────────────────────────────────

// Empty by default: a stock build reaches NO remote GPU host until the operator
// configures one. An empty ssh host means "not configured" — `ssh` is skipped
// and the snapshot reports an honest not-configured state (see
// `get_gpu_residency`), never a fabricated Idle/Loaded guess.
fn winhub_http_host() -> String {
    std::env::var("TENDER_WINHUB_HOST").unwrap_or_default()
}

fn winhub_ssh_host() -> String {
    std::env::var("TENDER_WINHUB_SSH_HOST").unwrap_or_default()
}

// ── Timestamp helper (mirrors inventory.rs — no chrono dependency) ─────────

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
    let month_lengths: [u64; 12] = [31, if leap { 29 } else { 28 }, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
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

fn now_iso() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let epoch = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    epoch_to_iso(epoch)
}

// ── Probe failure (internal) ────────────────────────────────────────────────

#[derive(Debug)]
enum ProbeFailure {
    Unreachable(String),
}

// ── SSH exec helper (mirrors inventory.rs's ssh_list_dir invocation shape,
//    generalised to run any remote command) ─────────────────────────────────

async fn ssh_exec(ssh_host: &str, remote_command: &str) -> Result<String, ProbeFailure> {
    let output = tokio::time::timeout(
        Duration::from_secs(10),
        tokio::process::Command::new("ssh")
            .args(["-o", "BatchMode=yes", "-o", "ConnectTimeout=6", ssh_host, remote_command])
            .output(),
    )
    .await;

    let output = match output {
        Ok(Ok(o)) => o,
        Ok(Err(e)) => return Err(ProbeFailure::Unreachable(format!("could not spawn ssh: {e}"))),
        Err(_) => return Err(ProbeFailure::Unreachable(format!("ssh to {ssh_host} timed out after 10s"))),
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(ProbeFailure::Unreachable(format!(
            "ssh {ssh_host} exited {}: {}",
            output.status,
            stderr.trim()
        )));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

// ── nvidia-smi: aggregate headline ──────────────────────────────────────────

/// Pure parse — no I/O — of `nvidia-smi --query-gpu=memory.total,memory.used,
/// memory.free --format=csv,noheader,nounits` (one line, e.g.
/// `"12282, 10448, 1547"`).
fn parse_gpu_headline(csv_line: &str) -> Result<GpuHeadline, String> {
    let line = csv_line.lines().next().unwrap_or("").trim();
    let parts: Vec<&str> = line.split(',').map(|s| s.trim()).collect();
    if parts.len() != 3 {
        return Err(format!("expected 3 CSV fields (total,used,free), got: {csv_line:?}"));
    }
    let total = parts[0].parse::<u64>().map_err(|e| format!("bad total_vram_mb {:?}: {e}", parts[0]))?;
    let used = parts[1].parse::<u64>().map_err(|e| format!("bad used_vram_mb {:?}: {e}", parts[1]))?;
    let free = parts[2].parse::<u64>().map_err(|e| format!("bad free_vram_mb {:?}: {e}", parts[2]))?;
    Ok(GpuHeadline {
        total_vram_mb: total,
        used_vram_mb: used,
        free_vram_mb: free,
    })
}

async fn fetch_gpu_headline(ssh_host: &str) -> Result<GpuHeadline, ProbeFailure> {
    let raw = ssh_exec(
        ssh_host,
        "nvidia-smi --query-gpu=memory.total,memory.used,memory.free --format=csv,noheader,nounits",
    )
    .await?;
    parse_gpu_headline(&raw).map_err(ProbeFailure::Unreachable)
}

// ── nvidia-smi: per-PID compute-apps list ───────────────────────────────────

/// One GPU-active process as reported by `nvidia-smi --query-compute-apps`.
#[derive(Debug, Clone, PartialEq)]
struct GpuProcess {
    pid: u32,
    /// `None` when the driver reports `[N/A]` for this process's memory —
    /// the #51 assumption A3 caveat, confirmed live on winhub (module docs).
    used_memory_mb: Option<u64>,
    process_path: String,
}

/// Pure parse — no I/O — of `nvidia-smi --query-compute-apps=pid,used_memory,
/// process_name --format=csv,noheader,nounits`. Handles the `[N/A]` memory
/// sentinel (the real winhub WDDM-driver behavior) without failing the row —
/// an unattributable-memory process is still a real, reportable GPU process.
fn parse_gpu_processes(csv: &str) -> Vec<GpuProcess> {
    csv.lines()
        .filter_map(|line| {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                return None;
            }
            // process_name may itself contain commas in theory (it never does
            // for Windows paths), but split on the first two commas only so a
            // stray comma in the tail is preserved as part of the path.
            let mut parts = trimmed.splitn(3, ',');
            let pid_s = parts.next()?.trim();
            let mem_s = parts.next()?.trim();
            let path = parts.next()?.trim().to_string();

            let pid = pid_s.parse::<u32>().ok()?;
            let used_memory_mb = mem_s.parse::<u64>().ok(); // None on "[N/A]" or anything non-numeric

            Some(GpuProcess {
                pid,
                used_memory_mb,
                process_path: path,
            })
        })
        .collect()
}

async fn fetch_gpu_processes(ssh_host: &str) -> Result<Vec<GpuProcess>, ProbeFailure> {
    let raw = ssh_exec(
        ssh_host,
        "nvidia-smi --query-compute-apps=pid,used_memory,process_name --format=csv,noheader,nounits",
    )
    .await?;
    Ok(parse_gpu_processes(&raw))
}

// ── Ollama /api/ps — the one confirmed "what's loaded" backend endpoint ────

#[derive(Deserialize)]
struct OllamaPsResponse {
    #[serde(default)]
    models: Vec<OllamaPsModel>,
}

#[derive(Deserialize)]
struct OllamaPsModel {
    name: String,
    /// Ollama's OWN reported VRAM footprint for this loaded model — real
    /// per-model VRAM ground truth even when `nvidia-smi` can't attribute
    /// per-process memory on this driver.
    size_vram: Option<u64>,
    /// When Ollama will idle-unload this model (its `keep_alive` deadline).
    expires_at: Option<String>,
}

/// Pure parse — no I/O.
fn parse_ollama_ps(body: &str) -> Result<Vec<(String, Option<u64>, Option<String>)>, String> {
    let parsed: OllamaPsResponse =
        serde_json::from_str(body).map_err(|e| format!("unparseable Ollama /api/ps response: {e}"))?;
    Ok(parsed.models.into_iter().map(|m| (m.name, m.size_vram, m.expires_at)).collect())
}

async fn fetch_ollama_ps(host: &str) -> Result<Vec<(String, Option<u64>, Option<String>)>, ProbeFailure> {
    let url = format!("http://{host}:11434/api/ps");
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
        return Err(ProbeFailure::Unreachable(format!("Ollama at {url} returned {}", resp.status())));
    }

    let body = resp
        .text()
        .await
        .map_err(|e| ProbeFailure::Unreachable(format!("could not read Ollama response body: {e}")))?;

    parse_ollama_ps(&body).map_err(ProbeFailure::Unreachable)
}

// ── TTS reachability (no "what's loaded" endpoint — honest Unknown) ────────

async fn probe_tts_reachable(host: &str) -> bool {
    let url = format!("http://{host}:8881/v1/models");
    let client = match reqwest::Client::builder().timeout(Duration::from_secs(5)).build() {
        Ok(c) => c,
        Err(_) => return false,
    };
    matches!(client.get(&url).send().await, Ok(resp) if resp.status().is_success())
}

// ── Process-path correlation (BUILD — the G2 net-new bit) ──────────────────

/// Registry-adjacent path-match targets, same spirit as
/// `inventory::INVENTORY_TARGETS` (a thin stand-in for the not-yet-committed
/// `toolbox/registry/winhub.yaml`; §2 kind vocabulary). Filename-only for
/// Ollama (its install path embeds the OS username — never matched or
/// logged); cwd-substring for the others (already non-personal, shared
/// `C:\Projects\...` paths — same ones G1 uses).
struct PathMatchTarget {
    service_id: &'static str,
    display_name: &'static str,
    backend_kind: BackendKind,
    /// Case-insensitive substrings; a process path matching ANY of these is
    /// attributed to this service.
    patterns: &'static [&'static str],
}

const PATH_MATCH_TARGETS: &[PathMatchTarget] = &[
    PathMatchTarget {
        service_id: "ollama",
        display_name: "Ollama (LLM)",
        backend_kind: BackendKind::LlmServing,
        patterns: &["ollama.exe", "ollama_llama_server"],
    },
    PathMatchTarget {
        service_id: "tts-backend",
        display_name: "TTS (Higgs/Kokoro)",
        backend_kind: BackendKind::Tts,
        patterns: &["higgs-audio", "kokoro-fastapi"],
    },
    PathMatchTarget {
        service_id: "comfyui",
        display_name: "ComfyUI",
        backend_kind: BackendKind::ImageWorker,
        patterns: &["\\comfyui\\"],
    },
];

fn match_process_to_target(process_path: &str) -> Option<&'static PathMatchTarget> {
    let lower = process_path.to_ascii_lowercase();
    PATH_MATCH_TARGETS
        .iter()
        .find(|t| t.patterns.iter().any(|p| lower.contains(&p.to_ascii_lowercase())))
}

// ── Public entry point ───────────────────────────────────────────────────────

/// Probe `nvidia-smi` (headline + per-PID list) and every backend's own
/// "what's loaded" signal, correlate, and return one honest residency
/// snapshot. Never panics, never errors to the caller — a hard GPU-probe
/// failure surfaces as a single `Unreachable` row set with a zeroed
/// headline and an honest `detail`, matching the fleet's fail-soft-to-
/// frontend convention (`inventory::get_model_inventory`,
/// `provider_health::fetch_provider_health`).
pub async fn get_gpu_residency() -> GpuResidencySnapshot {
    let ssh_host = winhub_ssh_host();
    let http_host = winhub_http_host();

    // No GPU host configured (stock build) — do not run `ssh`. Report every
    // row honestly as Unreachable with a "not configured" detail rather than
    // erroring or fabricating an Idle/Loaded state.
    if ssh_host.is_empty() {
        let detail = "not configured — set TENDER_WINHUB_SSH_HOST (and TENDER_WINHUB_HOST) \
                      to the GPU host to enable residency probing"
            .to_string();
        let rows = PATH_MATCH_TARGETS
            .iter()
            .map(|t| ResidencyRow {
                service_id: t.service_id.to_string(),
                display_name: t.display_name.to_string(),
                backend_kind: t.backend_kind,
                status: ResidencyStatus::Unreachable,
                model_name: None,
                vram_mb: None,
                pid: None,
                since: None,
                detail: Some(detail.clone()),
            })
            .collect();
        return GpuResidencySnapshot {
            gpu: GpuHeadline { total_vram_mb: 0, used_vram_mb: 0, free_vram_mb: 0 },
            per_process_attribution_available: false,
            unattributed_vram_mb: None,
            rows,
            probed_at: now_iso(),
        };
    }

    let (headline_res, processes_res, ollama_ps_res, tts_reachable) = tokio::join!(
        fetch_gpu_headline(&ssh_host),
        fetch_gpu_processes(&ssh_host),
        fetch_ollama_ps(&http_host),
        probe_tts_reachable(&http_host),
    );

    let probed_at = now_iso();

    let headline = match headline_res {
        Ok(h) => h,
        Err(ProbeFailure::Unreachable(detail)) => {
            // The GPU host itself is unreachable — every row is honestly
            // Unreachable, never a fabricated Idle/Loaded guess.
            let rows = PATH_MATCH_TARGETS
                .iter()
                .map(|t| ResidencyRow {
                    service_id: t.service_id.to_string(),
                    display_name: t.display_name.to_string(),
                    backend_kind: t.backend_kind,
                    status: ResidencyStatus::Unreachable,
                    model_name: None,
                    vram_mb: None,
                    pid: None,
                    since: None,
                    detail: Some(detail.clone()),
                })
                .collect();
            return GpuResidencySnapshot {
                gpu: GpuHeadline { total_vram_mb: 0, used_vram_mb: 0, free_vram_mb: 0 },
                per_process_attribution_available: false,
                unattributed_vram_mb: None,
                rows,
                probed_at,
            };
        }
    };

    let processes = processes_res.unwrap_or_default();
    let per_process_attribution_available = !processes.is_empty() && processes.iter().any(|p| p.used_memory_mb.is_some());

    // Correlate every GPU-active process to a known service target.
    let mut by_service: HashMap<&'static str, Vec<&GpuProcess>> = HashMap::new();
    for proc in &processes {
        if let Some(target) = match_process_to_target(&proc.process_path) {
            by_service.entry(target.service_id).or_default().push(proc);
        }
    }

    let mut rows: Vec<ResidencyRow> = Vec::new();
    let mut attributed_total: u64 = 0;
    let mut any_attribution = false;

    for target in PATH_MATCH_TARGETS {
        let matched = by_service.get(target.service_id);

        if target.service_id == "ollama" {
            match &ollama_ps_res {
                Ok(loaded) if !loaded.is_empty() => {
                    for (name, size_vram, expires_at) in loaded {
                        if let Some(v) = size_vram {
                            attributed_total += v / (1024 * 1024);
                            any_attribution = true;
                        }
                        rows.push(ResidencyRow {
                            service_id: target.service_id.to_string(),
                            display_name: target.display_name.to_string(),
                            backend_kind: target.backend_kind,
                            status: ResidencyStatus::Loaded,
                            model_name: Some(name.clone()),
                            vram_mb: size_vram.map(|b| b / (1024 * 1024)),
                            pid: matched.and_then(|ps| ps.first()).map(|p| p.pid),
                            since: expires_at.clone(),
                            detail: None,
                        });
                    }
                }
                Ok(_) => rows.push(ResidencyRow {
                    service_id: target.service_id.to_string(),
                    display_name: target.display_name.to_string(),
                    backend_kind: target.backend_kind,
                    status: ResidencyStatus::Idle,
                    model_name: None,
                    vram_mb: None,
                    pid: None,
                    since: None,
                    detail: None,
                }),
                Err(ProbeFailure::Unreachable(detail)) => rows.push(ResidencyRow {
                    service_id: target.service_id.to_string(),
                    display_name: target.display_name.to_string(),
                    backend_kind: target.backend_kind,
                    status: ResidencyStatus::Unreachable,
                    model_name: None,
                    vram_mb: None,
                    pid: None,
                    since: None,
                    detail: Some(detail.clone()),
                }),
            }
            continue;
        }

        // TTS / ComfyUI — no confirmed "what's loaded" endpoint (module
        // docs). Best-effort: a GPU-process path match means "detected,
        // model unknown"; otherwise fall back to a plain reachability read
        // for TTS, or Idle for ComfyUI (it has no persistent load state to
        // be Unknown about when no process is present).
        if let Some(procs) = matched {
            let p = procs[0];
            attributed_total += p.used_memory_mb.unwrap_or(0);
            if p.used_memory_mb.is_some() {
                any_attribution = true;
            }
            rows.push(ResidencyRow {
                service_id: target.service_id.to_string(),
                display_name: target.display_name.to_string(),
                backend_kind: target.backend_kind,
                status: ResidencyStatus::Unknown,
                model_name: None,
                vram_mb: p.used_memory_mb,
                pid: Some(p.pid),
                since: None,
                detail: Some(
                    "GPU-active, but this backend exposes no \"what's loaded\" API — model identity \
                     unknown (tracked gap, see the G1 handoff's open question #5)."
                        .to_string(),
                ),
            });
        } else if target.service_id == "tts-backend" {
            let reachable = tts_reachable;
            rows.push(ResidencyRow {
                service_id: target.service_id.to_string(),
                display_name: target.display_name.to_string(),
                backend_kind: target.backend_kind,
                status: if reachable { ResidencyStatus::Unknown } else { ResidencyStatus::Idle },
                model_name: None,
                vram_mb: None,
                pid: None,
                since: None,
                detail: if reachable {
                    Some(
                        "TTS proxy is reachable but exposes no \"what's loaded\" API — cannot confirm \
                         residency without a GPU-process match."
                            .to_string(),
                    )
                } else {
                    None
                },
            });
        } else {
            rows.push(ResidencyRow {
                service_id: target.service_id.to_string(),
                display_name: target.display_name.to_string(),
                backend_kind: target.backend_kind,
                status: ResidencyStatus::Idle,
                model_name: None,
                vram_mb: None,
                pid: None,
                since: None,
                detail: None,
            });
        }
    }

    let unattributed_vram_mb = if any_attribution {
        Some(headline.used_vram_mb.saturating_sub(attributed_total))
    } else {
        None
    };

    GpuResidencySnapshot {
        gpu: headline,
        per_process_attribution_available,
        unattributed_vram_mb,
        rows,
        probed_at,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── De-fleet defaults (public-release hardening) ─────────────────────

    /// A stock build (no `TENDER_*` env vars) must report every row as
    /// `Unreachable` with a "not configured" detail — and never run `ssh`.
    #[tokio::test]
    async fn unset_ssh_host_reports_not_configured_rows() {
        std::env::remove_var("TENDER_WINHUB_HOST");
        std::env::remove_var("TENDER_WINHUB_SSH_HOST");
        let snap = get_gpu_residency().await;
        assert_eq!(snap.gpu.total_vram_mb, 0);
        assert!(!snap.per_process_attribution_available);
        assert!(!snap.rows.is_empty());
        for r in &snap.rows {
            assert!(
                matches!(r.status, ResidencyStatus::Unreachable),
                "{} should be Unreachable",
                r.service_id
            );
            assert!(r.detail.as_deref().unwrap_or("").contains("not configured"));
        }
    }

    // ── GPU headline parsing ────────────────────────────────────────────

    #[test]
    fn parses_real_gpu_headline() {
        // Ground-truthed live shape (winhub, 2026-07-07).
        let h = parse_gpu_headline("12282, 10448, 1547").expect("parses");
        assert_eq!(h.total_vram_mb, 12282);
        assert_eq!(h.used_vram_mb, 10448);
        assert_eq!(h.free_vram_mb, 1547);
    }

    #[test]
    fn headline_wrong_field_count_is_an_error() {
        assert!(parse_gpu_headline("12282, 10448").is_err());
    }

    #[test]
    fn headline_non_numeric_is_an_error() {
        assert!(parse_gpu_headline("[N/A], 10448, 1547").is_err());
    }

    // ── GPU compute-apps parsing ───────────────────────────────────────

    #[test]
    fn parses_real_compute_apps_with_na_memory() {
        // Ground-truthed live shape (winhub, 2026-07-07) — every row's
        // used_memory is the [N/A] sentinel (the real WDDM driver caveat).
        let csv = "25864, [N/A], C:\\Users\\redacted\\AppData\\Local\\Programs\\Ollama\\ollama.exe\n\
                   33940, [N/A], C:\\Users\\redacted\\Miniconda3\\envs\\svcvec\\python.exe";
        let procs = parse_gpu_processes(csv);
        assert_eq!(procs.len(), 2);
        assert_eq!(procs[0].pid, 25864);
        assert_eq!(procs[0].used_memory_mb, None, "[N/A] must degrade to None, never 0");
        assert!(procs[0].process_path.ends_with("ollama.exe"));
    }

    #[test]
    fn parses_compute_apps_with_reported_memory() {
        let csv = "111, 4536, C:\\Projects\\higgs-audio\\venv\\Scripts\\python.exe";
        let procs = parse_gpu_processes(csv);
        assert_eq!(procs.len(), 1);
        assert_eq!(procs[0].used_memory_mb, Some(4536));
    }

    #[test]
    fn blank_lines_are_skipped() {
        let csv = "\n111, 100, C:\\a.exe\n\n";
        assert_eq!(parse_gpu_processes(csv).len(), 1);
    }

    #[test]
    fn malformed_line_is_skipped_not_panicking() {
        let csv = "not,even,close,to,valid\n111, 100, C:\\a.exe";
        let procs = parse_gpu_processes(csv);
        assert_eq!(procs.len(), 1, "the one valid line still parses despite a garbage sibling");
    }

    // ── Ollama /api/ps parsing ─────────────────────────────────────────

    #[test]
    fn parses_ollama_ps_loaded_model() {
        let body = r#"{"models":[{"name":"qwen2.5-coder:7b-instruct-q4_K_M","model":"qwen2.5-coder:7b-instruct-q4_K_M","size":5527585920,"digest":"dae161e2","details":{},"expires_at":"2026-07-07T17:10:00Z","size_vram":5527585920}]}"#;
        let loaded = parse_ollama_ps(body).expect("parses");
        assert_eq!(loaded.len(), 1);
        assert_eq!(loaded[0].0, "qwen2.5-coder:7b-instruct-q4_K_M");
        assert_eq!(loaded[0].1, Some(5527585920));
        assert_eq!(loaded[0].2.as_deref(), Some("2026-07-07T17:10:00Z"));
    }

    #[test]
    fn parses_ollama_ps_idle_as_empty_not_error() {
        // Ground-truthed live shape (winhub, 2026-07-07) — nothing loaded.
        let loaded = parse_ollama_ps(r#"{"models":[]}"#).expect("parses");
        assert!(loaded.is_empty());
    }

    #[test]
    fn ollama_ps_malformed_json_is_an_error() {
        assert!(parse_ollama_ps("not json").is_err());
    }

    // ── Path-target correlation ────────────────────────────────────────

    #[test]
    fn matches_ollama_by_filename_never_by_personal_path() {
        // Even though the real path embeds a username, matching is by
        // filename only — the personal fragment is never part of the match
        // pattern (module docs / PII-gate discipline).
        let t = match_process_to_target("C:\\Users\\anyone\\AppData\\Local\\Programs\\Ollama\\ollama.exe");
        assert_eq!(t.map(|t| t.service_id), Some("ollama"));
    }

    #[test]
    fn matches_ollama_llama_server_variant() {
        let t = match_process_to_target("C:\\Users\\anyone\\AppData\\Local\\Programs\\Ollama\\ollama_llama_server.exe");
        assert_eq!(t.map(|t| t.service_id), Some("ollama"));
    }

    #[test]
    fn matches_tts_backend_by_shared_cwd() {
        let t = match_process_to_target("C:\\Projects\\higgs-audio\\venv\\Scripts\\python.exe");
        assert_eq!(t.map(|t| t.service_id), Some("tts-backend"));
    }

    #[test]
    fn matches_comfyui_by_shared_cwd() {
        let t = match_process_to_target("C:\\Projects\\ComfyUI\\venv\\python.exe");
        assert_eq!(t.map(|t| t.service_id), Some("comfyui"));
    }

    #[test]
    fn unrelated_process_matches_nothing() {
        let t = match_process_to_target("C:\\Windows\\System32\\dwm.exe");
        assert!(t.is_none());
    }

    #[test]
    fn matching_is_case_insensitive() {
        let t = match_process_to_target("C:\\PROJECTS\\COMFYUI\\PYTHON.EXE");
        assert_eq!(t.map(|t| t.service_id), Some("comfyui"));
    }

    // ── Timestamp helper ────────────────────────────────────────────────

    #[test]
    fn epoch_to_iso_known_value() {
        assert_eq!(epoch_to_iso(0), "1970-01-01T00:00:00Z");
    }

    // ── Serde wire-shape guards (frontend contract) ─────────────────────

    #[test]
    fn residency_status_serialises_camel_case() {
        assert_eq!(serde_json::to_string(&ResidencyStatus::Unreachable).unwrap(), "\"unreachable\"");
        assert_eq!(serde_json::to_string(&ResidencyStatus::Unknown).unwrap(), "\"unknown\"");
        assert_eq!(serde_json::to_string(&ResidencyStatus::Loaded).unwrap(), "\"loaded\"");
        assert_eq!(serde_json::to_string(&ResidencyStatus::Idle).unwrap(), "\"idle\"");
    }

    #[test]
    fn gpu_headline_field_names_are_camel_case() {
        let h = GpuHeadline { total_vram_mb: 1, used_vram_mb: 2, free_vram_mb: 3 };
        let v = serde_json::to_value(&h).unwrap();
        assert!(v.get("totalVramMb").is_some());
        assert!(v.get("usedVramMb").is_some());
        assert!(v.get("freeVramMb").is_some());
    }
}
