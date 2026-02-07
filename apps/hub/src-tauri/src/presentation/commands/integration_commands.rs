use tauri::State;
use crate::AppContext;
use crate::domain::model::{IntegrationConfig, IntegrationResult, IntegrationType};
use crate::domain::ports::inbound::IntegrationPort;

#[tauri::command]
pub fn integrate_tool(
    ctx: State<'_, AppContext>,
    project_path: String,
    tool: String,
    dev_mode: bool,
) -> Result<IntegrationResult, String> {
    let tool_type = IntegrationType::from_str(&tool)?;
    ctx.integration_service.integrate(&project_path, tool_type, dev_mode)
}

#[tauri::command]
pub fn remove_integration(
    ctx: State<'_, AppContext>,
    project_path: String,
    tool: String,
) -> Result<IntegrationResult, String> {
    let tool_type = IntegrationType::from_str(&tool)?;
    ctx.integration_service.remove_integration(&project_path, tool_type)
}

#[tauri::command]
pub fn check_integrations(
    ctx: State<'_, AppContext>,
    project_path: String,
) -> Result<Vec<IntegrationConfig>, String> {
    ctx.integration_service.check_status(&project_path)
}

#[tauri::command]
pub fn list_integration_types(
    ctx: State<'_, AppContext>,
) -> Vec<IntegrationType> {
    ctx.integration_service.list_available()
}
