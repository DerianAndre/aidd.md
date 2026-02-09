use serde_json::{json, Value};
use std::io::{BufRead, BufReader, BufWriter, Read, Write};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

/// MCP protocol version supported by this client.
const MCP_PROTOCOL_VERSION: &str = "2025-11-05";

/// Client info sent during initialization.
const CLIENT_NAME: &str = "aidd-hub";
const CLIENT_VERSION: &str = "1.0.0";

/// JSON-RPC 2.0 client for MCP servers over stdio.
///
/// Spawns a dedicated engine process and communicates via stdin/stdout.
/// Thread-safe: all I/O is Mutex-protected.
pub struct McpClient {
    _child: Mutex<Child>,
    stdin: Mutex<BufWriter<ChildStdin>>,
    stdout: Mutex<BufReader<ChildStdout>>,
    next_id: AtomicU64,
    initialized: std::sync::atomic::AtomicBool,
}

impl McpClient {
  /// Spawn an MCP server process and create a client connected to it.
  ///
  /// The process is spawned with piped stdin/stdout for JSON-RPC communication.
  /// Stderr is inherited (logs to parent process stderr).
  pub fn spawn(command: &str, args: &[&str]) -> Result<Self, String> {
        Self::spawn_with_context(command, args, None, None)
    }

    /// Spawn an MCP server process with optional project execution context.
    ///
    /// `cwd`: current working directory for process execution.
    /// `env`: additional environment variables.
    pub fn spawn_with_context(
        command: &str,
        args: &[&str],
        cwd: Option<&str>,
        env: Option<&[(&str, &str)]>,
    ) -> Result<Self, String> {
        let mut cmd = Command::new(command);
        cmd.args(args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit());

        if let Some(dir) = cwd {
            cmd.current_dir(dir);
        }
        if let Some(env_pairs) = env {
            for &(key, value) in env_pairs {
                cmd.env(key, value);
            }
        }

        let mut child = cmd
            .spawn()
            .map_err(|e| format!("Failed to spawn MCP server: {}", e))?;

        let stdin = child.stdin.take().ok_or("Failed to capture stdin")?;
        let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;

        Ok(Self {
            _child: Mutex::new(child),
            stdin: Mutex::new(BufWriter::new(stdin)),
            stdout: Mutex::new(BufReader::new(stdout)),
            next_id: AtomicU64::new(1),
            initialized: std::sync::atomic::AtomicBool::new(false),
        })
    }

    /// Perform the MCP initialization handshake.
    ///
    /// Must be called before any tool invocations.
    /// Sends `initialize` request + `notifications/initialized` notification.
    pub fn initialize(&self) -> Result<Value, String> {
        if self.initialized.load(Ordering::SeqCst) {
            return Ok(json!({"already_initialized": true}));
        }

        // Step 1: Send initialize request
        let result = self.send_request(
            "initialize",
            json!({
                "protocolVersion": MCP_PROTOCOL_VERSION,
                "capabilities": {},
                "clientInfo": {
                    "name": CLIENT_NAME,
                    "version": CLIENT_VERSION
                }
            }),
        )?;

        // Step 2: Send initialized notification (no response expected)
        self.send_notification("notifications/initialized", json!({}))?;

        self.initialized.store(true, Ordering::SeqCst);
        Ok(result)
    }

    /// Call an MCP tool by name with arguments.
    ///
    /// Returns the tool result content. Requires prior initialization.
    pub fn call_tool(&self, name: &str, arguments: Value) -> Result<Value, String> {
        if !self.initialized.load(Ordering::SeqCst) {
            return Err("Client not initialized. Call initialize() first.".to_string());
        }

        self.send_request(
            "tools/call",
            json!({
                "name": name,
                "arguments": arguments
            }),
        )
    }

    /// List available MCP tools.
    pub fn list_tools(&self) -> Result<Value, String> {
        if !self.initialized.load(Ordering::SeqCst) {
            return Err("Client not initialized. Call initialize() first.".to_string());
        }

        self.send_request("tools/list", json!({}))
    }

    /// Send a JSON-RPC 2.0 request and wait for the response.
    fn send_request(&self, method: &str, params: Value) -> Result<Value, String> {
        let id = self.next_id.fetch_add(1, Ordering::SeqCst);

        let request = json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": method,
            "params": params
        });

        // Write request using Content-Length framing (MCP stdio transport).
        {
            let mut stdin = self.stdin.lock().map_err(|e| format!("stdin lock: {}", e))?;
            Self::write_message(&mut stdin, &request)?;
        }

        // Read response — skip notifications until we get a response with matching id
        let mut stdout = self.stdout.lock().map_err(|e| format!("stdout lock: {}", e))?;

        loop {
            let msg = Self::read_message(&mut stdout)?;

            // Check if this is our response (has matching id)
            if let Some(resp_id) = msg.get("id") {
                if resp_id.as_u64() == Some(id) {
                    // Check for error
                    if let Some(error) = msg.get("error") {
                        let code = error.get("code").and_then(|c| c.as_i64()).unwrap_or(-1);
                        let message = error
                            .get("message")
                            .and_then(|m| m.as_str())
                            .unwrap_or("Unknown error");
                        return Err(format!("JSON-RPC error {}: {}", code, message));
                    }

                    // Return result
                    return Ok(msg.get("result").cloned().unwrap_or(Value::Null));
                }
            }
            // Not our response (notification or different id) — skip and keep reading
        }
    }

    /// Send a JSON-RPC 2.0 notification (no response expected).
    fn send_notification(&self, method: &str, params: Value) -> Result<(), String> {
        let notification = json!({
            "jsonrpc": "2.0",
            "method": method,
            "params": params
        });

        let mut stdin = self.stdin.lock().map_err(|e| format!("stdin lock: {}", e))?;
        Self::write_message(&mut stdin, &notification)?;
        Ok(())
    }

    fn write_message(writer: &mut BufWriter<ChildStdin>, message: &Value) -> Result<(), String> {
        let payload = serde_json::to_string(message).map_err(|e| format!("serialize: {}", e))?;
        let header = format!("Content-Length: {}\r\n\r\n", payload.as_bytes().len());
        writer
            .write_all(header.as_bytes())
            .map_err(|e| format!("write header: {}", e))?;
        writer
            .write_all(payload.as_bytes())
            .map_err(|e| format!("write payload: {}", e))?;
        writer.flush().map_err(|e| format!("flush: {}", e))
    }

    fn read_message(reader: &mut BufReader<ChildStdout>) -> Result<Value, String> {
        let mut first_line = String::new();

        loop {
            first_line.clear();
            let bytes = reader
                .read_line(&mut first_line)
                .map_err(|e| format!("read header: {}", e))?;
            if bytes == 0 {
                return Err("Server closed connection (EOF)".to_string());
            }

            let trimmed = first_line.trim();
            if trimmed.is_empty() {
                continue;
            }

            // Backward-compat: accept newline-delimited JSON if encountered.
            if trimmed.starts_with('{') {
                return serde_json::from_str(trimmed).map_err(|e| format!("parse response: {}", e));
            }

            break;
        }

        let mut content_length: Option<usize> = None;
        {
            let line = first_line.trim();
            if let Some(v) = line.strip_prefix("Content-Length:") {
                content_length = v.trim().parse::<usize>().ok();
            }
        }

        loop {
            let mut line = String::new();
            let bytes = reader
                .read_line(&mut line)
                .map_err(|e| format!("read header line: {}", e))?;
            if bytes == 0 {
                return Err("Server closed connection while reading headers".to_string());
            }

            let trimmed = line.trim();
            if trimmed.is_empty() {
                break;
            }

            if let Some(v) = trimmed.strip_prefix("Content-Length:") {
                content_length = v.trim().parse::<usize>().ok();
            }
        }

        let len = content_length.ok_or("Missing Content-Length header in MCP response".to_string())?;
        let mut body = vec![0u8; len];
        reader
            .read_exact(&mut body)
            .map_err(|e| format!("read body: {}", e))?;
        let json_str = String::from_utf8(body).map_err(|e| format!("utf8 body: {}", e))?;
        serde_json::from_str(&json_str).map_err(|e| format!("parse response: {}", e))
    }

    /// Check if the client has been initialized.
    pub fn is_initialized(&self) -> bool {
        self.initialized.load(Ordering::SeqCst)
    }
}

impl Drop for McpClient {
    fn drop(&mut self) {
        if let Ok(mut child) = self._child.lock() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn json_rpc_request_format() {
        // Verify the JSON-RPC 2.0 request format is correct
        let id = 1u64;
        let request = json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": "tools/call",
            "params": {
                "name": "aidd_session",
                "arguments": { "action": "list" }
            }
        });

        let serialized = serde_json::to_string(&request).unwrap();
        assert!(serialized.contains("\"jsonrpc\":\"2.0\""));
        assert!(serialized.contains("\"method\":\"tools/call\""));
        assert!(serialized.contains("\"id\":1"));
    }

    #[test]
    fn json_rpc_notification_has_no_id() {
        let notification = json!({
            "jsonrpc": "2.0",
            "method": "notifications/initialized",
            "params": {}
        });

        let serialized = serde_json::to_string(&notification).unwrap();
        assert!(serialized.contains("\"jsonrpc\":\"2.0\""));
        assert!(!serialized.contains("\"id\""));
    }

    #[test]
    fn mcp_initialize_params_format() {
        let params = json!({
            "protocolVersion": MCP_PROTOCOL_VERSION,
            "capabilities": {},
            "clientInfo": {
                "name": CLIENT_NAME,
                "version": CLIENT_VERSION
            }
        });

        assert_eq!(
            params["protocolVersion"].as_str().unwrap(),
            "2025-11-05"
        );
        assert_eq!(params["clientInfo"]["name"].as_str().unwrap(), "aidd-hub");
    }
}
