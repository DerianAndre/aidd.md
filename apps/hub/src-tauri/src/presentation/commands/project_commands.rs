use tauri::State;

use crate::AppContext;
use crate::domain::model::{Project, ProjectEntry};
use crate::domain::ports::inbound::ProjectPort;

/// Detect AIDD markers in a project directory.
#[tauri::command]
pub async fn detect_project(
    path: String,
    ctx: State<'_, AppContext>,
) -> Result<Project, String> {
    ctx.project_service.detect(&path)
}

/// Register a project: detect + persist to hub store.
#[tauri::command]
pub async fn add_project(
    path: String,
    ctx: State<'_, AppContext>,
) -> Result<Project, String> {
    ctx.project_service.register(&path)
}

/// Remove a project from the registry.
#[tauri::command]
pub async fn remove_project(
    path: String,
    ctx: State<'_, AppContext>,
) -> Result<(), String> {
    ctx.project_service.remove(&path)
}

/// List all registered projects.
#[tauri::command]
pub async fn list_projects(
    ctx: State<'_, AppContext>,
) -> Result<Vec<ProjectEntry>, String> {
    ctx.project_service.list()
}

/// Get the currently active project path.
#[tauri::command]
pub async fn get_active_project(
    ctx: State<'_, AppContext>,
) -> Result<Option<String>, String> {
    ctx.project_service.get_active_path()
}

/// Set the active project by path.
#[tauri::command]
pub async fn set_active_project(
    path: String,
    ctx: State<'_, AppContext>,
) -> Result<(), String> {
    ctx.project_service.switch(&path)
}
