use std::path::Path;
use crate::domain::model::{
    IntegrationConfig, IntegrationResult, IntegrationStatus, IntegrationType,
};
use super::adapter_trait::{ToolAdapter, ensure_file, read_json_or_default, write_json, remove_file_if_exists};

/// Claude Code integration adapter.
///
/// Files managed:
/// - Global: `~/.claude/mcp.json` — MCP server entry
/// - Project: `CLAUDE.md` — project instructions
/// - Project: `AGENTS.md` — agent definitions (shared across tools)
pub struct ClaudeAdapter {
    home_dir: std::path::PathBuf,
}

impl ClaudeAdapter {
    pub fn new() -> Self {
        Self {
            home_dir: dirs::home_dir().expect("Cannot resolve home directory"),
        }
    }

    fn claude_dir(&self) -> std::path::PathBuf {
        self.home_dir.join(".claude")
    }

    fn mcp_json_path(&self) -> std::path::PathBuf {
        self.claude_dir().join("mcp.json")
    }
}

impl ToolAdapter for ClaudeAdapter {
    fn tool_type(&self) -> IntegrationType {
        IntegrationType::ClaudeCode
    }

    fn integrate(&self, project_path: &Path, framework_path: &Path) -> Result<IntegrationResult, String> {
        let mut result = IntegrationResult {
            tool: IntegrationType::ClaudeCode,
            files_created: Vec::new(),
            files_modified: Vec::new(),
            messages: Vec::new(),
        };

        // 1. Global MCP config: ~/.claude/mcp.json
        let mcp_path = self.mcp_json_path();
        let mut mcp_config = read_json_or_default(&mcp_path)?;

        let servers = mcp_config
            .as_object_mut()
            .ok_or("mcp.json is not a JSON object")?
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

        // 2. Project CLAUDE.md
        let claude_md = project_path.join("CLAUDE.md");
        let claude_content = generate_claude_md(project_path);
        if let Some(path) = ensure_file(&claude_md, &claude_content)? {
            result.files_created.push(path);
        } else {
            result.messages.push("CLAUDE.md already exists — not overwritten".to_string());
        }

        // 3. Project AGENTS.md
        let agents_md = project_path.join("AGENTS.md");
        if !agents_md.exists() {
            let framework_agents = framework_path.join("AGENTS.md");
            let content = if framework_agents.exists() {
                std::fs::read_to_string(&framework_agents)
                    .map_err(|e| format!("Failed to read framework AGENTS.md: {}", e))?
            } else {
                generate_agents_md_template()
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
            tool: IntegrationType::ClaudeCode,
            files_created: Vec::new(),
            files_modified: Vec::new(),
            messages: Vec::new(),
        };

        // Remove aidd entry from ~/.claude/mcp.json
        let mcp_path = self.mcp_json_path();
        if mcp_path.exists() {
            let mut config = read_json_or_default(&mcp_path)?;
            if let Some(servers) = config.get_mut("mcpServers").and_then(|s| s.as_object_mut()) {
                if servers.remove("aidd").is_some() {
                    write_json(&mcp_path, &config)?;
                    result.files_modified.push(mcp_path.to_string_lossy().to_string());
                }
            }
        }

        // Remove project CLAUDE.md
        let claude_md = project_path.join("CLAUDE.md");
        if remove_file_if_exists(&claude_md)? {
            result.messages.push(format!("Removed {}", claude_md.display()));
        }

        // Do NOT remove AGENTS.md — it's shared across tools
        result.messages.push("AGENTS.md preserved (shared across integrations)".to_string());

        Ok(result)
    }

    fn check(&self, project_path: &Path) -> Result<IntegrationConfig, String> {
        let mut config_files = Vec::new();

        // Check global MCP config
        let mcp_path = self.mcp_json_path();
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

        // Check project files
        let claude_md = project_path.join("CLAUDE.md");
        let agents_md = project_path.join("AGENTS.md");
        let has_claude_md = claude_md.exists();
        let has_agents_md = agents_md.exists();

        if has_claude_md {
            config_files.push(claude_md.to_string_lossy().to_string());
        }
        if has_agents_md {
            config_files.push(agents_md.to_string_lossy().to_string());
        }

        let status = if has_mcp && has_claude_md && has_agents_md {
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
        })
    }
}

fn generate_claude_md(project_path: &Path) -> String {
    let project_name = project_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "Project".to_string());

    format!(
r#"# {} — Project Instructions for Claude Code

> Auto-generated by aidd.md Hub. Edit freely.

## SSOT

`AGENTS.md` is the canonical source of truth for agent roles and coordination.

## Framework

This project uses the [aidd.md](https://aidd.md) framework:
- **AGENTS.md** — Agent definitions and routing
- **rules/** — Domain-specific rules
- **skills/** — Specialized capabilities

## MCP Integration

The aidd.md MCP server is configured globally at `~/.claude/mcp.json`.
"#,
        project_name
    )
}

fn generate_agents_md_template() -> String {
    r#"# AGENTS.md — AI Agent Definitions

> Single Source of Truth for AI agent roles and coordination.
> Auto-generated by aidd.md Hub. Customize for your project.

## Orchestrator

The primary agent that coordinates all sub-agents and routes tasks.

### Capabilities
- Task classification and routing
- Context optimization
- Quality gate enforcement

## Rules

See `rules/` directory for domain-specific rules.

## Skills

See `skills/` directory for specialized capabilities.
"#
    .to_string()
}
