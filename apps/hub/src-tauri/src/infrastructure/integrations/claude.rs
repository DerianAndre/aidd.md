use std::path::Path;
use crate::domain::model::{
    IntegrationConfig, IntegrationResult, IntegrationStatus, IntegrationType,
};
use super::adapter_trait::{
    ToolAdapter, ensure_file, remove_file_if_exists,
    ensure_agents_files, has_agents_dir, agents_dir_path,
    upsert_mcp_entry, remove_mcp_entry, check_mcp_entry,
    project_instructions, project_name,
};

/// Claude Code integration adapter.
///
/// Files managed:
/// - User scope: `~/.claude.json` — MCP server entry (user/local scope)
/// - Project scope: `.mcp.json` — project-scoped MCP config (team-shareable)
/// - Project: `CLAUDE.md` — project instructions
/// - Project: agents routing.md (config-resolved path)
/// - Project: `AGENTS.md` — thin redirect (cross-tool compat)
pub struct ClaudeAdapter {
    home_dir: std::path::PathBuf,
}

impl ClaudeAdapter {
    pub fn new() -> Self {
        Self {
            home_dir: dirs::home_dir().expect("Cannot resolve home directory"),
        }
    }

    /// User/local scope MCP config: ~/.claude.json
    fn mcp_json_path(&self) -> std::path::PathBuf {
        self.home_dir.join(".claude.json")
    }
}

impl ToolAdapter for ClaudeAdapter {
    fn tool_type(&self) -> IntegrationType {
        IntegrationType::ClaudeCode
    }

    fn integrate(&self, project_path: &Path, framework_path: &Path, dev_mode: bool) -> Result<IntegrationResult, String> {
        let mut result = IntegrationResult {
            tool: IntegrationType::ClaudeCode,
            files_created: Vec::new(),
            files_modified: Vec::new(),
            messages: Vec::new(),
        };

        // 1. Global MCP config
        upsert_mcp_entry(&self.mcp_json_path(), project_path, dev_mode, &mut result)?;

        // 2. Project-scoped .mcp.json (team-shareable via git)
        let project_mcp = project_path.join(".mcp.json");
        if !project_mcp.exists() {
            upsert_mcp_entry(&project_mcp, project_path, dev_mode, &mut result)?;
        }

        // 3. Project CLAUDE.md
        let claude_md = project_path.join("CLAUDE.md");
        let name = project_name(project_path);
        let content = project_instructions(
            &name,
            "Claude Code",
            "The aidd.md MCP server is configured at `~/.claude.json` (user scope) and `.mcp.json` (project scope).",
        );
        if let Some(path) = ensure_file(&claude_md, &content)? {
            result.files_created.push(path);
        } else {
            result.messages.push("CLAUDE.md already exists — not overwritten".to_string());
        }

        // 4. Agents files (config-aware)
        ensure_agents_files(project_path, framework_path, &mut result)?;

        Ok(result)
    }

    fn remove(&self, project_path: &Path) -> Result<IntegrationResult, String> {
        let mut result = IntegrationResult {
            tool: IntegrationType::ClaudeCode,
            files_created: Vec::new(),
            files_modified: Vec::new(),
            messages: Vec::new(),
        };

        remove_mcp_entry(&self.mcp_json_path(), &mut result)?;

        // Remove project-scoped .mcp.json entry
        let project_mcp = project_path.join(".mcp.json");
        remove_mcp_entry(&project_mcp, &mut result)?;

        let claude_md = project_path.join("CLAUDE.md");
        if remove_file_if_exists(&claude_md)? {
            result.messages.push(format!("Removed {}", claude_md.display()));
        }

        result.messages.push("AGENTS.md preserved (shared across integrations)".to_string());
        Ok(result)
    }

    fn check(&self, project_path: &Path) -> Result<IntegrationConfig, String> {
        let mut config_files = Vec::new();

        let (has_mcp, dev_mode) = check_mcp_entry(&self.mcp_json_path())?;
        if has_mcp {
            config_files.push(self.mcp_json_path().to_string_lossy().to_string());
        }

        // Check project-scoped .mcp.json
        let project_mcp = project_path.join(".mcp.json");
        let (has_project_mcp, _) = check_mcp_entry(&project_mcp)?;
        if has_project_mcp {
            config_files.push(project_mcp.to_string_lossy().to_string());
        }

        let claude_md = project_path.join("CLAUDE.md");
        let has_claude_md = claude_md.exists();
        let has_agents = has_agents_dir(project_path);

        if has_claude_md {
            config_files.push(claude_md.to_string_lossy().to_string());
        }
        if has_agents {
            config_files.push(agents_dir_path(project_path).to_string_lossy().to_string());
        }

        let status = if has_mcp && has_claude_md && has_agents {
            IntegrationStatus::Configured
        } else if has_mcp || has_claude_md {
            IntegrationStatus::NeedsUpdate
        } else {
            IntegrationStatus::NotConfigured
        };

        Ok(IntegrationConfig {
            integration_type: IntegrationType::ClaudeCode,
            status,
            config_files,
            dev_mode,
        })
    }
}

