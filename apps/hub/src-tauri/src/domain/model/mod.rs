mod project;
mod framework;
mod integration;
mod mcp_server;

pub use project::{AiddMarkers, Project, ProjectEntry};
pub use framework::{Framework, FrameworkEntity, FRAMEWORK_CATEGORIES};
pub use integration::{IntegrationConfig, IntegrationResult, IntegrationStatus, IntegrationType};
pub use mcp_server::{McpServer, McpServerMode, McpServerStatus};
