use std::sync::Arc;

use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

use crate::app_settings::{AppSettings, AppSettingsState};
use crate::capture_bridge::CaptureBridgeState;
use crate::db::{self, DbError, DbState};
use crate::models::{
    BookmarkInput, BookmarkQuery, BookmarkWithRelations, CaptureBridgeStatus, ExportPayload,
    Folder, Highlight, HighlightInput, Tag, UpdateBookmarkInput, UpdateHighlightInput,
};

fn db_err(e: DbError) -> String {
    match e {
        DbError::NotFound => "Bookmark not found".to_string(),
        DbError::Validation(s) => s,
        DbError::Sqlite(e) => format!("Database error: {e}"),
    }
}

#[tauri::command]
pub fn create_bookmark(
    state: State<'_, Arc<DbState>>,
    input: BookmarkInput,
) -> Result<BookmarkWithRelations, String> {
    db::create_bookmark(state.inner(), input).map_err(db_err)
}

#[tauri::command]
pub fn get_bookmarks(
    state: State<'_, Arc<DbState>>,
    query: BookmarkQuery,
) -> Result<Vec<BookmarkWithRelations>, String> {
    db::get_bookmarks(state.inner(), query).map_err(db_err)
}

#[tauri::command]
pub fn get_bookmark(
    state: State<'_, Arc<DbState>>,
    id: String,
) -> Result<BookmarkWithRelations, String> {
    db::get_bookmark(state.inner(), &id).map_err(db_err)
}

#[tauri::command]
pub fn update_bookmark(
    state: State<'_, Arc<DbState>>,
    input: UpdateBookmarkInput,
) -> Result<BookmarkWithRelations, String> {
    db::update_bookmark(state.inner(), input).map_err(db_err)
}

#[tauri::command]
pub fn delete_bookmark(state: State<'_, Arc<DbState>>, id: String) -> Result<(), String> {
    db::delete_bookmark(state.inner(), &id).map_err(db_err)
}

#[tauri::command]
pub fn archive_bookmark(
    state: State<'_, Arc<DbState>>,
    id: String,
) -> Result<BookmarkWithRelations, String> {
    db::archive_bookmark(state.inner(), &id).map_err(db_err)
}

#[tauri::command]
pub fn unarchive_bookmark(
    state: State<'_, Arc<DbState>>,
    id: String,
) -> Result<BookmarkWithRelations, String> {
    db::unarchive_bookmark(state.inner(), &id).map_err(db_err)
}

#[tauri::command]
pub fn toggle_favorite(
    state: State<'_, Arc<DbState>>,
    id: String,
) -> Result<BookmarkWithRelations, String> {
    db::toggle_favorite(state.inner(), &id).map_err(db_err)
}

#[tauri::command]
pub fn get_tags(state: State<'_, Arc<DbState>>) -> Result<Vec<Tag>, String> {
    db::get_tags(state.inner()).map_err(db_err)
}

#[tauri::command]
pub fn get_folders(state: State<'_, Arc<DbState>>) -> Result<Vec<Folder>, String> {
    db::get_folders(state.inner()).map_err(db_err)
}

#[tauri::command]
pub fn export_bookmarks_json(state: State<'_, Arc<DbState>>) -> Result<String, String> {
    let payload: ExportPayload = db::export_all(state.inner()).map_err(db_err)?;
    serde_json::to_string_pretty(&payload).map_err(|e| format!("JSON error: {e}"))
}

#[tauri::command]
pub fn get_capture_bridge_status(
    bridge: State<'_, CaptureBridgeState>,
) -> CaptureBridgeStatus {
    bridge.status()
}

#[tauri::command]
pub fn get_app_settings(state: State<'_, AppSettingsState>) -> AppSettings {
    state.get()
}

#[tauri::command]
pub async fn save_app_settings(
    app: AppHandle,
    state: State<'_, AppSettingsState>,
    settings: AppSettings,
) -> Result<(), String> {
    #[cfg(desktop)]
    crate::tray::sync_autostart(&app, settings.start_with_windows).await?;
    state.save(settings)
}

#[tauri::command]
pub fn is_autostart_enabled(app: AppHandle) -> Result<bool, String> {
    #[cfg(desktop)]
    {
        return crate::tray::autostart_is_enabled(&app);
    }
    #[cfg(not(desktop))]
    {
        let _ = app;
        Ok(false)
    }
}

#[tauri::command]
pub async fn save_export_json(
    app: AppHandle,
    state: State<'_, Arc<DbState>>,
) -> Result<String, String> {
    let payload: ExportPayload = db::export_all(state.inner()).map_err(db_err)?;
    let json = serde_json::to_string_pretty(&payload).map_err(|e| format!("JSON error: {e}"))?;
    let path = app
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .set_file_name("marknest-export.json")
        .blocking_save_file();
    match path {
        Some(file_path) => {
            let path_buf = file_path.into_path().map_err(|e| e.to_string())?;
            std::fs::write(&path_buf, &json).map_err(|e| format!("Write failed: {e}"))?;
            Ok(path_buf.to_string_lossy().to_string())
        }
        None => Err("Export cancelled".into()),
    }
}

#[tauri::command]
pub fn get_highlights(
    state: State<'_, Arc<DbState>>,
    bookmark_id: String,
) -> Result<Vec<Highlight>, String> {
    db::get_highlights_for_bookmark(state.inner(), &bookmark_id).map_err(db_err)
}

#[tauri::command]
pub fn create_highlight(
    state: State<'_, Arc<DbState>>,
    input: HighlightInput,
) -> Result<Highlight, String> {
    db::create_highlight_entry(state.inner(), input).map_err(db_err)
}

#[tauri::command]
pub fn update_highlight(
    state: State<'_, Arc<DbState>>,
    input: UpdateHighlightInput,
) -> Result<Highlight, String> {
    db::update_highlight_entry(state.inner(), input).map_err(db_err)
}

#[tauri::command]
pub fn delete_highlight(state: State<'_, Arc<DbState>>, id: String) -> Result<(), String> {
    db::delete_highlight_entry(state.inner(), &id).map_err(db_err)
}

#[tauri::command]
pub async fn backup_database(
    app: AppHandle,
    state: State<'_, Arc<DbState>>,
) -> Result<String, String> {
    let src = state.inner().db_path();
    let path = app
        .dialog()
        .file()
        .add_filter("SQLite database", &["db"])
        .set_file_name("marknest-backup.db")
        .blocking_save_file();
    match path {
        Some(file_path) => {
            let dest = file_path.into_path().map_err(|e| e.to_string())?;
            std::fs::copy(&src, &dest).map_err(|e| format!("Backup failed: {e}"))?;
            Ok(dest.to_string_lossy().to_string())
        }
        None => Err("Backup cancelled".into()),
    }
}

#[tauri::command]
pub async fn open_external_url(app: AppHandle, url: String) -> Result<(), String> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Err("URL is empty".into());
    }
    app.opener()
        .open_url(trimmed, None::<&str>)
        .map_err(|e| format!("Failed to open URL: {e}"))
}
