use crate::domain::model::{IntegrationConfig, IntegrationResult, IntegrationType};

/// Inbound port for AI tool integration management.
pub trait IntegrationPort: Send + Sync {
    fn integrate(&self, project_path: &str, tool: IntegrationType, dev_mode: bool) -> Result<IntegrationResult, String>;
    fn remove_integration(&self, project_path: &str, tool: IntegrationType) -> Result<IntegrationResult, String>;
    fn check_status(&self, project_path: &str) -> Result<Vec<IntegrationConfig>, String>;
    fn list_available(&self) -> Vec<IntegrationType>;
}
