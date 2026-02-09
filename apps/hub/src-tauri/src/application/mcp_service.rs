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
        let client = McpClient::spawn(&command, &arg_refs)
            .map_err(|e| format!("Failed to spawn MCP client for '{}': {}", package, e))?;
        client
            .initialize()
            .map_err(|e| format!("Failed to initialize MCP client for '{}': {}", package, e))?;
        f(&client)
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
