use std::path::Path;
use crate::domain::model::{
    IntegrationConfig, IntegrationResult, IntegrationStatus, IntegrationType,
};
use super::adapter_trait::{
    ToolAdapter, ensure_file,
    ensure_agents_files, has_agents_dir, agents_dir_path,
};

/// Gemini integration adapter.
///
/// Gemini reads AGENTS.md natively — we create a thin redirect at root.
///
/// Files managed:
/// - Project: agents routing.md (config-resolved path)
/// - Project: `AGENTS.md` — thin redirect (Gemini reads this natively)
/// - Project: `.gemini/settings.json` — optional Gemini settings
pub struct GeminiAdapter;

impl ToolAdapter for GeminiAdapter {
    fn tool_type(&self) -> IntegrationType {
        IntegrationType::Gemini
    }

    fn integrate(&self, project_path: &Path, framework_path: &Path, _dev_mode: bool) -> Result<IntegrationResult, String> {
        let mut result = IntegrationResult {
            tool: IntegrationType::Gemini,
            files_created: Vec::new(),
            files_modified: Vec::new(),
            messages: Vec::new(),
        };

        // 1. Agents files (config-aware) — shared SSOT
        ensure_agents_files(project_path, framework_path, &mut result)?;

        // 2. Optional .gemini/settings.json
        let gemini_settings = project_path.join(".gemini").join("settings.json");
        let settings_content = serde_json::to_string_pretty(&serde_json::json!({
            "agentsFile": "AGENTS.md"
        }))
        .unwrap_or_default();

        if let Some(path) = ensure_file(&gemini_settings, &settings_content)? {
            result.files_created.push(path);
        } else {
            result.messages.push(".gemini/settings.json already exists — not overwritten".to_string());
        }

        result.messages.push("Gemini reads AGENTS.md natively — no additional config required".to_string());

        Ok(result)
    }

    fn remove(&self, project_path: &Path) -> Result<IntegrationResult, String> {
        let mut result = IntegrationResult {
            tool: IntegrationType::Gemini,
            files_created: Vec::new(),
            files_modified: Vec::new(),
            messages: Vec::new(),
        };

        // Remove .gemini/ directory
        let gemini_dir = project_path.join(".gemini");
        if gemini_dir.exists() {
            std::fs::remove_dir_all(&gemini_dir)
                .map_err(|e| format!("Failed to remove .gemini/: {}", e))?;
            result.messages.push(format!("Removed {}", gemini_dir.display()));
        }

        result.messages.push("AGENTS.md preserved (shared across integrations)".to_string());

        Ok(result)
    }

    fn check(&self, project_path: &Path) -> Result<IntegrationConfig, String> {
        let mut config_files = Vec::new();

        let has_agents = has_agents_dir(project_path);
        if has_agents {
            config_files.push(agents_dir_path(project_path).to_string_lossy().to_string());
        }

        let gemini_settings = project_path.join(".gemini").join("settings.json");
        let has_settings = gemini_settings.exists();
        if has_settings {
            config_files.push(gemini_settings.to_string_lossy().to_string());
        }

        let status = if has_agents {
            IntegrationStatus::Configured
        } else {
            IntegrationStatus::NotConfigured
        };

        Ok(IntegrationConfig {
            integration_type: IntegrationType::Gemini,
            status,
            config_files,
            dev_mode: false, // Gemini has no MCP config
        })
    }
}
