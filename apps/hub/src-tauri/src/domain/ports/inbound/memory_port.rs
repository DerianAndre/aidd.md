/// Memory port for querying AIDD memory data from the engine
pub trait MemoryPort: Send + Sync {
    /// Get summary of all sessions
    fn get_session_summary(&self) -> Result<SessionSummary, String>;

    /// List all sessions with full detail (data JSON blob from SQLite)
    fn list_all_sessions(&self, limit: Option<usize>) -> Result<Vec<serde_json::Value>, String>;

    /// List all observations (no filter)
    fn list_all_observations(&self, limit: Option<usize>) -> Result<Vec<serde_json::Value>, String>;

    /// Search observations by query
    fn search_observations(
        &self,
        query: &str,
        limit: Option<usize>,
    ) -> Result<Vec<ObservationEntry>, String>;

    /// Get evolution status
    fn get_evolution_status(&self) -> Result<EvolutionStatus, String>;

    /// List evolution candidates with full detail
    fn list_evolution_candidates(&self) -> Result<Vec<serde_json::Value>, String>;

    /// List evolution log entries
    fn list_evolution_log(&self, limit: Option<usize>) -> Result<Vec<serde_json::Value>, String>;

    /// Get pattern statistics
    fn get_pattern_stats(&self) -> Result<PatternStats, String>;

    /// List permanent memory entries by type (decision, mistake, convention)
    fn list_permanent_memory(&self, memory_type: &str) -> Result<Vec<serde_json::Value>, String>;

    /// Delete a permanent memory entry by type and id
    fn delete_permanent_memory(&self, memory_type: &str, id: &str) -> Result<(), String>;

    /// List draft entries
    fn list_drafts(&self) -> Result<Vec<serde_json::Value>, String>;

    /// List artifacts with optional filters
    fn list_artifacts(
        &self,
        artifact_type: Option<&str>,
        status: Option<&str>,
        limit: Option<usize>,
    ) -> Result<Vec<serde_json::Value>, String>;
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SessionSummary {
    pub total: usize,
    pub active: usize,
    pub completed: usize,
    pub recent_sessions: Vec<SessionInfo>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SessionInfo {
    pub id: String,
    pub branch: String,
    pub started_at: String,
    pub status: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ObservationEntry {
    pub id: String,
    pub session_id: String,
    pub title: String,
    #[serde(rename = "type")]
    pub observation_type: String,
    pub created_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct EvolutionStatus {
    pub pending_count: usize,
    pub approved_count: usize,
    pub rejected_count: usize,
    pub auto_applied_count: usize,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PatternStats {
    pub total_patterns: usize,
    pub active_patterns: usize,
    pub total_detections: usize,
    pub false_positives: usize,
}
