use serde_json::json;
use std::sync::Arc;

use crate::domain::ports::inbound::{
    EvolutionStatus, MemoryPort, ObservationEntry, PatternStats, SessionInfo, SessionSummary,
};
use crate::infrastructure::mcp::McpClient;

/// MCP Adapter for Memory Port.
/// Connects to a running AIDD engine via JSON-RPC 2.0 over stdio.
/// Implements the MemoryPort interface (Dependency Inversion).
///
/// Usage:
/// 1. Create an McpClient (spawns engine process)
/// 2. Initialize the MCP connection
/// 3. Pass the client to McpMemoryAdapter
pub struct McpMemoryAdapter {
    client: Arc<McpClient>,
}

impl McpMemoryAdapter {
    pub fn new(client: Arc<McpClient>) -> Self {
        Self { client }
    }

    /// Extract text content from MCP tool result.
    /// MCP tools return `{ content: [{ type: "text", text: "..." }] }`.
    fn extract_text_content(result: &serde_json::Value) -> Option<String> {
        result
            .get("content")
            .and_then(|c| c.as_array())
            .and_then(|arr| arr.first())
            .and_then(|item| item.get("text"))
            .and_then(|t| t.as_str())
            .map(|s| s.to_string())
    }
}

impl MemoryPort for McpMemoryAdapter {
    fn get_session_summary(&self) -> Result<SessionSummary, String> {
        let result = self
            .client
            .call_tool("aidd_session", json!({ "action": "list", "limit": 50 }))
            .map_err(|e| format!("aidd_session failed: {}", e))?;

        let text = Self::extract_text_content(&result).unwrap_or_default();
        let data: serde_json::Value =
            serde_json::from_str(&text).unwrap_or(serde_json::Value::Null);

        let sessions = data
            .get("sessions")
            .and_then(|s| s.as_array())
            .cloned()
            .unwrap_or_default();

        let total = sessions.len();
        let active = sessions
            .iter()
            .filter(|s| s.get("status").and_then(|v| v.as_str()) == Some("active"))
            .count();
        let completed = total.saturating_sub(active);

        let recent_sessions: Vec<SessionInfo> = sessions
            .iter()
            .take(5)
            .filter_map(|s| {
                Some(SessionInfo {
                    id: s.get("id")?.as_str()?.to_string(),
                    branch: s
                        .get("branch")
                        .and_then(|b| b.as_str())
                        .unwrap_or("")
                        .to_string(),
                    started_at: s
                        .get("startedAt")
                        .and_then(|d| d.as_str())
                        .unwrap_or("")
                        .to_string(),
                    status: s
                        .get("status")
                        .and_then(|v| v.as_str())
                        .unwrap_or("completed")
                        .to_string(),
                })
            })
            .collect();

        Ok(SessionSummary {
            total,
            active,
            completed,
            recent_sessions,
        })
    }

    fn search_observations(
        &self,
        query: &str,
        limit: Option<usize>,
    ) -> Result<Vec<ObservationEntry>, String> {
        let limit = limit.unwrap_or(10);

        let result = self
            .client
            .call_tool(
                "aidd_memory_search",
                json!({
                    "query": query,
                    "limit": limit
                }),
            )
            .map_err(|e| format!("aidd_memory_search failed: {}", e))?;

        let text = Self::extract_text_content(&result).unwrap_or_default();
        let data: serde_json::Value =
            serde_json::from_str(&text).unwrap_or(serde_json::Value::Null);

        let entries = data
            .get("entries")
            .and_then(|e| e.as_array())
            .cloned()
            .unwrap_or_default();

        Ok(entries
            .iter()
            .filter_map(|e| {
                Some(ObservationEntry {
                    id: e.get("id")?.as_str()?.to_string(),
                    session_id: e
                        .get("sessionId")
                        .and_then(|s| s.as_str())
                        .unwrap_or("")
                        .to_string(),
                    title: e
                        .get("title")
                        .and_then(|t| t.as_str())
                        .unwrap_or("")
                        .to_string(),
                    observation_type: e
                        .get("type")
                        .and_then(|t| t.as_str())
                        .unwrap_or("")
                        .to_string(),
                    created_at: e
                        .get("createdAt")
                        .and_then(|d| d.as_str())
                        .unwrap_or("")
                        .to_string(),
                })
            })
            .collect())
    }

    fn get_evolution_status(&self) -> Result<EvolutionStatus, String> {
        let result = self
            .client
            .call_tool("aidd_evolution_status", json!({}))
            .map_err(|e| format!("aidd_evolution_status failed: {}", e))?;

        let text = Self::extract_text_content(&result).unwrap_or_default();
        let data: serde_json::Value =
            serde_json::from_str(&text).unwrap_or(serde_json::Value::Null);

        Ok(EvolutionStatus {
            pending_count: data
                .get("pending")
                .and_then(|v| v.as_u64())
                .unwrap_or(0) as usize,
            approved_count: data
                .get("approved")
                .and_then(|v| v.as_u64())
                .unwrap_or(0) as usize,
            rejected_count: data
                .get("rejected")
                .and_then(|v| v.as_u64())
                .unwrap_or(0) as usize,
            auto_applied_count: data
                .get("autoApplied")
                .and_then(|v| v.as_u64())
                .unwrap_or(0) as usize,
        })
    }

    fn get_pattern_stats(&self) -> Result<PatternStats, String> {
        let result = self
            .client
            .call_tool("aidd_pattern_stats", json!({}))
            .map_err(|e| format!("aidd_pattern_stats failed: {}", e))?;

        let text = Self::extract_text_content(&result).unwrap_or_default();
        let data: serde_json::Value =
            serde_json::from_str(&text).unwrap_or(serde_json::Value::Null);

        Ok(PatternStats {
            total_patterns: data
                .get("totalPatterns")
                .and_then(|v| v.as_u64())
                .unwrap_or(0) as usize,
            active_patterns: data
                .get("activePatterns")
                .and_then(|v| v.as_u64())
                .unwrap_or(0) as usize,
            total_detections: data
                .get("totalDetections")
                .and_then(|v| v.as_u64())
                .unwrap_or(0) as usize,
            false_positives: data
                .get("falsePositives")
                .and_then(|v| v.as_u64())
                .unwrap_or(0) as usize,
        })
    }
}
