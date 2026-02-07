use crate::domain::ports::inbound::{
    MemoryPort, SessionSummary, SessionInfo, ObservationEntry, EvolutionStatus, PatternStats,
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

    /// Use case: Get complete memory snapshot (all data)
    pub fn get_memory_snapshot(&self) -> Result<MemorySnapshot, String> {
        Ok(MemorySnapshot {
            sessions: self.get_session_summary()?,
            observations: vec![], // TODO: implement when MCP client available
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
