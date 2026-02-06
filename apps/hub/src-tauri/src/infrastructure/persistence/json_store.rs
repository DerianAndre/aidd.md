use std::fs;
use std::path::{Path, PathBuf};

use crate::domain::ports::outbound::{HubData, ProjectRepository};

/// JSON file-based persistence for `~/.aidd/hub.json`.
pub struct JsonStore {
    path: PathBuf,
}

impl JsonStore {
    pub fn new() -> Result<Self, String> {
        let home = dirs::home_dir()
            .ok_or_else(|| "Could not determine home directory".to_string())?;
        let aidd_dir = home.join(".aidd");

        // Create ~/.aidd/ if it doesn't exist
        if !aidd_dir.exists() {
            fs::create_dir_all(&aidd_dir)
                .map_err(|e| format!("Failed to create ~/.aidd/: {}", e))?;
        }

        Ok(Self {
            path: aidd_dir.join("hub.json"),
        })
    }

    /// Returns the `~/.aidd/` directory path.
    pub fn aidd_dir(&self) -> &Path {
        self.path.parent().unwrap()
    }
}

impl ProjectRepository for JsonStore {
    fn load(&self) -> Result<HubData, String> {
        if !self.path.exists() {
            return Ok(HubData::default());
        }

        let content = fs::read_to_string(&self.path)
            .map_err(|e| format!("Failed to read hub.json: {}", e))?;

        if content.trim().is_empty() {
            return Ok(HubData::default());
        }

        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse hub.json: {}", e))
    }

    fn save(&self, data: &HubData) -> Result<(), String> {
        let content = serde_json::to_string_pretty(data)
            .map_err(|e| format!("Failed to serialize hub data: {}", e))?;

        fs::write(&self.path, content)
            .map_err(|e| format!("Failed to write hub.json: {}", e))
    }
}
