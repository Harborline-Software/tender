use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use tauri_plugin_positioner::{Position, WindowExt};

pub mod autostart;
pub mod bundles;
pub mod catalog;
mod commands;
mod devices;
pub mod install;
pub mod install_config;
pub mod inventory;
pub mod paidcompute;
mod notifications;
pub mod probe;
pub mod profile;
pub mod provider_health;
mod projects;
pub mod residency;
pub mod settings;
mod telemetry;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_positioner::init())
        .manage(notifications::NotificationState::new())
        .setup(|app| {
            // Menu-bar accessory mode: no Dock icon, app never becomes the
            // foreground app. The panel window is the only visible surface.
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // Identity-rename migration (Tender → Harborline Toolbox): if a
            // prior install left an auto-start LaunchAgent pointing at the
            // OLD `.app` path, repoint it at this install so auto-start
            // keeps working instead of silently going stale. No-op once
            // already migrated, and no-op when auto-start isn't enabled.
            #[cfg(target_os = "macos")]
            if let Ok(exe) = std::env::current_exe() {
                match autostart::migrate_program_path(&exe.to_string_lossy()) {
                    Ok(true) => eprintln!(
                        "[autostart] migrated LaunchAgent program path to {}",
                        exe.display()
                    ),
                    Ok(false) => {}
                    Err(e) => eprintln!("[autostart] migration check failed (non-fatal): {e}"),
                }
            }

            let handle = app.handle().clone();

            TrayIconBuilder::new()
                .icon(app.default_window_icon().cloned().unwrap())
                .tooltip("Harborline Toolbox")
                .on_tray_icon_event(move |tray, event| {
                    // The positioner plugin must capture every tray event so it
                    // can track the icon's screen rect. Without this call,
                    // move_window(Position::TrayCenter) panics with "Tray position
                    // not set".
                    tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);

                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let window = handle.get_webview_window("main").unwrap();
                        if window.is_visible().unwrap_or(false) {
                            let _ = window.hide();
                        } else {
                            let _ = window.move_window(Position::TrayCenter);
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Keep the main window hidden until the tray icon is clicked.
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }

            // Background task: watch service health and fire macOS notifications
            // on state transitions (running→stopped, stopped→running, any→error).
            notifications::spawn_notification_watcher(app.handle().clone());

            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                // Close the panel when it loses keyboard focus (click outside).
                tauri::WindowEvent::Focused(false) => {
                    if window.label() == "main" {
                        let _ = window.hide();
                    }
                }
                // Notify the frontend when the system appearance flips so it
                // can re-read get_appearance() and re-theme without a reload.
                tauri::WindowEvent::ThemeChanged(theme) => {
                    use tauri::Theme;
                    let appearance = match theme {
                        Theme::Light => "light",
                        _ => "dark",
                    };
                    let _ = window.emit("appearance-changed", appearance);
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_appearance,
            commands::get_services,
            commands::get_fleet,
            commands::get_system_stats,
            commands::get_local_services,
            commands::get_devices,
            commands::open_external,
            commands::quit_app,
            commands::emergency_stop,
            commands::restart_signal_bridge,
            commands::collect_diagnostics,
            commands::get_log_tail,
            commands::get_bundle_manifests,
            commands::get_plugin_health,
            commands::get_live_provider_health,
            commands::get_projects,
            commands::probe_hardware,
            commands::recommend_profile,
            commands::get_install_config,
            commands::install_app_local,
            commands::launch_app,
            commands::set_autostart,
            commands::get_autostart,
            commands::get_settings,
            commands::set_mode,
            commands::get_model_inventory,
            commands::get_gpu_residency,
            commands::get_paid_compute,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Harborline Toolbox");
}
