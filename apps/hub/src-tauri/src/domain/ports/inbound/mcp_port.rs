use crate::domain::model::{McpServer, McpServerMode};

/// Inbound port for MCP server lifecycle management.
pub trait McpPort: Send + Sync {
    fn start_server(&self, package: &str, mode: McpServerMode) -> Result<McpServer, String>;
    fn stop_server(&self, server_id: &str) -> Result<(), String>;
    fn stop_all(&self) -> Result<(), String>;
    fn get_servers(&self) -> Vec<McpServer>;
}
