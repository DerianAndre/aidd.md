use std::path::{Path, PathBuf};
use crate::domain::model::{DiscoveredMcp, McpConfigScope, McpToolSource};
use super::adapter_trait::read_json_or_default;

/// Scans MCP config files from all supported AI tools across global and project scopes.
pub struct McpConfigScanner {
    home_dir: PathBuf,
    config_dir: Option<PathBuf>,
}

impl McpConfigScanner {
    pub fn new() -> Self {
        Self {
            home_dir: dirs::home_dir().expect("Cannot resolve home directory"),
            config_dir: dirs::config_dir(),
        }
    }

    /// Scan all known config locations and return discovered MCP entries.
    pub fn scan(&self, project_path: Option<&str>) -> Result<Vec<DiscoveredMcp>, String> {
        let mut discovered = Vec::new();

        // ── Claude Code ──────────────────────────────────────────────

        // Global: walk ~/.claude/plugins/ for .mcp.json files
        let plugins_dir = self.home_dir.join(".claude").join("plugins");
        if plugins_dir.exists() {
            self.walk_mcp_json_files(
                &plugins_dir,
                McpToolSource::ClaudeCode,
                McpConfigScope::Global,
                &mut discovered,
            );
        }

        // Project: {project}/.mcp.json (Claude Code project-level MCP config)
        if let Some(project) = project_path {
            self.scan_mcp_json_file(
                &Path::new(project).join(".mcp.json"),
                McpToolSource::ClaudeCode,
                McpConfigScope::Project,
                &mut discovered,
            );
        }

        // ── Cursor ───────────────────────────────────────────────────

        // Global: ~/.cursor/mcp.json
        self.scan_standard_config(
            &self.home_dir.join(".cursor").join("mcp.json"),
            McpToolSource::Cursor,
            McpConfigScope::Global,
            &mut discovered,
        );

        // Project: {project}/.cursor/mcp.json
        if let Some(project) = project_path {
            self.scan_standard_config(
                &Path::new(project).join(".cursor").join("mcp.json"),
                McpToolSource::Cursor,
                McpConfigScope::Project,
                &mut discovered,
            );
        }

        // ── VS Code ─────────────────────────────────────────────────

        // Global: %APPDATA%/Code/User/settings.json
        if let Some(ref config_dir) = self.config_dir {
            self.scan_vscode_config(
                &config_dir.join("Code").join("User").join("settings.json"),
                McpConfigScope::Global,
                &mut discovered,
            );
        }

        // Project: {project}/.vscode/settings.json
        if let Some(project) = project_path {
            self.scan_vscode_config(
                &Path::new(project).join(".vscode").join("settings.json"),
                McpConfigScope::Project,
                &mut discovered,
            );
        }

        // ── Gemini ───────────────────────────────────────────────────

        // Global: ~/.gemini/settings.json
        self.scan_standard_config(
            &self.home_dir.join(".gemini").join("settings.json"),
            McpToolSource::Gemini,
            McpConfigScope::Global,
            &mut discovered,
        );

        // Project: {project}/.gemini/settings.json
        if let Some(project) = project_path {
            self.scan_standard_config(
                &Path::new(project).join(".gemini").join("settings.json"),
                McpToolSource::Gemini,
                McpConfigScope::Project,
                &mut discovered,
            );
        }

        Ok(discovered)
    }

    // ── Scanning strategies ─────────────────────────────────────────

    /// Recursively walk a directory tree looking for `.mcp.json` files.
    /// Used for Claude Code's plugin directory structure.
    fn walk_mcp_json_files(
        &self,
        dir: &Path,
        tool: McpToolSource,
        scope: McpConfigScope,
        out: &mut Vec<DiscoveredMcp>,
    ) {
        let entries = match std::fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => return,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                self.walk_mcp_json_files(&path, tool.clone(), scope.clone(), out);
            } else if path.file_name().map(|n| n == ".mcp.json").unwrap_or(false) {
                self.scan_mcp_json_file(&path, tool.clone(), scope.clone(), out);
            }
        }
    }

    /// Parse a `.mcp.json` file that may use either format:
    ///  - Pattern A: `{ "mcpServers": { "name": { ... } } }`  (marketplace standard)
    ///  - Pattern B: `{ "name": { "type": "...", ... } }`      (direct server definitions)
    fn scan_mcp_json_file(
        &self,
        path: &Path,
        tool: McpToolSource,
        scope: McpConfigScope,
        out: &mut Vec<DiscoveredMcp>,
    ) {
        if !path.exists() {
            return;
        }
        let config = match read_json_or_default(path) {
            Ok(v) => v,
            Err(_) => return, // Malformed JSON — skip silently
        };

        let obj = match config.as_object() {
            Some(o) => o,
            None => return,
        };

        // Skip empty objects
        if obj.is_empty() {
            return;
        }

        let config_path = path.to_string_lossy().to_string();

        // Pattern A: { "mcpServers": { ... } }
        if let Some(servers) = obj.get("mcpServers").and_then(|v| v.as_object()) {
            for (name, entry) in servers {
                push_discovered(name, entry, &tool, &scope, &config_path, out);
            }
            return;
        }

        // Pattern B: direct server definitions at root level
        for (name, entry) in obj {
            if entry.is_object() && is_server_definition(entry) {
                push_discovered(name, entry, &tool, &scope, &config_path, out);
            }
        }
    }

    /// Scan a config file with standard `{ "mcpServers": { ... } }` format.
    /// Used by Cursor and Gemini.
    fn scan_standard_config(
        &self,
        path: &Path,
        tool: McpToolSource,
        scope: McpConfigScope,
        out: &mut Vec<DiscoveredMcp>,
    ) {
        if !path.exists() {
            return;
        }
        let config = match read_json_or_default(path) {
            Ok(v) => v,
            Err(_) => return,
        };

        let servers = match config.get("mcpServers").and_then(|v| v.as_object()) {
            Some(s) => s,
            None => return,
        };

        let config_path = path.to_string_lossy().to_string();

        for (name, entry) in servers {
            push_discovered(name, entry, &tool, &scope, &config_path, out);
        }
    }

    /// Scan VS Code settings which use `{ "mcp": { "servers": { ... } } }` format.
    fn scan_vscode_config(
        &self,
        path: &Path,
        scope: McpConfigScope,
        out: &mut Vec<DiscoveredMcp>,
    ) {
        if !path.exists() {
            return;
        }
        let config = match read_json_or_default(path) {
            Ok(v) => v,
            Err(_) => return,
        };

        let servers = match config
            .get("mcp")
            .and_then(|v| v.get("servers"))
            .and_then(|v| v.as_object())
        {
            Some(s) => s,
            None => return,
        };

        let config_path = path.to_string_lossy().to_string();

        for (name, entry) in servers {
            push_discovered(name, entry, &McpToolSource::Vscode, &scope, &config_path, out);
        }
    }
}

// ── Helpers ─────────────────────────────────────────────────────────

/// Check if a JSON object looks like an MCP server definition
/// (has `type`, `command`, or `url` keys).
fn is_server_definition(value: &serde_json::Value) -> bool {
    let obj = match value.as_object() {
        Some(o) => o,
        None => return false,
    };
    obj.contains_key("type") || obj.contains_key("command") || obj.contains_key("url")
}

/// Extract server details from a JSON entry and push a DiscoveredMcp.
fn push_discovered(
    name: &str,
    entry: &serde_json::Value,
    tool: &McpToolSource,
    scope: &McpConfigScope,
    config_path: &str,
    out: &mut Vec<DiscoveredMcp>,
) {
    let command = entry.get("command").and_then(|v| v.as_str()).map(String::from);
    let args: Option<Vec<String>> = entry
        .get("args")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect());
    let url = entry.get("url").and_then(|v| v.as_str()).map(String::from);

    // Read explicit type from config, or derive from command/url presence
    let transport_type = entry
        .get("type")
        .and_then(|v| v.as_str())
        .map(String::from)
        .or_else(|| {
            if command.is_some() {
                Some("stdio".to_string())
            } else if url.is_some() {
                Some("http".to_string())
            } else {
                None
            }
        });

    let is_aidd = detect_aidd(&command, &args);

    out.push(DiscoveredMcp {
        name: name.to_string(),
        tool: tool.clone(),
        scope: scope.clone(),
        config_path: config_path.to_string(),
        command,
        args,
        url,
        transport_type,
        is_aidd,
    });
}

/// Check if a discovered MCP entry belongs to the aidd.md ecosystem.
fn detect_aidd(command: &Option<String>, args: &Option<Vec<String>>) -> bool {
    if let Some(ref args) = args {
        if args.iter().any(|a| a.contains("@aidd.md/")) {
            return true;
        }
    }
    if let Some(ref cmd) = command {
        if cmd.contains("aidd") {
            return true;
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_aidd_with_args() {
        let cmd = Some("npx".to_string());
        let args = Some(vec!["-y".to_string(), "@aidd.md/mcp-engine".to_string()]);
        assert!(detect_aidd(&cmd, &args));
    }

    #[test]
    fn test_detect_aidd_negative() {
        let cmd = Some("npx".to_string());
        let args = Some(vec!["-y".to_string(), "@modelcontextprotocol/server-filesystem".to_string()]);
        assert!(!detect_aidd(&cmd, &args));
    }

    #[test]
    fn test_detect_aidd_no_args() {
        let cmd: Option<String> = None;
        let args: Option<Vec<String>> = None;
        assert!(!detect_aidd(&cmd, &args));
    }

    #[test]
    fn test_is_server_definition_with_type() {
        let val = serde_json::json!({ "type": "http", "url": "https://example.com" });
        assert!(is_server_definition(&val));
    }

    #[test]
    fn test_is_server_definition_with_command() {
        let val = serde_json::json!({ "command": "npx", "args": ["-y", "some-pkg"] });
        assert!(is_server_definition(&val));
    }

    #[test]
    fn test_is_server_definition_negative() {
        let val = serde_json::json!({ "name": "foo", "version": "1.0" });
        assert!(!is_server_definition(&val));
    }
}
