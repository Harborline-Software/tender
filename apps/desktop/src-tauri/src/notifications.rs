use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};

use crate::telemetry;

const POLL_INTERVAL_SECS: u64 = 15;
const SILENCE_WINDOW_SECS: u64 = 60;

pub struct NotificationState {
    prev_statuses: Mutex<HashMap<String, String>>,
    last_notified: Mutex<HashMap<String, Instant>>,
}

impl NotificationState {
    pub fn new() -> Self {
        Self {
            prev_statuses: Mutex::new(HashMap::new()),
            last_notified: Mutex::new(HashMap::new()),
        }
    }
}

pub fn spawn_notification_watcher(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(POLL_INTERVAL_SECS)).await;
            check_services(&app).await;
        }
    });
}

async fn check_services(app: &AppHandle) {
    let services = telemetry::get_services().await;
    let state = app.state::<NotificationState>();

    let mut prev = state.prev_statuses.lock().unwrap();
    let mut last = state.last_notified.lock().unwrap();

    for svc in &services {
        let current = svc.status.to_lowercase();

        if let Some(previous) = prev.get(&svc.id) {
            if *previous == current {
                prev.insert(svc.id.clone(), current);
                continue;
            }

            let silence_key = format!("{}:{}", svc.id, current);
            let now = Instant::now();
            let silenced = last
                .get(&silence_key)
                .map(|t| now.duration_since(*t).as_secs() < SILENCE_WINDOW_SECS)
                .unwrap_or(false);

            if !silenced {
                if let Some((title, body)) =
                    build_notification(&svc.display_name, previous, &current)
                {
                    fire_notification(app, &title, &body);
                    last.insert(silence_key, now);
                }
            }
        }

        prev.insert(svc.id.clone(), current);
    }
}

fn build_notification(name: &str, prev: &str, next: &str) -> Option<(String, String)> {
    match (prev, next) {
        ("running", "stopped")
        | ("running", "error")
        | ("degraded", "stopped")
        | ("degraded", "error") => Some((
            format!("{name} stopped"),
            format!("{name} is no longer reachable."),
        )),
        (_, "error") => Some((
            format!("{name} error"),
            format!("{name} reported an error."),
        )),
        ("stopped", "running") | ("error", "running") => {
            Some((format!("{name} online"), format!("{name} is now running.")))
        }
        ("running", "degraded") => Some((
            format!("{name} degraded"),
            format!("{name} performance is degraded."),
        )),
        _ => None,
    }
}

fn fire_notification(app: &AppHandle, title: &str, body: &str) {
    use tauri_plugin_notification::NotificationExt;
    let _ = app.notification().builder().title(title).body(body).show();
}
