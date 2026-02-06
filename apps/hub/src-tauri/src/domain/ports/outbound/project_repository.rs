use crate::domain::model::ProjectEntry;
use serde::{Deserialize, Serialize};

/// Persistent storage format for `~/.aidd/hub.json`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HubData {
    #[serde(default)]
    pub projects: Vec<ProjectEntry>,
    #[serde(default)]
    pub active_project: Option<String>,
    #[serde(default)]
    pub framework_version: Option<String>,
    #[serde(default = "default_true")]
    pub auto_sync: bool,
    #[serde(default)]
    pub last_sync_check: Option<String>,
}

fn default_true() -> bool {
    true
}

impl Default for HubData {
    fn default() -> Self {
        Self {
            projects: Vec::new(),
            active_project: None,
            framework_version: None,
            auto_sync: true,
            last_sync_check: None,
        }
    }
}

/// Outbound port for persisting the project registry and hub preferences.
pub trait ProjectRepository: Send + Sync {
    fn load(&self) -> Result<HubData, String>;
    fn save(&self, data: &HubData) -> Result<(), String>;
}
