//! Read-only Fleet Coordinator visibility plus shared client-URL configuration.
//!
//! Tender is a cockpit, not a scheduler. It reads the same node-local
//! `~/.config/harborline/coordinator.json` used by Ordinance clients, probes the
//! authenticated status endpoint, and never sends the bearer token to the webview.

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::path::{Path, PathBuf};
use std::time::Duration;

const CONFIG_ENV: &str = "HARBORLINE_COORDINATOR_CONFIG";
const URL_ENV: &str = "HARBORLINE_COORDINATOR_URL";
const TOKEN_ENV: &str = "HARBORLINE_COORDINATOR_TOKEN";
const TOKEN_FILE_ENV: &str = "HARBORLINE_COORDINATOR_TOKEN_FILE";
const DEFAULT_TIMEOUT_MS: u64 = 10_000;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum FleetCoordinatorState {
    Online,
    Unreachable,
    AuthRequired,
    Degraded,
    NotConfigured,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FleetCoordinatorConnection {
    pub saved_url: Option<String>,
    pub effective_url: Option<String>,
    pub source: String,
    pub token_configured: bool,
    pub detail: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FleetCoordinatorStatus {
    pub state: FleetCoordinatorState,
    pub url: Option<String>,
    pub detail: String,
    pub authority_id: Option<String>,
    pub epoch: Option<u64>,
    pub revision: Option<u64>,
    pub queued_assignments: u64,
    pub claimed_assignments: u64,
    pub active_attempts: u64,
    pub reporting_nodes: u64,
    pub details_available: bool,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FileConfig {
    url: Option<String>,
    token_file: Option<String>,
    token: Option<String>,
    timeout_ms: Option<u64>,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LocalRuntimeConfig {
    host: Option<String>,
    port: Option<u16>,
    token_file: Option<String>,
}

struct EffectiveConfig {
    url: String,
    token: Option<String>,
    timeout_ms: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CoordinatorHealthPayload {
    status: String,
    authority_id: String,
    epoch: u64,
    revision: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CoordinatorStatusPayload {
    authority_id: String,
    epoch: u64,
    revision: u64,
    #[serde(default)]
    assignments: Vec<AssignmentPayload>,
    #[serde(default)]
    attempts: Vec<AttemptPayload>,
    #[serde(default)]
    nodes: Vec<Value>,
}

#[derive(Deserialize)]
struct AssignmentPayload {
    state: String,
}

#[derive(Deserialize)]
struct AttemptPayload {
    state: String,
}

fn home_dir() -> Option<PathBuf> {
    crate::platform::home_dir()
}

fn config_path() -> Option<PathBuf> {
    std::env::var(CONFIG_ENV)
        .ok()
        .map(PathBuf::from)
        .or_else(|| home_dir().map(|home| home.join(".config/harborline/coordinator.json")))
}

fn expand_home(value: &str) -> PathBuf {
    if value == "~" {
        return home_dir().unwrap_or_else(|| PathBuf::from(value));
    }
    if let Some(rest) = value.strip_prefix("~/") {
        if let Some(home) = home_dir() {
            return home.join(rest);
        }
    }
    PathBuf::from(value)
}

fn read_file_config() -> Result<FileConfig, String> {
    let Some(path) = config_path() else {
        return Ok(FileConfig::default());
    };
    match std::fs::read_to_string(&path) {
        Ok(text) => serde_json::from_str(&text)
            .map_err(|error| format!("Coordinator settings are invalid: {error}")),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(FileConfig::default()),
        Err(error) => Err(format!("Could not read coordinator settings: {error}")),
    }
}

fn local_runtime_path() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        return std::env::var_os("PROGRAMDATA")
            .filter(|value| !value.is_empty())
            .map(PathBuf::from)
            .map(|root| {
                root.join("Harborline")
                    .join("FleetCoordinator")
                    .join("runtime.json")
            });
    }

    #[cfg(not(target_os = "windows"))]
    None
}

fn runtime_file_config(runtime: LocalRuntimeConfig) -> Result<Option<FileConfig>, String> {
    let Some(host) = runtime.host.map(|value| value.trim().to_string()) else {
        return Ok(None);
    };
    if host.is_empty() {
        return Ok(None);
    }
    let Some(port) = runtime.port else {
        return Ok(None);
    };
    let host = if host.contains(':') && !host.starts_with('[') {
        format!("[{host}]")
    } else {
        host
    };
    let url = normalize_base_url(Some(&format!("http://{host}:{port}")))?;
    Ok(url.map(|url| FileConfig {
        url: Some(url),
        token_file: runtime.token_file,
        token: None,
        timeout_ms: None,
    }))
}

fn read_local_runtime_config() -> Result<Option<FileConfig>, String> {
    let Some(path) = local_runtime_path() else {
        return Ok(None);
    };
    let text = match std::fs::read_to_string(&path) {
        Ok(text) => text,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => {
            return Err(format!(
                "Could not read local Fleet Coordinator runtime settings: {error}"
            ))
        }
    };
    let runtime: LocalRuntimeConfig = serde_json::from_str(&text).map_err(|error| {
        format!("Local Fleet Coordinator runtime settings are invalid: {error}")
    })?;
    runtime_file_config(runtime)
}

fn normalize_base_url(value: Option<&str>) -> Result<Option<String>, String> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    let mut parsed = url::Url::parse(value)
        .map_err(|_| "Fleet Coordinator must be a valid http or https URL.".to_string())?;
    if !matches!(parsed.scheme(), "http" | "https") || parsed.host_str().is_none() {
        return Err("Fleet Coordinator must be a valid http or https URL.".into());
    }
    if !parsed.username().is_empty() || parsed.password().is_some() {
        return Err("Fleet Coordinator URL must not contain credentials.".into());
    }
    if parsed.path() != "/" || parsed.query().is_some() || parsed.fragment().is_some() {
        return Err(
            "Fleet Coordinator URL must contain only scheme, host, and optional port.".into(),
        );
    }
    parsed.set_path("");
    Ok(Some(parsed.to_string().trim_end_matches('/').to_string()))
}

fn token_from(config: &FileConfig) -> Option<String> {
    if let Ok(value) = std::env::var(TOKEN_ENV) {
        if !value.trim().is_empty() {
            return Some(value.trim().to_string());
        }
    }
    let token_file = std::env::var(TOKEN_FILE_ENV)
        .ok()
        .or_else(|| config.token_file.clone());
    if let Some(path) = token_file {
        if let Ok(value) = std::fs::read_to_string(expand_home(&path)) {
            if !value.trim().is_empty() {
                return Some(value.trim().to_string());
            }
        }
    }
    config
        .token
        .clone()
        .filter(|value| !value.trim().is_empty())
}

fn effective_config() -> Result<Option<EffectiveConfig>, String> {
    let config = read_file_config()?;
    let environment_url = std::env::var(URL_ENV)
        .ok()
        .filter(|value| !value.trim().is_empty());
    let local = if environment_url.is_none() && config.url.is_none() {
        read_local_runtime_config()?
    } else {
        None
    };
    let url = environment_url
        .or_else(|| config.url.clone())
        .or_else(|| local.as_ref().and_then(|runtime| runtime.url.clone()));
    let Some(url) = normalize_base_url(url.as_deref())? else {
        return Ok(None);
    };
    let token = if let Some(runtime) = local.as_ref() {
        token_from(runtime)
    } else {
        token_from(&config)
    };
    Ok(Some(EffectiveConfig {
        url,
        token,
        timeout_ms: config
            .timeout_ms
            .unwrap_or(DEFAULT_TIMEOUT_MS)
            .clamp(1_000, 30_000),
    }))
}

pub fn connection() -> FleetCoordinatorConnection {
    let config = match read_file_config() {
        Ok(config) => config,
        Err(detail) => {
            return FleetCoordinatorConnection {
                saved_url: None,
                effective_url: None,
                source: "invalid".into(),
                token_configured: false,
                detail,
            };
        }
    };
    let saved_url = match normalize_base_url(config.url.as_deref()) {
        Ok(url) => url,
        Err(detail) => {
            return FleetCoordinatorConnection {
                saved_url: config.url,
                effective_url: None,
                source: "invalid".into(),
                token_configured: token_from(&config).is_some(),
                detail,
            };
        }
    };
    let environment_value = std::env::var(URL_ENV)
        .ok()
        .filter(|value| !value.trim().is_empty());
    let environment_url = match normalize_base_url(environment_value.as_deref()) {
        Ok(url) => url,
        Err(detail) => {
            return FleetCoordinatorConnection {
                saved_url,
                effective_url: None,
                source: "invalid".into(),
                token_configured: token_from(&config).is_some(),
                detail: format!("Session Fleet Coordinator URL is invalid: {detail}"),
            };
        }
    };
    let local = if environment_url.is_none() && saved_url.is_none() {
        match read_local_runtime_config() {
            Ok(local) => local,
            Err(detail) => {
                return FleetCoordinatorConnection {
                    saved_url,
                    effective_url: None,
                    source: "invalid".into(),
                    token_configured: false,
                    detail,
                }
            }
        }
    } else {
        None
    };
    let (effective_url, source, token_configured) = if let Some(url) = environment_url {
        (Some(url), "environment", token_from(&config).is_some())
    } else if let Some(url) = saved_url.clone() {
        (Some(url), "sharedSettings", token_from(&config).is_some())
    } else if let Some(runtime) = local.as_ref() {
        (
            runtime.url.clone(),
            "localService",
            token_from(runtime).is_some(),
        )
    } else {
        (None, "notConfigured", false)
    };
    let detail = match (&effective_url, token_configured, source) {
        (None, _, _) => {
            "Set the Fleet Coordinator URL; no device-specific default is assumed.".into()
        }
        (Some(_), false, "localService") => {
            "Local Fleet Coordinator discovered; health is visible without exposing its privileged token.".into()
        }
        (Some(_), false, _) => {
            "Health visibility is available; assignment details require a local token reference.".into()
        }
        (Some(_), true, "environment") => {
            "Effective URL is supplied by the session environment.".into()
        }
        (Some(_), true, "localService") => {
            "Local Fleet Coordinator and readable credential discovered.".into()
        }
        (Some(_), true, _) => "Effective URL is shared with Ordinance coordinator clients.".into(),
    };
    FleetCoordinatorConnection {
        saved_url,
        effective_url,
        source: source.into(),
        token_configured,
        detail,
    }
}

fn update_url_document(existing: Option<&str>, url: Option<String>) -> Result<String, String> {
    let mut object = match existing.map(str::trim).filter(|text| !text.is_empty()) {
        Some(text) => serde_json::from_str::<Value>(text)
            .map_err(|error| format!("Coordinator settings are invalid: {error}"))?
            .as_object()
            .cloned()
            .ok_or_else(|| "Coordinator settings must be a JSON object.".to_string())?,
        None => Map::new(),
    };
    object.entry("version").or_insert(Value::from(1));
    match url {
        Some(url) => {
            object.insert("url".into(), Value::String(url));
        }
        None => {
            object.remove("url");
        }
    }
    serde_json::to_string_pretty(&Value::Object(object))
        .map(|text| format!("{text}\n"))
        .map_err(|error| format!("Could not serialize coordinator settings: {error}"))
}

fn atomic_write(path: &Path, text: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| format!("Could not create coordinator settings directory: {error}"))?;
    }
    let temporary = path.with_extension(format!("json.tmp-{}", std::process::id()));
    std::fs::write(&temporary, text)
        .map_err(|error| format!("Could not write coordinator settings: {error}"))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&temporary, std::fs::Permissions::from_mode(0o600))
            .map_err(|error| format!("Could not protect coordinator settings: {error}"))?;
    }
    std::fs::rename(&temporary, path)
        .map_err(|error| format!("Could not replace coordinator settings: {error}"))
}

pub fn set_url(value: Option<String>) -> Result<FleetCoordinatorConnection, String> {
    let normalized = normalize_base_url(value.as_deref())?;
    let path =
        config_path().ok_or_else(|| "Could not resolve coordinator settings path.".to_string())?;
    let existing = match std::fs::read_to_string(&path) {
        Ok(text) => Some(text),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => None,
        Err(error) => return Err(format!("Could not read coordinator settings: {error}")),
    };
    let updated = update_url_document(existing.as_deref(), normalized)?;
    atomic_write(&path, &updated)?;
    Ok(connection())
}

fn empty_status(
    state: FleetCoordinatorState,
    url: Option<String>,
    detail: String,
) -> FleetCoordinatorStatus {
    FleetCoordinatorStatus {
        state,
        url,
        detail,
        authority_id: None,
        epoch: None,
        revision: None,
        queued_assignments: 0,
        claimed_assignments: 0,
        active_attempts: 0,
        reporting_nodes: 0,
        details_available: false,
    }
}

async fn health_only_status(
    client: &reqwest::Client,
    config: &EffectiveConfig,
) -> FleetCoordinatorStatus {
    let response = match client.get(format!("{}/health", config.url)).send().await {
        Ok(response) => response,
        Err(error) => {
            return empty_status(
                FleetCoordinatorState::Unreachable,
                Some(config.url.clone()),
                format!("Coordinator is unreachable: {error}"),
            )
        }
    };
    if !response.status().is_success() {
        return empty_status(
            FleetCoordinatorState::Degraded,
            Some(config.url.clone()),
            format!(
                "Coordinator health returned HTTP {}.",
                response.status().as_u16()
            ),
        );
    }
    let payload = match response.json::<CoordinatorHealthPayload>().await {
        Ok(payload) => payload,
        Err(error) => {
            return empty_status(
                FleetCoordinatorState::Degraded,
                Some(config.url.clone()),
                format!("Coordinator returned an invalid health document: {error}"),
            )
        }
    };
    if payload.status != "ok" {
        return empty_status(
            FleetCoordinatorState::Degraded,
            Some(config.url.clone()),
            format!("Coordinator reported health state {}.", payload.status),
        );
    }
    FleetCoordinatorStatus {
        state: FleetCoordinatorState::Online,
        url: Some(config.url.clone()),
        detail: "Single authority is reachable. Queue details remain protected by the local credential boundary.".into(),
        authority_id: Some(payload.authority_id),
        epoch: Some(payload.epoch),
        revision: Some(payload.revision),
        queued_assignments: 0,
        claimed_assignments: 0,
        active_attempts: 0,
        reporting_nodes: 0,
        details_available: false,
    }
}

pub async fn status() -> FleetCoordinatorStatus {
    let config = match effective_config() {
        Ok(Some(config)) => config,
        Ok(None) => {
            return empty_status(
                FleetCoordinatorState::NotConfigured,
                None,
                "Set the Fleet Coordinator URL in Dock Settings.".into(),
            );
        }
        Err(detail) => return empty_status(FleetCoordinatorState::Degraded, None, detail),
    };
    let client = match reqwest::Client::builder()
        .timeout(Duration::from_millis(config.timeout_ms))
        .build()
    {
        Ok(client) => client,
        Err(error) => {
            return empty_status(
                FleetCoordinatorState::Degraded,
                Some(config.url),
                format!("Could not prepare coordinator probe: {error}"),
            );
        }
    };
    let Some(token) = config.token.as_deref() else {
        return health_only_status(&client, &config).await;
    };
    let response = match client
        .get(format!("{}/v1/status", config.url))
        .bearer_auth(token)
        .send()
        .await
    {
        Ok(response) => response,
        Err(error) => {
            return empty_status(
                FleetCoordinatorState::Unreachable,
                Some(config.url),
                format!("Coordinator is unreachable: {error}"),
            );
        }
    };
    if response.status() == reqwest::StatusCode::UNAUTHORIZED {
        return empty_status(
            FleetCoordinatorState::AuthRequired,
            Some(config.url),
            "Coordinator rejected the local bearer token.".into(),
        );
    }
    if !response.status().is_success() {
        return empty_status(
            FleetCoordinatorState::Degraded,
            Some(config.url),
            format!("Coordinator returned HTTP {}.", response.status().as_u16()),
        );
    }
    let payload = match response.json::<CoordinatorStatusPayload>().await {
        Ok(payload) => payload,
        Err(error) => {
            return empty_status(
                FleetCoordinatorState::Degraded,
                Some(config.url),
                format!("Coordinator returned an invalid status document: {error}"),
            );
        }
    };
    let queued = payload
        .assignments
        .iter()
        .filter(|entry| entry.state == "queued")
        .count() as u64;
    let claimed = payload
        .assignments
        .iter()
        .filter(|entry| entry.state == "claimed")
        .count() as u64;
    let active = payload
        .attempts
        .iter()
        .filter(|entry| entry.state == "active")
        .count() as u64;
    FleetCoordinatorStatus {
        state: FleetCoordinatorState::Online,
        url: Some(config.url),
        detail: "Single authority is reachable and authenticated.".into(),
        authority_id: Some(payload.authority_id),
        epoch: Some(payload.epoch),
        revision: Some(payload.revision),
        queued_assignments: queued,
        claimed_assignments: claimed,
        active_attempts: active,
        reporting_nodes: payload.nodes.len() as u64,
        details_available: true,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn coordinator_url_is_a_credential_free_origin() {
        assert_eq!(
            normalize_base_url(Some(" http://coordinator.example:7788/ ")).unwrap(),
            Some("http://coordinator.example:7788".into())
        );
        assert!(normalize_base_url(Some("file:///tmp/coordinator")).is_err());
        assert!(normalize_base_url(Some("http://user:secret@coordinator.example/")).is_err());
        assert!(normalize_base_url(Some("http://coordinator.example/fleet/")).is_err());
    }

    #[test]
    fn url_update_preserves_token_reference_and_unknown_fields() {
        let existing =
            r#"{"version":1,"url":"http://old:7788","tokenFile":"~/token","future":true}"#;
        let updated = update_url_document(existing.into(), Some("http://new:7788".into())).unwrap();
        let value: Value = serde_json::from_str(&updated).unwrap();
        assert_eq!(value["url"], "http://new:7788");
        assert_eq!(value["tokenFile"], "~/token");
        assert_eq!(value["future"], true);
    }

    #[test]
    fn clearing_url_keeps_local_secret_configuration() {
        let existing = r#"{"version":1,"url":"http://old:7788","tokenFile":"~/token"}"#;
        let updated = update_url_document(existing.into(), None).unwrap();
        let value: Value = serde_json::from_str(&updated).unwrap();
        assert!(value.get("url").is_none());
        assert_eq!(value["tokenFile"], "~/token");
    }

    #[test]
    fn local_runtime_derives_an_origin_without_hardcoding_a_machine() {
        let config = runtime_file_config(LocalRuntimeConfig {
            host: Some("coordinator.internal".into()),
            port: Some(7788),
            token_file: Some("C:\\ProgramData\\Harborline\\token".into()),
        })
        .unwrap()
        .unwrap();
        assert_eq!(
            config.url.as_deref(),
            Some("http://coordinator.internal:7788")
        );
        assert_eq!(
            config.token_file.as_deref(),
            Some("C:\\ProgramData\\Harborline\\token")
        );
    }

    #[test]
    fn local_runtime_requires_both_host_and_port() {
        let config = runtime_file_config(LocalRuntimeConfig {
            host: Some("coordinator.internal".into()),
            port: None,
            token_file: None,
        })
        .unwrap();
        assert!(config.is_none());
    }
}
