use crate::domain::model::{McpServer, McpServerMode};
use serde_json::Value;

/// Inbound port for MCP server lifecycle management.
pub trait McpPort: Send + Sync {
    fn start_server(&self, package: &str, mode: McpServerMode) -> Result<McpServer, String>;
    fn stop_server(&self, server_id: &str) -> Result<(), String>;
    fn stop_all(&self) -> Result<(), String>;
    fn get_servers(&self) -> Vec<McpServer>;
    fn list_tools(&self, package: &str) -> Result<Vec<Value>, String>;
    fn call_tool(&self, package: &str, tool_name: &str, arguments: Value) -> Result<Value, String>;
}
