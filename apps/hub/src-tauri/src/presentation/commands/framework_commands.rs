use tauri::State;

use crate::AppContext;
use crate::domain::model::{FrameworkEntity, SyncInfo};
use crate::domain::ports::inbound::FrameworkPort;

/// Get the resolved framework directory path (~/.aidd/framework/).
#[tauri::command]
pub async fn get_framework_path(
    ctx: State<'_, AppContext>,
) -> Result<String, String> {
    Ok(ctx.framework_service.get_path())
}

/// Get the current framework version.
#[tauri::command]
pub async fn get_framework_version(
    ctx: State<'_, AppContext>,
) -> Result<Option<String>, String> {
    ctx.framework_service.get_version()
}

/// List all entities in a framework category.
#[tauri::command]
pub async fn list_framework_entities(
    category: String,
    ctx: State<'_, AppContext>,
) -> Result<Vec<FrameworkEntity>, String> {
    ctx.framework_service.list_entities(&category)
}

/// Read a specific framework entity by category and name.
#[tauri::command]
pub async fn read_framework_entity(
    category: String,
    name: String,
    ctx: State<'_, AppContext>,
) -> Result<FrameworkEntity, String> {
    ctx.framework_service.read_entity(&category, &name)
}

/// Write (create or update) a framework entity.
#[tauri::command]
pub async fn write_framework_entity(
    category: String,
    name: String,
    content: String,
    ctx: State<'_, AppContext>,
) -> Result<(), String> {
    ctx.framework_service.write_entity(&category, &name, &content)
}

/// Delete a framework entity.
#[tauri::command]
pub async fn delete_framework_entity(
    category: String,
    name: String,
    ctx: State<'_, AppContext>,
) -> Result<(), String> {
    ctx.framework_service.delete_entity(&category, &name)
}

// ── Framework sync commands ─────────────────────────────────────────────

/// Get local sync status (no network call).
#[tauri::command]
pub async fn get_sync_status(
    ctx: State<'_, AppContext>,
) -> Result<SyncInfo, String> {
    ctx.framework_service.get_sync_status()
}

/// Check for framework updates (hits GitHub API).
#[tauri::command]
pub async fn check_for_updates(
    ctx: State<'_, AppContext>,
) -> Result<SyncInfo, String> {
    ctx.framework_service.check_for_updates().await
}

/// Download and install a framework version (or latest if None).
#[tauri::command]
pub async fn sync_framework(
    version: Option<String>,
    ctx: State<'_, AppContext>,
) -> Result<SyncInfo, String> {
    ctx.framework_service.sync_framework(version).await
}

/// Set auto-sync preference.
#[tauri::command]
pub async fn set_auto_sync(
    enabled: bool,
    ctx: State<'_, AppContext>,
) -> Result<(), String> {
    ctx.framework_service.set_auto_sync(enabled)
}
