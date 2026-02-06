use serde::{Deserialize, Serialize};

/// MCP server hosting mode.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum McpServerMode {
    /// AI tool spawns the MCP server process.
    ToolLaunched,
    /// Hub manages the MCP server lifecycle.
    HubHosted,
}

/// MCP server runtime status.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum McpServerStatus {
    Stopped,
    Running,
    Error,
}

/// MCP server entity.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServer {
    pub id: String,
    pub name: String,
    pub mode: McpServerMode,
    pub status: McpServerStatus,
    pub pid: Option<u32>,
}
