mod commands;
mod tray;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_devices,
            commands::get_services,
            commands::get_system_stats,
            commands::get_local_services,
            commands::get_projects,
            commands::check_updates,
            commands::restart_service,
            commands::graceful_shutdown,
            commands::collect_logs,
            commands::open_in_editor,
        ])
        .setup(|app| {
            tray::setup(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Tender");
}
