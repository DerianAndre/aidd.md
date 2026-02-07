use serde_json::{json, Value};
use std::io::{BufRead, BufReader, BufWriter, Write};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

/// MCP protocol version supported by this client.
const MCP_PROTOCOL_VERSION: &str = "2025-11-05";

/// Client info sent during initialization.
const CLIENT_NAME: &str = "aidd-hub";
const CLIENT_VERSION: &str = "1.0.0";

/// JSON-RPC 2.0 client for MCP servers over stdio (newline-delimited JSON).
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
        let mut child = Command::new(command)
            .args(args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
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

    /// Send a JSON-RPC 2.0 request and wait for the response.
    fn send_request(&self, method: &str, params: Value) -> Result<Value, String> {
        let id = self.next_id.fetch_add(1, Ordering::SeqCst);

        let request = json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": method,
            "params": params
        });

        // Write request
        {
            let mut stdin = self.stdin.lock().map_err(|e| format!("stdin lock: {}", e))?;
            let line = serde_json::to_string(&request)
                .map_err(|e| format!("serialize: {}", e))?;
            stdin
                .write_all(line.as_bytes())
                .map_err(|e| format!("write: {}", e))?;
            stdin
                .write_all(b"\n")
                .map_err(|e| format!("write newline: {}", e))?;
            stdin.flush().map_err(|e| format!("flush: {}", e))?;
        }

        // Read response — skip notifications until we get a response with matching id
        let mut stdout = self.stdout.lock().map_err(|e| format!("stdout lock: {}", e))?;
        let mut line_buf = String::new();

        loop {
            line_buf.clear();
            let bytes_read = stdout
                .read_line(&mut line_buf)
                .map_err(|e| format!("read: {}", e))?;

            if bytes_read == 0 {
                return Err("Server closed connection (EOF)".to_string());
            }

            let trimmed = line_buf.trim();
            if trimmed.is_empty() {
                continue;
            }

            let msg: Value =
                serde_json::from_str(trimmed).map_err(|e| format!("parse response: {}", e))?;

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
        let line =
            serde_json::to_string(&notification).map_err(|e| format!("serialize: {}", e))?;
        stdin
            .write_all(line.as_bytes())
            .map_err(|e| format!("write: {}", e))?;
        stdin
            .write_all(b"\n")
            .map_err(|e| format!("write newline: {}", e))?;
        stdin.flush().map_err(|e| format!("flush: {}", e))?;
        Ok(())
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
