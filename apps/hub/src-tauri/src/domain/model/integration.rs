use serde::{Deserialize, Serialize};

/// Supported AI tool integration types.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum IntegrationType {
    ClaudeCode,
    Cursor,
    Vscode,
    Gemini,
}

/// Current status of an integration.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum IntegrationStatus {
    NotConfigured,
    Configured,
    NeedsUpdate,
}

/// Configuration state for a single integration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntegrationConfig {
    pub integration_type: IntegrationType,
    pub status: IntegrationStatus,
    pub config_files: Vec<String>,
}
