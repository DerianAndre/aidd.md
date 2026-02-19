use std::path::Path;
use crate::domain::model::{
    IntegrationConfig, IntegrationResult, IntegrationStatus, IntegrationType,
};
use super::adapter_trait::{
    ToolAdapter, ensure_file, remove_file_if_exists,
    ensure_agents_files, has_agents_dir, agents_dir_path,
    read_json_or_default, write_json, mcp_server_entry,
    project_instructions, project_name,
};

/// VS Code / GitHub Copilot integration adapter.
///
/// Files managed:
/// - Project: `.vscode/mcp.json` — MCP server config (VS Code native)
/// - Project: `.github/copilot-instructions.md` — Copilot instructions
/// - Project: routing.md (config-resolved content root)
/// - Project: `AGENTS.md` — thin redirect (cross-tool compat)
pub struct VscodeAdapter;

impl ToolAdapter for VscodeAdapter {
    fn tool_type(&self) -> IntegrationType {
        IntegrationType::Vscode
    }

    fn integrate(&self, project_path: &Path, framework_path: &Path, dev_mode: bool) -> Result<IntegrationResult, String> {
        let mut result = IntegrationResult {
            tool: IntegrationType::Vscode,
            files_created: Vec::new(),
            files_modified: Vec::new(),
            messages: Vec::new(),
        };

        // 1. Auto-generate .vscode/mcp.json (VS Code native MCP config)
        let vscode_mcp = project_path.join(".vscode").join("mcp.json");
        upsert_vscode_mcp(&vscode_mcp, project_path, dev_mode, &mut result)?;

        // 2. Copilot instructions
        let copilot_md = project_path.join(".github").join("copilot-instructions.md");
        let name = project_name(project_path);
        let content = project_instructions(
            &name,
            "Copilot",
            "The aidd.md MCP server is configured at `.vscode/mcp.json`.",
        );
        if let Some(path) = ensure_file(&copilot_md, &content)? {
            result.files_created.push(path);
        } else {
            result.messages.push("copilot-instructions.md already exists — not overwritten".to_string());
        }

        // 3. Agents files (config-aware)
        ensure_agents_files(project_path, framework_path, &mut result)?;

        Ok(result)
    }

    fn remove(&self, project_path: &Path) -> Result<IntegrationResult, String> {
        let mut result = IntegrationResult {
            tool: IntegrationType::Vscode,
            files_created: Vec::new(),
            files_modified: Vec::new(),
            messages: Vec::new(),
        };

        // Remove .vscode/mcp.json entry
        let vscode_mcp = project_path.join(".vscode").join("mcp.json");
        remove_vscode_mcp(&vscode_mcp, &mut result)?;

        let copilot_md = project_path.join(".github").join("copilot-instructions.md");
        if remove_file_if_exists(&copilot_md)? {
            result.messages.push(format!("Removed {}", copilot_md.display()));
        }

        result.messages.push("AGENTS.md preserved (shared across integrations)".to_string());
        Ok(result)
    }

    fn check(&self, project_path: &Path) -> Result<IntegrationConfig, String> {
        let mut config_files = Vec::new();

        // Check .vscode/mcp.json
        let vscode_mcp = project_path.join(".vscode").join("mcp.json");
        let has_mcp = check_vscode_mcp(&vscode_mcp);
        if has_mcp {
            config_files.push(vscode_mcp.to_string_lossy().to_string());
        }

        let copilot_md = project_path.join(".github").join("copilot-instructions.md");
        let has_copilot = copilot_md.exists();
        if has_copilot {
            config_files.push(copilot_md.to_string_lossy().to_string());
        }

        let has_agents = has_agents_dir(project_path);
        if has_agents {
            config_files.push(agents_dir_path(project_path).to_string_lossy().to_string());
        }

        let status = if has_mcp && has_copilot && has_agents {
            IntegrationStatus::Configured
        } else if has_mcp || has_copilot || has_agents {
            IntegrationStatus::NeedsUpdate
        } else {
            IntegrationStatus::NotConfigured
        };

        Ok(IntegrationConfig {
            integration_type: IntegrationType::Vscode,
            status,
            config_files,
            dev_mode: false,
        })
    }
}

// VS Code uses a different MCP format: { "servers": { ... } } with a "type" field.

fn upsert_vscode_mcp(
    mcp_path: &std::path::Path,
    project_path: &Path,
    dev_mode: bool,
    result: &mut IntegrationResult,
) -> Result<(), String> {
    let mut config = read_json_or_default(mcp_path)?;
    let existed = mcp_path.exists();

    let servers = config
        .as_object_mut()
        .ok_or("mcp.json is not a JSON object")?
        .entry("servers")
        .or_insert_with(|| serde_json::json!({}));

    let mut entry = mcp_server_entry(project_path, dev_mode);
    // VS Code requires an explicit "type" field
    entry.as_object_mut().unwrap().insert("type".to_string(), serde_json::json!("stdio"));

    servers
        .as_object_mut()
        .ok_or("servers is not a JSON object")?
        .insert("aidd-engine".to_string(), entry);

    write_json(mcp_path, &config)?;
    if existed {
        result.files_modified.push(mcp_path.to_string_lossy().to_string());
    } else {
        result.files_created.push(mcp_path.to_string_lossy().to_string());
    }
    Ok(())
}

fn remove_vscode_mcp(
    mcp_path: &std::path::Path,
    result: &mut IntegrationResult,
) -> Result<(), String> {
    if !mcp_path.exists() {
        return Ok(());
    }
    let mut config = read_json_or_default(mcp_path)?;
    if let Some(servers) = config.get_mut("servers").and_then(|s| s.as_object_mut()) {
        if servers.remove("aidd-engine").is_some() {
            write_json(mcp_path, &config)?;
            result.files_modified.push(mcp_path.to_string_lossy().to_string());
        }
    }
    Ok(())
}

fn check_vscode_mcp(mcp_path: &std::path::Path) -> bool {
    if !mcp_path.exists() {
        return false;
    }
    read_json_or_default(mcp_path)
        .ok()
        .and_then(|c| c.get("servers")?.get("aidd-engine").cloned())
        .is_some()
}
