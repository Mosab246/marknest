mod app_settings;
mod capture_bridge;
mod capture_quality;
mod commands;
mod db;
mod fts;
mod highlights;
mod migration;
mod models;
mod url_utils;

#[cfg(desktop)]
mod tray;

use std::sync::Arc;

use app_settings::AppSettingsState;
use capture_bridge::{CaptureBridgeState, DEFAULT_PORT};
use tauri::Manager;

use db::DbState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init());

    #[cfg(desktop)]
    {
        builder = tray::init_autostart_plugin(builder);
    }

    builder
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .map_err(|e| -> Box<dyn std::error::Error> { e.into() })?;
            let db_path = data_dir.join("marknest.db");
            let db_state = DbState::new(db_path)?;
            let db = Arc::new(db_state);

            let bridge_state = CaptureBridgeState::new(DEFAULT_PORT);
            match capture_bridge::start(db.clone(), bridge_state.clone()) {
                Ok(()) => {}
                Err(e) => {
                    log::error!("Capture bridge: {e}");
                    *bridge_state.last_error.lock().unwrap() = Some(e);
                }
            }

            let settings_state = AppSettingsState::new(&data_dir);
            let settings = settings_state.get();

            app.manage(db);
            app.manage(bridge_state);
            app.manage(settings_state);

            #[cfg(desktop)]
            {
                let app_handle = app.handle().clone();
                let autostart_on = settings.start_with_windows;
                tauri::async_runtime::spawn(async move {
                    let _ = tray::sync_autostart(&app_handle, autostart_on).await;
                });

                tray::setup_tray(app.handle())?;

                let minimized_arg = std::env::args().any(|a| a == "--minimized");
                if settings.start_minimized_to_tray || minimized_arg {
                    tray::apply_startup_visibility(app.handle(), &settings);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::create_bookmark,
            commands::get_bookmarks,
            commands::get_bookmark,
            commands::update_bookmark,
            commands::delete_bookmark,
            commands::archive_bookmark,
            commands::unarchive_bookmark,
            commands::toggle_favorite,
            commands::get_tags,
            commands::get_folders,
            commands::export_bookmarks_json,
            commands::save_export_json,
            commands::open_external_url,
            commands::get_capture_bridge_status,
            commands::get_app_settings,
            commands::save_app_settings,
            commands::is_autostart_enabled,
            commands::get_highlights,
            commands::create_highlight,
            commands::update_highlight,
            commands::delete_highlight,
            commands::backup_database,
        ])
        .on_window_event(|window, event| {
            #[cfg(desktop)]
            tray::on_window_event(window, event);
            #[cfg(not(desktop))]
            let _ = (window, event);
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app, event| {
            #[cfg(desktop)]
            tray::on_run_event(app, event);
            #[cfg(not(desktop))]
            let _ = (app, event);
        });
}
