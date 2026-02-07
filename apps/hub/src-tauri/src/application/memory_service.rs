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
