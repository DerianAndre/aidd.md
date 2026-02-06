use crate::domain::model::FrameworkEntity;

/// Inbound port for framework management use cases.
pub trait FrameworkPort: Send + Sync {
    /// Get the current framework version.
    fn get_version(&self) -> Result<Option<String>, String>;

    /// Get the resolved framework directory path.
    fn get_path(&self) -> String;

    /// List all entities in a framework category (e.g. "rules", "skills").
    fn list_entities(&self, category: &str) -> Result<Vec<FrameworkEntity>, String>;

    /// List entities from both global framework and project directories.
    /// Handles special directory structures: skills (subdirs with SKILL.md),
    /// knowledge (nested subdirs with .md files).
    fn list_entities_with_project(
        &self,
        category: &str,
        project_path: Option<&str>,
    ) -> Result<Vec<FrameworkEntity>, String>;

    /// Read a specific entity by category and name.
    fn read_entity(&self, category: &str, name: &str) -> Result<FrameworkEntity, String>;

    /// Write (create or update) a framework entity.
    fn write_entity(&self, category: &str, name: &str, content: &str) -> Result<(), String>;

    /// Delete a framework entity.
    fn delete_entity(&self, category: &str, name: &str) -> Result<(), String>;
}
