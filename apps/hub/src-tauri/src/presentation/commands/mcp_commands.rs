use tauri::State;
use serde_json::json;
use serde_json::Value;
use tauri::async_runtime;
use tokio::time::{timeout, Duration};

use crate::AppContext;
use crate::domain::model::{McpServer, McpServerMode};
use crate::domain::ports::inbound::McpPort;

fn is_major_mutation(tool_name: &str) -> bool {
    matches!(
        tool_name,
        "aidd_draft_approve"
            | "aidd_evolution_approve"
            | "aidd_evolution_revert"
            | "aidd_scaffold"
    )
}

fn parse_text_result_json(result: &Value) -> Option<Value> {
    if let Some(structured) = result.get("structuredContent") {
        return Some(structured.clone());
    }

    let content = result.get("content")?.as_array()?;
    for block in content {
        if block.get("type").and_then(|v| v.as_str()) == Some("text") {
            if let Some(text) = block.get("text").and_then(|v| v.as_str()) {
                if let Ok(parsed) = serde_json::from_str::<Value>(text) {
                    return Some(parsed);
                }
            }
        }
    }

    None
}

fn docs_checksum_status(report: &Value) -> Option<String> {
    report
        .get("docsChecksum")
        .and_then(|v| v.get("status"))
        .and_then(|v| v.as_str())
        .map(|v| v.to_string())
}

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
pub async fn list_mcp_tools(
    ctx: State<'_, AppContext>,
    package: String,
) -> Result<Vec<Value>, String> {
    let service = ctx.mcp_service.clone();
    timeout(
        Duration::from_secs(12),
        async_runtime::spawn_blocking(move || service.list_tools(&package)),
    )
    .await
    .map_err(|_| "list_mcp_tools timed out after 12s".to_string())?
    .map_err(|e| format!("list_mcp_tools task failed: {}", e))?
}

#[tauri::command]
pub async fn call_mcp_tool(
    ctx: State<'_, AppContext>,
    package: String,
    tool_name: String,
    arguments: Value,
) -> Result<Value, String> {
    let service = ctx.mcp_service.clone();
    let memory = ctx.memory_service.clone();
    timeout(
        Duration::from_secs(20),
        async_runtime::spawn_blocking(move || {
            if is_major_mutation(&tool_name) {
                // Asymmetric enforcement: auto-sync context before high-impact mutations.
                let _ = service.call_tool("engine", "aidd_optimize_context", json!({ "budget": 2000 }));

                // Guard 1: S2D checksum must be healthy before core mutations.
                let report_result = service.call_tool("engine", "aidd_ci_report", json!({ "format": "json" }))?;
                let parsed_report = parse_text_result_json(&report_result).unwrap_or(report_result);
                let checksum_status = docs_checksum_status(&parsed_report).unwrap_or_else(|| "UNKNOWN".to_string());
                if checksum_status != "FOUND" {
                    return Err(
                        "Synchronizing Architecture... blocked mutation because docs checksum is stale or missing. Run `pnpm mcp:docs --check`.".to_string(),
                    );
                }

                // Guard 2: Require at least one ADR before core mutation promotion paths.
                let adrs = memory
                    .list_artifacts(Some("adr"), None, Some(1))
                    .unwrap_or_default();
                if adrs.is_empty() {
                    return Err(
                        "Synchronizing Architecture... blocked mutation because no ADR artifact is registered. Create ADR first.".to_string(),
                    );
                }
            }

            service.call_tool(&package, &tool_name, arguments)
        }),
    )
    .await
    .map_err(|_| "call_mcp_tool timed out after 20s".to_string())?
    .map_err(|e| format!("call_mcp_tool task failed: {}", e))?
}
