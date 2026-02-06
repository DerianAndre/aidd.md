use crate::domain::model::{Project, ProjectEntry};

/// Inbound port for project management use cases.
pub trait ProjectPort: Send + Sync {
    /// Scan a directory for AIDD markers without persisting.
    fn detect(&self, path: &str) -> Result<Project, String>;

    /// Register a project: detect + persist to hub store.
    fn register(&self, path: &str) -> Result<Project, String>;

    /// Remove a project from the registry.
    fn remove(&self, path: &str) -> Result<(), String>;

    /// List all registered projects.
    fn list(&self) -> Result<Vec<ProjectEntry>, String>;

    /// Set the active project by path.
    fn switch(&self, path: &str) -> Result<(), String>;

    /// Get the active project path.
    fn get_active_path(&self) -> Result<Option<String>, String>;
}
