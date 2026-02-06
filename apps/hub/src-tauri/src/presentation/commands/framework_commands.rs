use tauri::State;

use crate::AppContext;
use crate::domain::model::FrameworkEntity;
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
