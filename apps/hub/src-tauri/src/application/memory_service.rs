use crate::domain::ports::inbound::{
    MemoryPort, SessionSummary, ObservationEntry, EvolutionStatus, PatternStats,
};

/// Application Service for Memory queries.
/// Implements use cases for fetching memory data.
/// Depends on MemoryPort (DIP: Dependency Inversion Principle).
pub struct MemoryService {
    memory_port: Box<dyn MemoryPort>,
}

impl MemoryService {
    pub fn new(memory_port: Box<dyn MemoryPort>) -> Self {
        Self { memory_port }
    }

    /// Use case: Get session summary with recent sessions
    pub fn get_session_summary(&self) -> Result<SessionSummary, String> {
        self.memory_port.get_session_summary()
    }

    /// Use case: List all observations
    pub fn list_all_observations(&self, limit: Option<usize>) -> Result<Vec<serde_json::Value>, String> {
        self.memory_port.list_all_observations(limit)
    }

    /// Use case: Search observations
    pub fn search_observations(
        &self,
        query: &str,
        limit: Option<usize>,
    ) -> Result<Vec<ObservationEntry>, String> {
        self.memory_port.search_observations(query, limit)
    }

    /// Use case: Get evolution status
    pub fn get_evolution_status(&self) -> Result<EvolutionStatus, String> {
        self.memory_port.get_evolution_status()
    }

    /// Use case: Get pattern statistics
    pub fn get_pattern_stats(&self) -> Result<PatternStats, String> {
        self.memory_port.get_pattern_stats()
    }

    /// Use case: List all sessions with full data
    pub fn list_all_sessions(&self, limit: Option<usize>) -> Result<Vec<serde_json::Value>, String> {
        self.memory_port.list_all_sessions(limit)
    }

    /// Use case: List evolution candidates with full data
    pub fn list_evolution_candidates(&self) -> Result<Vec<serde_json::Value>, String> {
        self.memory_port.list_evolution_candidates()
    }

    /// Use case: List evolution log entries
    pub fn list_evolution_log(&self, limit: Option<usize>) -> Result<Vec<serde_json::Value>, String> {
        self.memory_port.list_evolution_log(limit)
    }

    /// Use case: List permanent memory by type
    pub fn list_permanent_memory(&self, memory_type: &str) -> Result<Vec<serde_json::Value>, String> {
        self.memory_port.list_permanent_memory(memory_type)
    }

    /// Use case: Delete a permanent memory entry
    pub fn delete_permanent_memory(&self, memory_type: &str, id: &str) -> Result<(), String> {
        self.memory_port.delete_permanent_memory(memory_type, id)
    }

    /// Use case: List all drafts
    pub fn list_drafts(&self) -> Result<Vec<serde_json::Value>, String> {
        self.memory_port.list_drafts()
    }

    /// Use case: List artifacts
    pub fn list_artifacts(
        &self,
        artifact_type: Option<&str>,
        status: Option<&str>,
        limit: Option<usize>,
    ) -> Result<Vec<serde_json::Value>, String> {
        self.memory_port.list_artifacts(artifact_type, status, limit)
    }

    // --- Write operations ---

    pub fn create_permanent_memory(&self, memory_type: &str, title: &str, content: &str) -> Result<String, String> {
        self.memory_port.create_permanent_memory(memory_type, title, content)
    }

    pub fn update_permanent_memory(&self, id: &str, title: &str, content: &str) -> Result<(), String> {
        self.memory_port.update_permanent_memory(id, title, content)
    }

    pub fn create_artifact(&self, artifact_type: &str, feature: &str, title: &str, description: &str, content: &str) -> Result<String, String> {
        self.memory_port.create_artifact(artifact_type, feature, title, description, content)
    }

    pub fn update_artifact(&self, id: &str, artifact_type: &str, feature: &str, title: &str, description: &str, content: &str, status: &str) -> Result<(), String> {
        self.memory_port.update_artifact(id, artifact_type, feature, title, description, content, status)
    }

    pub fn archive_artifact(&self, id: &str) -> Result<(), String> {
        self.memory_port.archive_artifact(id)
    }

    pub fn delete_artifact(&self, id: &str) -> Result<(), String> {
        self.memory_port.delete_artifact(id)
    }

    pub fn approve_evolution_candidate(&self, id: &str) -> Result<(), String> {
        self.memory_port.approve_evolution_candidate(id)
    }

    pub fn reject_evolution_candidate(&self, id: &str, reason: &str) -> Result<(), String> {
        self.memory_port.reject_evolution_candidate(id, reason)
    }

    pub fn approve_draft(&self, id: &str) -> Result<(), String> {
        self.memory_port.approve_draft(id)
    }

    pub fn reject_draft(&self, id: &str, reason: &str) -> Result<(), String> {
        self.memory_port.reject_draft(id, reason)
    }

    pub fn delete_session(&self, id: &str) -> Result<(), String> {
        self.memory_port.delete_session(id)
    }

    pub fn update_session(&self, id: &str, branch: Option<&str>, input: Option<&str>, output: Option<&str>) -> Result<(), String> {
        self.memory_port.update_session(id, branch, input, output)
    }

    // --- Observation CRUD ---

    pub fn create_observation(
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
    ) -> Result<String, String> {
        self.memory_port.create_observation(session_id, obs_type, title, narrative, facts, concepts, files_read, files_modified, discovery_tokens)
    }

    pub fn update_observation(
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
    ) -> Result<(), String> {
        self.memory_port.update_observation(id, obs_type, title, narrative, facts, concepts, files_read, files_modified, discovery_tokens)
    }

    pub fn delete_observation(&self, id: &str) -> Result<(), String> {
        self.memory_port.delete_observation(id)
    }

    // --- Evolution Candidate CRUD ---

    pub fn create_evolution_candidate_entry(
        &self,
        evo_type: &str,
        title: &str,
        confidence: f64,
        data: &str,
    ) -> Result<String, String> {
        self.memory_port.create_evolution_candidate(evo_type, title, confidence, data)
    }

    pub fn update_evolution_candidate_entry(
        &self,
        id: &str,
        evo_type: &str,
        title: &str,
        confidence: f64,
        data: &str,
    ) -> Result<(), String> {
        self.memory_port.update_evolution_candidate_entry(id, evo_type, title, confidence, data)
    }

    pub fn delete_evolution_candidate(&self, id: &str) -> Result<(), String> {
        self.memory_port.delete_evolution_candidate(id)
    }

    // --- Draft CRUD ---

    pub fn create_draft(
        &self,
        category: &str,
        title: &str,
        filename: &str,
        content: &str,
        confidence: f64,
        source: &str,
    ) -> Result<String, String> {
        self.memory_port.create_draft(category, title, filename, content, confidence, source)
    }

    pub fn update_draft(&self, id: &str, title: &str, content: &str, category: &str, confidence: Option<f64>, filename: Option<&str>) -> Result<(), String> {
        self.memory_port.update_draft(id, title, content, category, confidence, filename)
    }

    pub fn delete_draft(&self, id: &str) -> Result<(), String> {
        self.memory_port.delete_draft(id)
    }

    /// Use case: Get complete memory snapshot (all data)
    pub fn get_memory_snapshot(&self) -> Result<MemorySnapshot, String> {
        Ok(MemorySnapshot {
            sessions: self.get_session_summary()?,
            observations: vec![],
            evolution: self.get_evolution_status()?,
            patterns: self.get_pattern_stats()?,
        })
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct MemorySnapshot {
    pub sessions: SessionSummary,
    pub observations: Vec<ObservationEntry>,
    pub evolution: EvolutionStatus,
    pub patterns: PatternStats,
}
