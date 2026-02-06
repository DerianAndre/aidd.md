use serde::{Deserialize, Serialize};

/// Agent override configuration per project.
/// Stored in `{project}/.aidd/overrides/agents.json`.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AgentOverrides {
    /// Agent names that are disabled for this project.
    #[serde(default)]
    pub disabled: Vec<String>,
}

/// Summary of project overrides for a single project.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectOverrides {
    pub project_path: String,
    pub agents: AgentOverrides,
    /// Number of project-specific override rules.
    pub rule_count: usize,
    /// Number of project-specific override skills.
    pub skill_count: usize,
}

/// A framework entity with override/source info applied.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EffectiveEntity {
    pub name: String,
    pub category: String,
    /// `"global"` or `"override"`
    pub source: String,
    /// Whether this entity is enabled (agents can be disabled).
    pub enabled: bool,
    pub content: Option<String>,
}
