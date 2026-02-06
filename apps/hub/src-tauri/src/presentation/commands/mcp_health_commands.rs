use tauri::State;
use crate::AppContext;
use crate::domain::model::McpHealthReport;
use crate::domain::ports::inbound::McpHealthPort;

#[tauri::command]
pub fn scan_mcp_health(
    ctx: State<'_, AppContext>,
    project_path: Option<String>,
) -> Result<McpHealthReport, String> {
    ctx.mcp_health_service.scan_health(project_path.as_deref())
}
