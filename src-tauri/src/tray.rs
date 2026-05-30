use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, RunEvent, WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;

use crate::app_settings::{AppSettings, AppSettingsState};
use crate::capture_bridge::{CaptureBridgeState, DEFAULT_PORT};

pub static QUIT_REQUESTED: AtomicBool = AtomicBool::new(false);

pub fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let bridge_label = bridge_status_menu_text(&app.state::<CaptureBridgeState>());

    let open_i = MenuItem::with_id(app, "open", "Open MarkNest", true, None::<&str>)?;
    let bridge_i = MenuItem::with_id(app, "bridge_status", &bridge_label, false, None::<&str>)?;
    let settings_i = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit MarkNest", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;

    let menu = Menu::with_items(app, &[&open_i, &bridge_i, &sep, &settings_i, &sep, &quit_i])?;

    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or("Missing default window icon")?;

    let _tray = TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .tooltip("MarkNest")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => {
                show_main_window(app);
            }
            "settings" => {
                show_main_window(app);
                let _ = app.emit("navigate-settings", ());
            }
            "quit" => {
                QUIT_REQUESTED.store(true, Ordering::SeqCst);
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

pub fn bridge_status_menu_text(bridge: &CaptureBridgeState) -> String {
    let running = *bridge.running.lock().unwrap();
    if running {
        format!("Bridge: Running on 127.0.0.1:{DEFAULT_PORT}")
    } else {
        let err = bridge.last_error.lock().unwrap();
        if err.is_some() {
            format!("Bridge: Error on 127.0.0.1:{DEFAULT_PORT}")
        } else {
            format!("Bridge: Offline (127.0.0.1:{DEFAULT_PORT})")
        }
    }
}

pub fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

pub fn apply_startup_visibility(app: &AppHandle, settings: &AppSettings) {
    if settings.start_minimized_to_tray {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.hide();
        }
    }
}

pub fn on_window_event(window: &tauri::Window, event: &WindowEvent) {
    if let WindowEvent::CloseRequested { api, .. } = event {
        let app = window.app_handle();
        let settings_state = app.state::<AppSettingsState>();
        let settings = settings_state.get();
        if settings.close_to_tray && !QUIT_REQUESTED.load(Ordering::SeqCst) {
            api.prevent_close();
            let _ = window.hide();
        }
    }
}

pub fn on_run_event(app: &AppHandle, event: RunEvent) {
    if let RunEvent::ExitRequested { api, .. } = event {
        if !QUIT_REQUESTED.load(Ordering::SeqCst) {
            let settings = app.state::<AppSettingsState>().get();
            if settings.close_to_tray {
                api.prevent_exit();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
        }
    }
}

pub async fn sync_autostart(app: &AppHandle, enable: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;

    let autostart = app.autolaunch();
    if enable {
        autostart.enable().map_err(|e| e.to_string())?;
    } else {
        autostart.disable().map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn autostart_is_enabled(app: &AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().is_enabled().map_err(|e| e.to_string())
}

pub fn init_autostart_plugin<R: tauri::Runtime>(
    builder: tauri::Builder<R>,
) -> tauri::Builder<R> {
    builder.plugin(tauri_plugin_autostart::init(
        MacosLauncher::LaunchAgent,
        Some(vec!["--minimized"]),
    ))
}
