use crate::{devices, telemetry};

#[tauri::command]
pub fn get_appearance(window: tauri::WebviewWindow) -> String {
    #[cfg(target_os = "macos")]
    {
        use tauri::Theme;
        match window.theme().unwrap_or(Theme::Dark) {
            Theme::Light => "light".to_string(),
            _ => "dark".to_string(),
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = window;
        "dark".to_string()
    }
}

#[tauri::command]
pub async fn get_services() -> Vec<telemetry::HarborlineService> {
    telemetry::get_services().await
}

#[tauri::command]
pub async fn get_system_stats() -> telemetry::SystemStats {
    telemetry::get_system_stats().await
}

#[tauri::command]
pub async fn get_local_services() -> Vec<telemetry::LocalService> {
    telemetry::get_local_services().await
}

#[tauri::command]
pub async fn get_devices() -> Vec<devices::TailscaleDevice> {
    devices::get_devices().await
}
