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

        // Claude Code — global
        self.scan_standard_config(
            &self.home_dir.join(".claude").join("mcp.json"),
            McpToolSource::ClaudeCode,
            McpConfigScope::Global,
            &mut discovered,
        );

        // Claude Code — project
        if let Some(project) = project_path {
            self.scan_standard_config(
                &Path::new(project).join(".claude").join("settings.json"),
                McpToolSource::ClaudeCode,
                McpConfigScope::Project,
                &mut discovered,
            );
        }

        // Cursor — project only (no global config)
        if let Some(project) = project_path {
            self.scan_standard_config(
                &Path::new(project).join(".cursor").join("mcp.json"),
                McpToolSource::Cursor,
                McpConfigScope::Project,
                &mut discovered,
            );
        }

        // VS Code — global
        if let Some(ref config_dir) = self.config_dir {
            self.scan_vscode_config(
                &config_dir.join("Code").join("User").join("settings.json"),
                McpConfigScope::Global,
                &mut discovered,
            );
        }

        // VS Code — project
        if let Some(project) = project_path {
            self.scan_vscode_config(
                &Path::new(project).join(".vscode").join("settings.json"),
                McpConfigScope::Project,
                &mut discovered,
            );
        }

        // Gemini — global
        self.scan_standard_config(
            &self.home_dir.join(".gemini").join("settings.json"),
            McpToolSource::Gemini,
            McpConfigScope::Global,
            &mut discovered,
        );

        // Gemini — project
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

    /// Scan a config file with standard `{ "mcpServers": { ... } }` format.
    /// Used by Claude Code, Cursor, and Gemini.
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
            Err(_) => return, // Malformed JSON — skip silently
        };

        let servers = match config.get("mcpServers").and_then(|v| v.as_object()) {
            Some(s) => s,
            None => return,
        };

        let config_path = path.to_string_lossy().to_string();

        for (name, entry) in servers {
            let command = entry.get("command").and_then(|v| v.as_str()).map(String::from);
            let args: Option<Vec<String>> = entry
                .get("args")
                .and_then(|v| v.as_array())
                .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect());

            let is_aidd = detect_aidd(&command, &args);

            out.push(DiscoveredMcp {
                name: name.clone(),
                tool: tool.clone(),
                scope: scope.clone(),
                config_path: config_path.clone(),
                command,
                args,
                is_aidd,
            });
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
            let command = entry.get("command").and_then(|v| v.as_str()).map(String::from);
            let args: Option<Vec<String>> = entry
                .get("args")
                .and_then(|v| v.as_array())
                .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect());

            let is_aidd = detect_aidd(&command, &args);

            out.push(DiscoveredMcp {
                name: name.clone(),
                tool: McpToolSource::Vscode,
                scope: scope.clone(),
                config_path: config_path.clone(),
                command,
                args,
                is_aidd,
            });
        }
    }
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
        let args = Some(vec!["-y".to_string(), "@aidd.md/mcp".to_string()]);
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
}
