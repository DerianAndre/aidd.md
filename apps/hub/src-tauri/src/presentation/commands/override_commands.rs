use tauri::State;

use crate::AppContext;
use crate::domain::model::{EffectiveEntity, FrameworkEntity, ProjectOverrides};

/// Get project overrides summary.
#[tauri::command]
pub fn get_project_overrides(
    project_path: String,
    ctx: State<'_, AppContext>,
) -> Result<ProjectOverrides, String> {
    ctx.override_service.get_overrides(&project_path)
}

/// Enable or disable an agent for a project.
#[tauri::command]
pub fn set_agent_override(
    project_path: String,
    agent: String,
    enabled: bool,
    ctx: State<'_, AppContext>,
) -> Result<(), String> {
    ctx.override_service
        .set_agent_override(&project_path, &agent, enabled)
}

/// Add a project-specific rule.
#[tauri::command]
pub fn add_project_rule(
    project_path: String,
    name: String,
    content: String,
    ctx: State<'_, AppContext>,
) -> Result<(), String> {
    ctx.override_service
        .add_project_rule(&project_path, &name, &content)
}

/// Remove a project-specific rule.
#[tauri::command]
pub fn remove_project_rule(
    project_path: String,
    name: String,
    ctx: State<'_, AppContext>,
) -> Result<(), String> {
    ctx.override_service
        .remove_project_rule(&project_path, &name)
}

/// List project-specific override rules.
#[tauri::command]
pub fn list_project_rules(
    project_path: String,
    ctx: State<'_, AppContext>,
) -> Result<Vec<FrameworkEntity>, String> {
    ctx.override_service.list_project_rules(&project_path)
}

/// Get effective (merged) entities for a category.
#[tauri::command]
pub fn get_effective_entities(
    project_path: String,
    category: String,
    ctx: State<'_, AppContext>,
) -> Result<Vec<EffectiveEntity>, String> {
    ctx.override_service
        .get_effective_entities(&project_path, &category)
}
