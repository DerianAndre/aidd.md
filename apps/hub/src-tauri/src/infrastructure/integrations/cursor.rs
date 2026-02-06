use std::path::Path;
use crate::domain::model::{
    IntegrationConfig, IntegrationResult, IntegrationStatus, IntegrationType,
};
use super::adapter_trait::{ToolAdapter, ensure_file, read_json_or_default, write_json};

/// Cursor integration adapter.
///
/// Files managed:
/// - Project: `.cursor/mcp.json` — MCP server config (Cursor is project-scoped only)
/// - Project: `AGENTS.md` — agent definitions (shared across tools)
pub struct CursorAdapter;

impl ToolAdapter for CursorAdapter {
    fn tool_type(&self) -> IntegrationType {
        IntegrationType::Cursor
    }

    fn integrate(&self, project_path: &Path, framework_path: &Path) -> Result<IntegrationResult, String> {
        let mut result = IntegrationResult {
            tool: IntegrationType::Cursor,
            files_created: Vec::new(),
            files_modified: Vec::new(),
            messages: Vec::new(),
        };

        // 1. Project MCP config: .cursor/mcp.json
        let mcp_path = project_path.join(".cursor").join("mcp.json");
        let mut mcp_config = read_json_or_default(&mcp_path)?;

        let servers = mcp_config
            .as_object_mut()
            .ok_or(".cursor/mcp.json is not a JSON object")?
            .entry("mcpServers")
            .or_insert_with(|| serde_json::json!({}));

        let had_entry = servers.get("aidd").is_some();
        servers.as_object_mut()
            .ok_or("mcpServers is not a JSON object")?
            .insert(
                "aidd".to_string(),
                serde_json::json!({
                    "command": "npx",
                    "args": ["-y", "@aidd.md/mcp"]
                }),
            );

        write_json(&mcp_path, &mcp_config)?;
        if had_entry {
            result.files_modified.push(mcp_path.to_string_lossy().to_string());
        } else {
            result.files_created.push(mcp_path.to_string_lossy().to_string());
        }

        // 2. Project AGENTS.md
        let agents_md = project_path.join("AGENTS.md");
        if !agents_md.exists() {
            let framework_agents = framework_path.join("AGENTS.md");
            let content = if framework_agents.exists() {
                std::fs::read_to_string(&framework_agents)
                    .map_err(|e| format!("Failed to read framework AGENTS.md: {}", e))?
            } else {
                generate_agents_md_stub()
            };
            if let Some(path) = ensure_file(&agents_md, &content)? {
                result.files_created.push(path);
            }
        } else {
            result.messages.push("AGENTS.md already exists — not overwritten".to_string());
        }

        Ok(result)
    }

    fn remove(&self, project_path: &Path) -> Result<IntegrationResult, String> {
        let mut result = IntegrationResult {
            tool: IntegrationType::Cursor,
            files_created: Vec::new(),
            files_modified: Vec::new(),
            messages: Vec::new(),
        };

        // Remove aidd entry from .cursor/mcp.json
        let mcp_path = project_path.join(".cursor").join("mcp.json");
        if mcp_path.exists() {
            let mut config = read_json_or_default(&mcp_path)?;
            if let Some(servers) = config.get_mut("mcpServers").and_then(|s| s.as_object_mut()) {
                if servers.remove("aidd").is_some() {
                    write_json(&mcp_path, &config)?;
                    result.files_modified.push(mcp_path.to_string_lossy().to_string());
                }
            }
        }

        result.messages.push("AGENTS.md preserved (shared across integrations)".to_string());

        Ok(result)
    }

    fn check(&self, project_path: &Path) -> Result<IntegrationConfig, String> {
        let mut config_files = Vec::new();

        // Check .cursor/mcp.json
        let mcp_path = project_path.join(".cursor").join("mcp.json");
        let has_mcp = if mcp_path.exists() {
            let config = read_json_or_default(&mcp_path)?;
            config.get("mcpServers")
                .and_then(|s| s.get("aidd"))
                .is_some()
        } else {
            false
        };
        if has_mcp {
            config_files.push(mcp_path.to_string_lossy().to_string());
        }

        let agents_md = project_path.join("AGENTS.md");
        let has_agents_md = agents_md.exists();
        if has_agents_md {
            config_files.push(agents_md.to_string_lossy().to_string());
        }

        let status = if has_mcp && has_agents_md {
            IntegrationStatus::Configured
        } else if has_mcp || has_agents_md {
            IntegrationStatus::NeedsUpdate
        } else {
            IntegrationStatus::NotConfigured
        };

        Ok(IntegrationConfig {
            integration_type: IntegrationType::Cursor,
            status,
            config_files,
        })
    }
}

fn generate_agents_md_stub() -> String {
    r#"# AGENTS.md — AI Agent Definitions

> Single Source of Truth for AI agent roles and coordination.
> Auto-generated by aidd.md Hub. Customize for your project.

## Orchestrator

The primary agent that coordinates all sub-agents and routes tasks.
"#
    .to_string()
}
