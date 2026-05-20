use tauri::{
    image::Image,
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Manager, Runtime,
};

pub fn setup<R: Runtime>(app: &tauri::App<R>) -> tauri::Result<()> {
    let icon = load_tray_icon(app)?;

    TrayIconBuilder::with_id("tender-tray")
        .icon(icon)
        .tooltip("Tender")
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, .. } = event {
                toggle_panel(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

fn toggle_panel<R: Runtime>(app: &tauri::AppHandle<R>) {
    let Some(panel) = app.get_webview_window("panel") else { return };

    if panel.is_visible().unwrap_or(false) {
        let _ = panel.hide();
    } else {
        let _ = panel.show();
        let _ = panel.set_focus();
        // Frontend positions itself via set_position on mount / show.
        // Emit an event so React can reposition if it was already mounted.
        let _ = app.emit("panel-shown", ());
    }
}

fn load_tray_icon<R: Runtime>(app: &tauri::App<R>) -> tauri::Result<Image<'static>> {
    // Use the bundled resource if present; fall back to the default app icon.
    let resource = app
        .path()
        .resource_dir()
        .ok()
        .map(|d| d.join("icons/tray.png"))
        .filter(|p| p.exists());

    match resource {
        Some(path) => {
            Image::from_path(path).map_err(|e| tauri::Error::Io(std::io::Error::other(e.to_string())))
        }
        None => app
            .default_window_icon()
            .cloned()
            .ok_or_else(|| tauri::Error::Io(std::io::Error::other("no default icon"))),
    }
}
