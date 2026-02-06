/// Inbound port for framework management use cases (stub for Phase 3).
pub trait FrameworkPort: Send + Sync {
    /// Get the current framework version.
    fn get_version(&self) -> Result<Option<String>, String>;
}
