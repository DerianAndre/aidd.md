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

    fn list_all_observations(&self, _limit: Option<usize>) -> Result<Vec<serde_json::Value>, String> {
        Ok(vec![])
    }

    fn list_observations_by_session(
        &self,
        _session_id: &str,
        _limit: Option<usize>,
    ) -> Result<Vec<serde_json::Value>, String> {
        Ok(vec![])
    }

    fn list_all_sessions(&self, _limit: Option<usize>) -> Result<Vec<serde_json::Value>, String> {
        // MCP adapter: not yet implemented for detailed session listing
        Ok(vec![])
    }

    fn list_evolution_candidates(&self) -> Result<Vec<serde_json::Value>, String> {
        Ok(vec![])
    }

    fn list_evolution_log(&self, _limit: Option<usize>) -> Result<Vec<serde_json::Value>, String> {
        Ok(vec![])
    }

    fn list_permanent_memory(&self, _memory_type: &str) -> Result<Vec<serde_json::Value>, String> {
        Ok(vec![])
    }

    fn delete_permanent_memory(&self, _memory_type: &str, _id: &str) -> Result<(), String> {
        Ok(())
    }

    fn list_drafts(&self) -> Result<Vec<serde_json::Value>, String> {
        Ok(vec![])
    }

    fn list_artifacts(
        &self,
        _artifact_type: Option<&str>,
        _status: Option<&str>,
        _limit: Option<usize>,
    ) -> Result<Vec<serde_json::Value>, String> {
        Ok(vec![])
    }

    fn list_audit_scores(&self, _limit: Option<usize>) -> Result<Vec<serde_json::Value>, String> {
        Ok(vec![])
    }

    fn get_governance_config(&self) -> Result<serde_json::Value, String> {
        Err("Governance config reads are not supported via MCP adapter".to_string())
    }

    fn upsert_governance_config(&self, _config_json: &str) -> Result<(), String> {
        Err("Governance config writes are not supported via MCP adapter".to_string())
    }

    // Write operations — not supported via MCP adapter (use SQLite adapter)
    fn create_permanent_memory(&self, _memory_type: &str, _title: &str, _content: &str) -> Result<String, String> {
        Err("Write operations not supported via MCP adapter".to_string())
    }
    fn update_permanent_memory(&self, _id: &str, _title: &str, _content: &str) -> Result<(), String> {
        Err("Write operations not supported via MCP adapter".to_string())
    }
    fn create_artifact(&self, _artifact_type: &str, _feature: &str, _title: &str, _description: &str, _content: &str) -> Result<String, String> {
        Err("Write operations not supported via MCP adapter".to_string())
    }
    fn update_artifact(&self, _id: &str, _artifact_type: &str, _feature: &str, _title: &str, _description: &str, _content: &str, _status: &str) -> Result<(), String> {
        Err("Write operations not supported via MCP adapter".to_string())
    }
    fn archive_artifact(&self, _id: &str) -> Result<(), String> {
        Err("Write operations not supported via MCP adapter".to_string())
    }
    fn delete_artifact(&self, _id: &str) -> Result<(), String> {
        Err("Write operations not supported via MCP adapter".to_string())
    }
    fn approve_evolution_candidate(&self, _id: &str) -> Result<(), String> {
        Err("Write operations not supported via MCP adapter".to_string())
    }
    fn reject_evolution_candidate(&self, _id: &str, _reason: &str) -> Result<(), String> {
        Err("Write operations not supported via MCP adapter".to_string())
    }
    fn approve_draft(&self, _id: &str) -> Result<(), String> {
        Err("Write operations not supported via MCP adapter".to_string())
    }
    fn reject_draft(&self, _id: &str, _reason: &str) -> Result<(), String> {
        Err("Write operations not supported via MCP adapter".to_string())
    }
    fn delete_session(&self, _id: &str) -> Result<(), String> {
        Err("Write operations not supported via MCP adapter".to_string())
    }
    fn update_session(&self, _id: &str, _branch: Option<&str>, _input: Option<&str>, _output: Option<&str>) -> Result<(), String> {
        Err("Write operations not supported via MCP adapter".to_string())
    }
    fn update_session_full(&self, _id: &str, _updates_json: &str) -> Result<(), String> {
        Err("Write operations not supported via MCP adapter".to_string())
    }
    fn create_observation(&self, _session_id: &str, _obs_type: &str, _title: &str, _narrative: Option<&str>, _facts: Option<&str>, _concepts: Option<&str>, _files_read: Option<&str>, _files_modified: Option<&str>, _discovery_tokens: Option<i64>) -> Result<String, String> {
        Err("Write operations not supported via MCP adapter".to_string())
    }
    fn update_observation(&self, _id: &str, _obs_type: &str, _title: &str, _narrative: Option<&str>, _facts: Option<&str>, _concepts: Option<&str>, _files_read: Option<&str>, _files_modified: Option<&str>, _discovery_tokens: Option<i64>) -> Result<(), String> {
        Err("Write operations not supported via MCP adapter".to_string())
    }
    fn delete_observation(&self, _id: &str) -> Result<(), String> {
        Err("Write operations not supported via MCP adapter".to_string())
    }
    fn create_evolution_candidate(&self, _evo_type: &str, _title: &str, _confidence: f64, _data: &str) -> Result<String, String> {
        Err("Write operations not supported via MCP adapter".to_string())
    }
    fn update_evolution_candidate_entry(&self, _id: &str, _evo_type: &str, _title: &str, _confidence: f64, _data: &str) -> Result<(), String> {
        Err("Write operations not supported via MCP adapter".to_string())
    }
    fn delete_evolution_candidate(&self, _id: &str) -> Result<(), String> {
        Err("Write operations not supported via MCP adapter".to_string())
    }
    fn create_draft(&self, _category: &str, _title: &str, _filename: &str, _content: &str, _confidence: f64, _source: &str) -> Result<String, String> {
        Err("Write operations not supported via MCP adapter".to_string())
    }
    fn update_draft(&self, _id: &str, _title: &str, _content: &str, _category: &str, _confidence: Option<f64>, _filename: Option<&str>) -> Result<(), String> {
        Err("Write operations not supported via MCP adapter".to_string())
    }
    fn delete_draft(&self, _id: &str) -> Result<(), String> {
        Err("Write operations not supported via MCP adapter".to_string())
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
