use std::path::Path;
use crate::domain::model::{IntegrationConfig, IntegrationResult, IntegrationType};

/// Infrastructure trait — each AI tool adapter implements this.
pub(crate) trait ToolAdapter: Send + Sync {
    fn tool_type(&self) -> IntegrationType;
    fn integrate(&self, project_path: &Path, framework_path: &Path) -> Result<IntegrationResult, String>;
    fn remove(&self, project_path: &Path) -> Result<IntegrationResult, String>;
    fn check(&self, project_path: &Path) -> Result<IntegrationConfig, String>;
}

/// Helper: ensure a file exists, creating parent dirs and writing content if missing.
/// Returns `Some(path_str)` if the file was created, `None` if it already existed.
pub(crate) fn ensure_file(path: &Path, content: &str) -> Result<Option<String>, String> {
    if path.exists() {
        return Ok(None);
    }
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create dir {}: {}", parent.display(), e))?;
    }
    std::fs::write(path, content)
        .map_err(|e| format!("Failed to write {}: {}", path.display(), e))?;
    Ok(Some(path.to_string_lossy().to_string()))
}

/// Helper: read a JSON file, returning a default Value if it doesn't exist.
pub(crate) fn read_json_or_default(path: &Path) -> Result<serde_json::Value, String> {
    if !path.exists() {
        return Ok(serde_json::json!({}));
    }
    let content = std::fs::read_to_string(path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse {}: {}", path.display(), e))
}

/// Helper: write a JSON value to a file (pretty-printed), creating parent dirs.
pub(crate) fn write_json(path: &Path, value: &serde_json::Value) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create dir {}: {}", parent.display(), e))?;
    }
    let content = serde_json::to_string_pretty(value)
        .map_err(|e| format!("Failed to serialize JSON: {}", e))?;
    std::fs::write(path, content)
        .map_err(|e| format!("Failed to write {}: {}", path.display(), e))
}

/// Helper: remove a file if it exists. Returns true if removed.
pub(crate) fn remove_file_if_exists(path: &Path) -> Result<bool, String> {
    if path.exists() {
        std::fs::remove_file(path)
            .map_err(|e| format!("Failed to remove {}: {}", path.display(), e))?;
        Ok(true)
    } else {
        Ok(false)
    }
}
