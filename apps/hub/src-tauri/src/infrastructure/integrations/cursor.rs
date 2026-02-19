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

/// Cursor integration adapter.
///
/// Files managed:
/// - Project: `.cursor/mcp.json` — MCP server config (project-scoped)
/// - Project: `.cursor/rules/aidd.mdc` — AIDD rules pointer (MDC format)
/// - Project: routing.md (config-resolved content root)
/// - Project: `AGENTS.md` — thin redirect (cross-tool compat)
pub struct CursorAdapter;

impl ToolAdapter for CursorAdapter {
    fn tool_type(&self) -> IntegrationType {
        IntegrationType::Cursor
    }

    fn integrate(&self, project_path: &Path, framework_path: &Path, dev_mode: bool) -> Result<IntegrationResult, String> {
        let mut result = IntegrationResult {
            tool: IntegrationType::Cursor,
            files_created: Vec::new(),
            files_modified: Vec::new(),
            messages: Vec::new(),
        };

        // 1. Project MCP config
        let mcp_path = project_path.join(".cursor").join("mcp.json");
        upsert_mcp_entry(&mcp_path, project_path, dev_mode, &mut result)?;

        // 2. Cursor rules (.mdc format with YAML frontmatter)
        let rules_path = project_path.join(".cursor").join("rules").join("aidd.mdc");
        let mdc_content = format!(
            "---\ndescription: \"AIDD framework rules \u{2014} AI-Driven Development\"\nalwaysApply: true\nglobs: []\n---\n\n# AIDD Framework\n\n{}",
            rules_pointer()
        );
        if let Some(path) = ensure_file(&rules_path, &mdc_content)? {
            result.files_created.push(path);
        } else {
            result.messages.push(".cursor/rules/aidd.mdc already exists — not overwritten".to_string());
        }

        // 3. Agents files (config-aware)
        ensure_agents_files(project_path, framework_path, &mut result)?;

        Ok(result)
    }

    fn remove(&self, project_path: &Path) -> Result<IntegrationResult, String> {
        let mut result = IntegrationResult {
            tool: IntegrationType::Cursor,
            files_created: Vec::new(),
            files_modified: Vec::new(),
            messages: Vec::new(),
        };

        let mcp_path = project_path.join(".cursor").join("mcp.json");
        remove_mcp_entry(&mcp_path, &mut result)?;

        let rules_path = project_path.join(".cursor").join("rules").join("aidd.mdc");
        if remove_file_if_exists(&rules_path)? {
            result.messages.push(format!("Removed {}", rules_path.display()));
        }

        result.messages.push("AGENTS.md preserved (shared across integrations)".to_string());
        Ok(result)
    }

    fn check(&self, project_path: &Path) -> Result<IntegrationConfig, String> {
        let mut config_files = Vec::new();

        let mcp_path = project_path.join(".cursor").join("mcp.json");
        let (has_mcp, dev_mode) = check_mcp_entry(&mcp_path)?;
        if has_mcp {
            config_files.push(mcp_path.to_string_lossy().to_string());
        }

        let has_agents = has_agents_dir(project_path);
        if has_agents {
            config_files.push(agents_dir_path(project_path).to_string_lossy().to_string());
        }

        let status = if has_mcp && has_agents {
            IntegrationStatus::Configured
        } else if has_mcp || has_agents {
            IntegrationStatus::NeedsUpdate
        } else {
            IntegrationStatus::NotConfigured
        };

        Ok(IntegrationConfig {
            integration_type: IntegrationType::Cursor,
            status,
            config_files,
            dev_mode,
        })
    }
}
