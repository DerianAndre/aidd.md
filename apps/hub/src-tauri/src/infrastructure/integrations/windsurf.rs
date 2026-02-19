use std::path::Path;
use crate::domain::model::{
    IntegrationConfig, IntegrationResult, IntegrationStatus, IntegrationType,
};
use super::adapter_trait::{
    ToolAdapter, ensure_file, remove_file_if_exists,
    ensure_agents_files, has_agents_dir, agents_dir_path,
    upsert_mcp_entry, remove_mcp_entry, check_mcp_entry,
    rules_pointer,
};

/// Windsurf / Antigravity integration adapter.
///
/// Files managed:
/// - Global: `~/.codeium/windsurf/mcp_config.json` — MCP server config
/// - Project: `.windsurfrules` — rules pointer to AIDD content
/// - Project: routing.md (config-resolved content root)
/// - Project: `AGENTS.md` — thin redirect (cross-tool compat)
pub struct WindsurfAdapter {
    home_dir: std::path::PathBuf,
}

impl WindsurfAdapter {
    pub fn new() -> Self {
        Self {
            home_dir: dirs::home_dir().expect("Cannot resolve home directory"),
        }
    }

    fn mcp_config_path(&self) -> std::path::PathBuf {
        self.home_dir.join(".codeium").join("windsurf").join("mcp_config.json")
    }
}

impl ToolAdapter for WindsurfAdapter {
    fn tool_type(&self) -> IntegrationType {
        IntegrationType::Windsurf
    }

    fn integrate(&self, project_path: &Path, framework_path: &Path, dev_mode: bool) -> Result<IntegrationResult, String> {
        let mut result = IntegrationResult {
            tool: IntegrationType::Windsurf,
            files_created: Vec::new(),
            files_modified: Vec::new(),
            messages: Vec::new(),
        };

        // 1. Global MCP config
        upsert_mcp_entry(&self.mcp_config_path(), project_path, dev_mode, &mut result)?;

        // 2. Project .windsurfrules (thin pointer to AIDD content)
        let windsurfrules = project_path.join(".windsurfrules");
        let content = rules_pointer();
        if let Some(path) = ensure_file(&windsurfrules, &content)? {
            result.files_created.push(path);
        } else {
            result.messages.push(".windsurfrules already exists — not overwritten".to_string());
        }

        // 3. Agents files (config-aware)
        ensure_agents_files(project_path, framework_path, &mut result)?;

        Ok(result)
    }

    fn remove(&self, project_path: &Path) -> Result<IntegrationResult, String> {
        let mut result = IntegrationResult {
            tool: IntegrationType::Windsurf,
            files_created: Vec::new(),
            files_modified: Vec::new(),
            messages: Vec::new(),
        };

        remove_mcp_entry(&self.mcp_config_path(), &mut result)?;

        let windsurfrules = project_path.join(".windsurfrules");
        if remove_file_if_exists(&windsurfrules)? {
            result.messages.push(format!("Removed {}", windsurfrules.display()));
        }

        result.messages.push("AGENTS.md preserved (shared across integrations)".to_string());
        Ok(result)
    }

    fn check(&self, project_path: &Path) -> Result<IntegrationConfig, String> {
        let mut config_files = Vec::new();

        let (has_mcp, dev_mode) = check_mcp_entry(&self.mcp_config_path())?;
        if has_mcp {
            config_files.push(self.mcp_config_path().to_string_lossy().to_string());
        }

        let has_agents = has_agents_dir(project_path);
        if has_agents {
            config_files.push(agents_dir_path(project_path).to_string_lossy().to_string());
        }

        let windsurfrules = project_path.join(".windsurfrules");
        if windsurfrules.exists() {
            config_files.push(windsurfrules.to_string_lossy().to_string());
        }

        let status = if has_mcp && has_agents {
            IntegrationStatus::Configured
        } else if has_mcp || has_agents {
            IntegrationStatus::NeedsUpdate
        } else {
            IntegrationStatus::NotConfigured
        };

        Ok(IntegrationConfig {
            integration_type: IntegrationType::Windsurf,
            status,
            config_files,
            dev_mode,
        })
    }
}
