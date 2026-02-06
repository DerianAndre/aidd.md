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

impl IntegrationType {
    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "claude_code" => Ok(Self::ClaudeCode),
            "cursor" => Ok(Self::Cursor),
            "vscode" => Ok(Self::Vscode),
            "gemini" => Ok(Self::Gemini),
            _ => Err(format!(
                "Unknown integration type '{}'. Valid: claude_code, cursor, vscode, gemini",
                s
            )),
        }
    }

    pub fn display_name(&self) -> &str {
        match self {
            Self::ClaudeCode => "Claude Code",
            Self::Cursor => "Cursor",
            Self::Vscode => "VS Code / Copilot",
            Self::Gemini => "Gemini",
        }
    }

    pub fn all() -> Vec<Self> {
        vec![Self::ClaudeCode, Self::Cursor, Self::Vscode, Self::Gemini]
    }
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

/// Result returned after an integrate/remove operation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntegrationResult {
    pub tool: IntegrationType,
    pub files_created: Vec<String>,
    pub files_modified: Vec<String>,
    pub messages: Vec<String>,
}
