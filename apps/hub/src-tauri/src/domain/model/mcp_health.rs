use serde::{Deserialize, Serialize};
use super::mcp_server::McpServer;

/// Which AI tool owns this MCP config entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum McpToolSource {
    ClaudeCode,
    Cursor,
    Vscode,
    Gemini,
}

/// Whether the config was found at global or project scope.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum McpConfigScope {
    Global,
    Project,
}

/// A single MCP server entry discovered in a config file.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredMcp {
    pub name: String,
    pub tool: McpToolSource,
    pub scope: McpConfigScope,
    pub config_path: String,
    pub command: Option<String>,
    pub args: Option<Vec<String>>,
    /// URL for HTTP/SSE transport servers (no command/args).
    pub url: Option<String>,
    pub is_aidd: bool,
}

/// Summary statistics for the health report.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpHealthSummary {
    pub total_discovered: usize,
    pub aidd_count: usize,
    pub third_party_count: usize,
    pub tools_with_config: Vec<String>,
    pub hub_running: usize,
    pub hub_stopped: usize,
    pub hub_error: usize,
}

/// Aggregated health report returned to frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpHealthReport {
    pub discovered: Vec<DiscoveredMcp>,
    pub hub_servers: Vec<McpServer>,
    pub summary: McpHealthSummary,
}
