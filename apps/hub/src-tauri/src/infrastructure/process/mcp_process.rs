use std::collections::HashMap;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

use crate::domain::model::{McpServer, McpServerMode, McpServerStatus};

/// Tracks a running MCP server process.
struct RunningProcess {
    child: Child,
    name: String,
    mode: McpServerMode,
    started_at: String,
}

/// Infrastructure adapter for spawning/killing MCP server processes.
pub struct McpProcessManager {
    processes: Mutex<HashMap<String, RunningProcess>>,
}

impl McpProcessManager {
    pub fn new() -> Self {
        Self {
            processes: Mutex::new(HashMap::new()),
        }
    }

    /// Start an MCP server process.
    ///
    /// `package` is one of: "monolithic", "core", "memory", "tools"
    pub fn start(&self, package: &str, mode: McpServerMode) -> Result<McpServer, String> {
        let mut procs = self.processes.lock().map_err(|e| e.to_string())?;

        // Check if already running
        if procs.contains_key(package) {
            return Err(format!("Server '{}' is already running", package));
        }

        let (name, cmd_args) = resolve_command(package)?;

        let child = Command::new(&cmd_args[0])
            .args(&cmd_args[1..])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start {}: {}", name, e))?;

        let pid = child.id();
        let now = chrono_now();

        procs.insert(
            package.to_string(),
            RunningProcess {
                child,
                name: name.clone(),
                mode: mode.clone(),
                started_at: now.clone(),
            },
        );

        Ok(McpServer {
            id: package.to_string(),
            name,
            mode,
            status: McpServerStatus::Running,
            pid: Some(pid),
            started_at: Some(now),
            error: None,
        })
    }

    /// Stop a running MCP server.
    pub fn stop(&self, server_id: &str) -> Result<(), String> {
        let mut procs = self.processes.lock().map_err(|e| e.to_string())?;

        if let Some(mut proc) = procs.remove(server_id) {
            proc.child
                .kill()
                .map_err(|e| format!("Failed to kill {}: {}", server_id, e))?;
            let _ = proc.child.wait(); // reap zombie
            Ok(())
        } else {
            Err(format!("No running server with id '{}'", server_id))
        }
    }

    /// Stop all running servers (called on app shutdown).
    pub fn stop_all(&self) -> Result<(), String> {
        let mut procs = self.processes.lock().map_err(|e| e.to_string())?;
        for (id, mut proc) in procs.drain() {
            if let Err(e) = proc.child.kill() {
                eprintln!("[mcpd] Failed to kill {}: {}", id, e);
            }
            let _ = proc.child.wait();
        }
        Ok(())
    }

    /// Get status of all tracked servers (running + check if still alive).
    pub fn get_servers(&self) -> Vec<McpServer> {
        let mut procs = self.processes.lock().unwrap_or_else(|e| e.into_inner());
        let mut result = Vec::new();
        let mut dead = Vec::new();

        for (id, proc) in procs.iter_mut() {
            // Check if process is still alive
            match proc.child.try_wait() {
                Ok(Some(_exit)) => {
                    // Process has exited
                    result.push(McpServer {
                        id: id.clone(),
                        name: proc.name.clone(),
                        mode: proc.mode.clone(),
                        status: McpServerStatus::Stopped,
                        pid: None,
                        started_at: Some(proc.started_at.clone()),
                        error: Some("Process exited unexpectedly".to_string()),
                    });
                    dead.push(id.clone());
                }
                Ok(None) => {
                    // Still running
                    result.push(McpServer {
                        id: id.clone(),
                        name: proc.name.clone(),
                        mode: proc.mode.clone(),
                        status: McpServerStatus::Running,
                        pid: Some(proc.child.id()),
                        started_at: Some(proc.started_at.clone()),
                        error: None,
                    });
                }
                Err(e) => {
                    result.push(McpServer {
                        id: id.clone(),
                        name: proc.name.clone(),
                        mode: proc.mode.clone(),
                        status: McpServerStatus::Error,
                        pid: None,
                        started_at: Some(proc.started_at.clone()),
                        error: Some(format!("Status check failed: {}", e)),
                    });
                }
            }
        }

        // Clean up dead processes
        for id in dead {
            procs.remove(&id);
        }

        result
    }
}

/// Resolve package name to display name and command.
fn resolve_command(package: &str) -> Result<(String, Vec<String>), String> {
    match package {
        "monolithic" => Ok((
            "@aidd.md/mcp".to_string(),
            vec!["npx".to_string(), "-y".to_string(), "@aidd.md/mcp".to_string()],
        )),
        "core" => Ok((
            "@aidd.md/mcp-core".to_string(),
            vec!["npx".to_string(), "-y".to_string(), "@aidd.md/mcp-core".to_string()],
        )),
        "memory" => Ok((
            "@aidd.md/mcp-memory".to_string(),
            vec!["npx".to_string(), "-y".to_string(), "@aidd.md/mcp-memory".to_string()],
        )),
        "tools" => Ok((
            "@aidd.md/mcp-tools".to_string(),
            vec!["npx".to_string(), "-y".to_string(), "@aidd.md/mcp-tools".to_string()],
        )),
        _ => Err(format!(
            "Unknown package '{}'. Valid: monolithic, core, memory, tools",
            package
        )),
    }
}

fn chrono_now() -> String {
    let now = std::time::SystemTime::now();
    format!("{:?}", now)
}
