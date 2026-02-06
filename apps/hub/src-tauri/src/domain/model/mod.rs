mod project;
mod framework;
mod integration;
mod mcp_server;
mod mcp_health;
mod sync;
mod overrides;

pub use project::{AiddMarkers, Project, ProjectEntry};
pub use framework::{Framework, FrameworkEntity, FRAMEWORK_CATEGORIES};
pub use integration::{IntegrationConfig, IntegrationResult, IntegrationStatus, IntegrationType};
pub use mcp_server::{McpServer, McpServerMode, McpServerStatus};
pub use mcp_health::{DiscoveredMcp, McpToolSource, McpConfigScope, McpHealthSummary, McpHealthReport};
pub use sync::SyncInfo;
pub use overrides::{AgentOverrides, EffectiveEntity, ProjectOverrides};
