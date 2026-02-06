use crate::domain::model::McpHealthReport;

/// Inbound port for MCP health scanning across all tool configs.
pub trait McpHealthPort: Send + Sync {
    fn scan_health(&self, project_path: Option<&str>) -> Result<McpHealthReport, String>;
}
