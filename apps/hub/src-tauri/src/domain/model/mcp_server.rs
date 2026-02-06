use serde::{Deserialize, Serialize};

/// MCP server hosting mode.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum McpServerMode {
    /// AI tool spawns the MCP server process.
    ToolLaunched,
    /// Hub manages the MCP server lifecycle.
    HubHosted,
}

impl McpServerMode {
    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "tool_launched" => Ok(Self::ToolLaunched),
            "hub_hosted" => Ok(Self::HubHosted),
            _ => Err(format!(
                "Unknown MCP server mode '{}'. Valid: tool_launched, hub_hosted",
                s
            )),
        }
    }
}

/// MCP server runtime status.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum McpServerStatus {
    Stopped,
    Running,
    Error,
}

/// MCP server entity — returned to frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServer {
    pub id: String,
    pub name: String,
    pub mode: McpServerMode,
    pub status: McpServerStatus,
    pub pid: Option<u32>,
    pub started_at: Option<String>,
    pub error: Option<String>,
}
