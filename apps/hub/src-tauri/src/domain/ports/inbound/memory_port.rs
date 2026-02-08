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

    // --- Write operations ---

    /// Create a permanent memory entry. Returns the new entry ID.
    fn create_permanent_memory(&self, memory_type: &str, title: &str, content: &str) -> Result<String, String>;

    /// Update a permanent memory entry by ID.
    fn update_permanent_memory(&self, id: &str, title: &str, content: &str) -> Result<(), String>;

    /// Create an artifact. Returns the new artifact ID.
    fn create_artifact(&self, artifact_type: &str, feature: &str, title: &str, description: &str, content: &str) -> Result<String, String>;

    /// Update an artifact by ID.
    fn update_artifact(&self, id: &str, artifact_type: &str, feature: &str, title: &str, description: &str, content: &str, status: &str) -> Result<(), String>;

    /// Archive an artifact (set status to 'done').
    fn archive_artifact(&self, id: &str) -> Result<(), String>;

    /// Delete an artifact by ID.
    fn delete_artifact(&self, id: &str) -> Result<(), String>;

    /// Approve an evolution candidate.
    fn approve_evolution_candidate(&self, id: &str) -> Result<(), String>;

    /// Reject an evolution candidate with a reason.
    fn reject_evolution_candidate(&self, id: &str, reason: &str) -> Result<(), String>;

    /// Approve a draft entry.
    fn approve_draft(&self, id: &str) -> Result<(), String>;

    /// Reject a draft entry with a reason.
    fn reject_draft(&self, id: &str, reason: &str) -> Result<(), String>;

    /// Delete a session and its associated observations.
    fn delete_session(&self, id: &str) -> Result<(), String>;

    /// Update a session's editable fields in its JSON data blob.
    fn update_session(&self, id: &str, branch: Option<&str>, input: Option<&str>, output: Option<&str>) -> Result<(), String>;

    /// Update a session's full data via JSON merge. Reads existing data blob,
    /// deep-merges the provided JSON fields, and writes back.
    fn update_session_full(&self, id: &str, updates_json: &str) -> Result<(), String>;

    // --- Observation CRUD ---

    /// Create an observation. Returns the new observation ID.
    fn create_observation(
        &self,
        session_id: &str,
        obs_type: &str,
        title: &str,
        narrative: Option<&str>,
        facts: Option<&str>,
        concepts: Option<&str>,
        files_read: Option<&str>,
        files_modified: Option<&str>,
        discovery_tokens: Option<i64>,
    ) -> Result<String, String>;

    /// Update an observation by ID.
    fn update_observation(
        &self,
        id: &str,
        obs_type: &str,
        title: &str,
        narrative: Option<&str>,
        facts: Option<&str>,
        concepts: Option<&str>,
        files_read: Option<&str>,
        files_modified: Option<&str>,
        discovery_tokens: Option<i64>,
    ) -> Result<(), String>;

    /// Delete an observation by ID.
    fn delete_observation(&self, id: &str) -> Result<(), String>;

    // --- Evolution Candidate CRUD ---

    /// Create an evolution candidate. Returns the new candidate ID.
    fn create_evolution_candidate(
        &self,
        evo_type: &str,
        title: &str,
        confidence: f64,
        data: &str,
    ) -> Result<String, String>;

    /// Update an evolution candidate by ID.
    fn update_evolution_candidate_entry(
        &self,
        id: &str,
        evo_type: &str,
        title: &str,
        confidence: f64,
        data: &str,
    ) -> Result<(), String>;

    /// Delete an evolution candidate by ID.
    fn delete_evolution_candidate(&self, id: &str) -> Result<(), String>;

    // --- Draft CRUD ---

    /// Create a draft. Returns the new draft ID.
    fn create_draft(
        &self,
        category: &str,
        title: &str,
        filename: &str,
        content: &str,
        confidence: f64,
        source: &str,
    ) -> Result<String, String>;

    /// Update a draft by ID.
    fn update_draft(&self, id: &str, title: &str, content: &str, category: &str, confidence: Option<f64>, filename: Option<&str>) -> Result<(), String>;

    /// Delete a draft by ID.
    fn delete_draft(&self, id: &str) -> Result<(), String>;
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
