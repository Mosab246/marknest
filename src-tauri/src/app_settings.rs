use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(default = "default_true")]
    pub close_to_tray: bool,
    #[serde(default)]
    pub start_with_windows: bool,
    #[serde(default)]
    pub start_minimized_to_tray: bool,
}

fn default_true() -> bool {
    true
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            close_to_tray: true,
            start_with_windows: false,
            start_minimized_to_tray: false,
        }
    }
}

pub struct AppSettingsState {
    path: PathBuf,
    pub settings: Mutex<AppSettings>,
}

impl AppSettingsState {
    pub fn new(data_dir: &Path) -> Self {
        let path = data_dir.join("settings.json");
        let settings = load_from_path(&path);
        Self {
            path,
            settings: Mutex::new(settings),
        }
    }

    pub fn get(&self) -> AppSettings {
        self.settings.lock().unwrap().clone()
    }

    pub fn save(&self, settings: AppSettings) -> Result<(), String> {
        let json = serde_json::to_string_pretty(&settings)
            .map_err(|e| format!("Failed to serialize settings: {e}"))?;
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create settings directory: {e}"))?;
        }
        fs::write(&self.path, json).map_err(|e| format!("Failed to write settings: {e}"))?;
        *self.settings.lock().unwrap() = settings;
        Ok(())
    }
}

fn load_from_path(path: &Path) -> AppSettings {
    if !path.exists() {
        return AppSettings::default();
    }
    match fs::read_to_string(path) {
        Ok(raw) => serde_json::from_str(&raw).unwrap_or_default(),
        Err(_) => AppSettings::default(),
    }
}
