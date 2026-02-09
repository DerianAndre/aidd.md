use tauri::State;
use serde_json::Value;

use crate::AppContext;
use crate::domain::model::{McpServer, McpServerMode};
use crate::domain::ports::inbound::McpPort;

#[tauri::command]
pub fn start_mcp_server(
    ctx: State<'_, AppContext>,
    package: String,
    mode: String,
) -> Result<McpServer, String> {
    let mode = McpServerMode::from_str(&mode)?;
    ctx.mcp_service.start_server(&package, mode)
}

#[tauri::command]
pub fn stop_mcp_server(
    ctx: State<'_, AppContext>,
    server_id: String,
) -> Result<(), String> {
    ctx.mcp_service.stop_server(&server_id)
}

#[tauri::command]
pub fn stop_all_mcp_servers(
    ctx: State<'_, AppContext>,
) -> Result<(), String> {
    ctx.mcp_service.stop_all()
}

#[tauri::command]
pub fn get_mcp_servers(
    ctx: State<'_, AppContext>,
) -> Vec<McpServer> {
    ctx.mcp_service.get_servers()
}

#[tauri::command]
pub fn list_mcp_tools(
    ctx: State<'_, AppContext>,
    package: String,
) -> Result<Vec<Value>, String> {
    ctx.mcp_service.list_tools(&package)
}

#[tauri::command]
pub fn call_mcp_tool(
    ctx: State<'_, AppContext>,
    package: String,
    tool_name: String,
    arguments: Value,
) -> Result<Value, String> {
    ctx.mcp_service.call_tool(&package, &tool_name, arguments)
}
