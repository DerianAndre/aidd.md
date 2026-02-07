use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Arc;

use crate::domain::ports::inbound::{
    MemoryPort, SessionSummary, SessionInfo, ObservationEntry, EvolutionStatus, PatternStats, ProjectPort,
};
use crate::application::ProjectService;

/// SQLite Adapter for Memory Port.
/// Directly queries the project's memory database.
/// Dynamically resolves the active project's database path.
pub struct SqliteMemoryAdapter {
    project_service: Arc<ProjectService>,
}

impl SqliteMemoryAdapter {
    pub fn new(project_service: Arc<ProjectService>) -> Self {
        Self { project_service }
    }

    /// Get the database path for the active project
    fn get_db_path(&self) -> Result<PathBuf, String> {
        let active_path = self.project_service.get_active_path()
            .map_err(|e| format!("Failed to get active project: {}", e))?
            .ok_or_else(|| "No active project configured".to_string())?;

        let db_path = PathBuf::from(active_path)
            .join(".aidd")
            .join("memory.db");

        Ok(db_path)
    }

    fn open_connection(&self) -> Result<Connection, String> {
        let path = self.get_db_path()?;

        Connection::open(path)
            .map_err(|e| format!("Failed to open database: {}", e))
    }

    fn safe_query<T, F>(&self, f: F) -> Result<T, String>
    where
        F: Fn(&Connection) -> Result<T, rusqlite::Error>,
    {
        let conn = self.open_connection()?;
        f(&conn).map_err(|e| format!("Database query failed: {}", e))
    }
}

impl MemoryPort for SqliteMemoryAdapter {
    fn get_session_summary(&self) -> Result<SessionSummary, String> {
        self.safe_query(|conn| {
            // Count total sessions
            let total: usize = conn.query_row(
                "SELECT COUNT(*) FROM sessions",
                [],
                |row| row.get(0),
            ).unwrap_or(0);

            // Count active sessions (no ended_at)
            let active: usize = conn.query_row(
                "SELECT COUNT(*) FROM sessions WHERE ended_at IS NULL",
                [],
                |row| row.get(0),
            ).unwrap_or(0);

            // Compute completed
            let completed = total.saturating_sub(active);

            // Get recent sessions
            let mut stmt = conn.prepare(
                "SELECT id, branch, started_at FROM sessions ORDER BY started_at DESC LIMIT 5"
            )?;

            let recent = stmt.query_map([], |row| {
                Ok(SessionInfo {
                    id: row.get(0)?,
                    branch: row.get(1)?,
                    started_at: row.get(2)?,
                    status: "completed".to_string(),
                })
            })?
                .filter_map(|r| r.ok())
                .collect();

            Ok(SessionSummary {
                total,
                active,
                completed,
                recent_sessions: recent,
            })
        }).or_else(|_| {
            // Return empty structure if DB unavailable
            Ok(SessionSummary {
                total: 0,
                active: 0,
                completed: 0,
                recent_sessions: vec![],
            })
        })
    }

    fn search_observations(
        &self,
        query: &str,
        limit: Option<usize>,
    ) -> Result<Vec<ObservationEntry>, String> {
        let limit = limit.unwrap_or(10);

        self.safe_query(move |conn| {
            let mut stmt = conn.prepare(
                "SELECT id, session_id, title, type, created_at FROM observations \
                 WHERE title LIKE ?1 OR type LIKE ?1 \
                 ORDER BY created_at DESC LIMIT ?2"
            )?;

            let search_term = format!("%{}%", query);
            let observations = stmt.query_map([&search_term, &limit.to_string()], |row| {
                Ok(ObservationEntry {
                    id: row.get(0)?,
                    session_id: row.get(1)?,
                    title: row.get(2)?,
                    observation_type: row.get::<_, String>(3)?,
                    created_at: row.get(4)?,
                })
            })?
                .filter_map(|r| r.ok())
                .collect();

            Ok(observations)
        }).or_else(|_| Ok(vec![]))
    }

    fn get_evolution_status(&self) -> Result<EvolutionStatus, String> {
        self.safe_query(|conn| {
            let pending: usize = conn.query_row(
                "SELECT COUNT(*) FROM evolution_candidates WHERE status = 'pending'",
                [],
                |row| row.get(0),
            ).unwrap_or(0);

            let approved: usize = conn.query_row(
                "SELECT COUNT(*) FROM evolution_candidates WHERE status = 'approved'",
                [],
                |row| row.get(0),
            ).unwrap_or(0);

            let rejected: usize = conn.query_row(
                "SELECT COUNT(*) FROM evolution_candidates WHERE status = 'rejected'",
                [],
                |row| row.get(0),
            ).unwrap_or(0);

            let auto_applied: usize = conn.query_row(
                "SELECT COUNT(*) FROM evolution_log WHERE action = 'auto_applied'",
                [],
                |row| row.get(0),
            ).unwrap_or(0);

            Ok(EvolutionStatus {
                pending_count: pending,
                approved_count: approved,
                rejected_count: rejected,
                auto_applied_count: auto_applied,
            })
        }).or_else(|_| {
            Ok(EvolutionStatus {
                pending_count: 0,
                approved_count: 0,
                rejected_count: 0,
                auto_applied_count: 0,
            })
        })
    }

    fn get_pattern_stats(&self) -> Result<PatternStats, String> {
        self.safe_query(|conn| {
            let total: usize = conn.query_row(
                "SELECT COUNT(*) FROM banned_patterns",
                [],
                |row| row.get(0),
            ).unwrap_or(0);

            let active: usize = conn.query_row(
                "SELECT COUNT(*) FROM banned_patterns WHERE active = 1",
                [],
                |row| row.get(0),
            ).unwrap_or(0);

            let detections: usize = conn.query_row(
                "SELECT COUNT(*) FROM pattern_detections",
                [],
                |row| row.get(0),
            ).unwrap_or(0);

            let false_positives: usize = conn.query_row(
                "SELECT COALESCE(SUM(false_positive_count), 0) FROM pattern_detections",
                [],
                |row| row.get(0),
            ).unwrap_or(0);

            Ok(PatternStats {
                total_patterns: total,
                active_patterns: active,
                total_detections: detections,
                false_positives,
            })
        }).or_else(|_| {
            Ok(PatternStats {
                total_patterns: 0,
                active_patterns: 0,
                total_detections: 0,
                false_positives: 0,
            })
        })
    }
}
