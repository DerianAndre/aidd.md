use std::sync::Arc;
use std::path::PathBuf;

use crate::domain::model::{McpServer, McpServerMode};
use crate::domain::ports::inbound::{McpPort, ProjectPort};
use crate::infrastructure::mcp::McpClient;
use crate::infrastructure::process::McpProcessManager;
use crate::application::ProjectService;
use serde_json::Value;

pub struct McpService {
    process_manager: Arc<McpProcessManager>,
    project_service: Arc<ProjectService>,
}

impl McpService {
    pub fn new(process_manager: Arc<McpProcessManager>, project_service: Arc<ProjectService>) -> Self {
        Self { process_manager, project_service }
    }

    fn normalize_package(package: &str) -> Result<(&'static str, &'static str), String> {
        match package {
            "engine" | "mcp-aidd-engine" | "@aidd.md/mcp-engine" => {
                Ok(("mcps/mcp-aidd-engine/dist/index.js", "@aidd.md/mcp-engine"))
            }
            "core" | "mcp-aidd-core" | "@aidd.md/mcp-core" => {
                Ok(("mcps/mcp-aidd-core/dist/index.js", "@aidd.md/mcp-core"))
            }
            "memory" | "mcp-aidd-memory" | "@aidd.md/mcp-memory" => {
                Ok(("mcps/mcp-aidd-memory/dist/index.js", "@aidd.md/mcp-memory"))
            }
            "tools" | "mcp-aidd-tools" | "@aidd.md/mcp-tools" => {
                Ok(("mcps/mcp-aidd-tools/dist/index.js", "@aidd.md/mcp-tools"))
            }
            _ => Err(format!(
                "Unknown package '{}'. Valid: engine, core, memory, tools",
                package
            )),
        }
    }

    fn resolve_client_command(&self, package: &str) -> Result<(String, Vec<String>), String> {
        let (local_rel, npm_name) = Self::normalize_package(package)?;

        let active_project = self
            .project_service
            .get_active_path()
            .map_err(|e| format!("Failed to resolve active project: {}", e))?;

        if let Some(root) = active_project {
            let local_path = PathBuf::from(root).join(local_rel);
            if local_path.exists() {
                return Ok((
                    "node".to_string(),
                    vec![local_path.to_string_lossy().to_string()],
                ));
            }
        }

        // Fallback to npx if local dist bundle is unavailable.
        Ok((
            "npx".to_string(),
            vec!["-y".to_string(), npm_name.to_string()],
        ))
    }

    fn with_client<F, T>(&self, package: &str, f: F) -> Result<T, String>
    where
        F: FnOnce(&McpClient) -> Result<T, String>,
    {
        let (command, args) = self.resolve_client_command(package)?;
        let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
        let active_project = self
            .project_service
            .get_active_path()
            .map_err(|e| format!("Failed to resolve active project: {}", e))?;
        let client = if let Some(root) = active_project.as_deref() {
            let env_pairs = project_scope_env(&command, root);
            let env = (!env_pairs.is_empty()).then_some(env_pairs.as_slice());
            McpClient::spawn_with_context(&command, &arg_refs, Some(root), env)
                .map_err(|e| format!("Failed to spawn MCP client for '{}': {}", package, e))?
        } else {
            McpClient::spawn(&command, &arg_refs)
                .map_err(|e| format!("Failed to spawn MCP client for '{}': {}", package, e))?
        };
        client
            .initialize()
            .map_err(|e| format!("Failed to initialize MCP client for '{}': {}", package, e))?;
        f(&client)
    }
}

/// Build optional env overrides for MCP subprocess scope.
///
/// Local project-launched servers (`node <project>/mcps/...`) get scope from `cwd`.
/// Global fallbacks (`npx @aidd.md/...`) also receive `AIDD_PROJECT_PATH` as an explicit hint.
fn project_scope_env<'a>(command: &str, project_root: &'a str) -> Vec<(&'static str, &'a str)> {
    if command.eq_ignore_ascii_case("npx") {
        vec![("AIDD_PROJECT_PATH", project_root)]
    } else {
        Vec::new()
    }
}

#[cfg(test)]
mod tests {
    use super::project_scope_env;

    #[test]
    fn project_scope_env_is_empty_for_local_node_runtime() {
        let env = project_scope_env("node", "C:/repo/aidd.md");
        assert!(env.is_empty());
    }

    #[test]
    fn project_scope_env_injects_hint_for_global_npx_runtime() {
        let env = project_scope_env("npx", "C:/repo/aidd.md");
        assert_eq!(env.len(), 1);
        assert_eq!(env[0].0, "AIDD_PROJECT_PATH");
        assert_eq!(env[0].1, "C:/repo/aidd.md");
    }
}

impl McpPort for McpService {
    fn start_server(&self, package: &str, mode: McpServerMode) -> Result<McpServer, String> {
        self.process_manager.start(package, mode)
    }

    fn stop_server(&self, server_id: &str) -> Result<(), String> {
        self.process_manager.stop(server_id)
    }

    fn stop_all(&self) -> Result<(), String> {
        self.process_manager.stop_all()
    }

    fn get_servers(&self) -> Vec<McpServer> {
        self.process_manager.get_servers()
    }

    fn list_tools(&self, package: &str) -> Result<Vec<Value>, String> {
        self.with_client(package, |client| {
            let result = client.list_tools()?;
            let tools = result
                .get("tools")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();
            Ok(tools)
        })
    }

    fn call_tool(&self, package: &str, tool_name: &str, arguments: Value) -> Result<Value, String> {
        self.with_client(package, |client| client.call_tool(tool_name, arguments))
    }
}
