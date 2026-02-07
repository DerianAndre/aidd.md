use serde::{Deserialize, Serialize};

/// AIDD markers detected in a project directory.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiddMarkers {
    pub agents: bool,
    pub rules: bool,
    pub skills: bool,
    pub workflows: bool,
    pub specs: bool,
    pub knowledge: bool,
    pub templates: bool,
    pub aidd_dir: bool,
    pub memory: bool,
}

/// Full project information with detection results.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub name: String,
    pub path: String,
    pub detected: bool,
    pub markers: AiddMarkers,
}

/// Lightweight project entry for lists and persistence.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectEntry {
    pub name: String,
    pub path: String,
    pub detected: bool,
}

impl From<&Project> for ProjectEntry {
    fn from(p: &Project) -> Self {
        Self {
            name: p.name.clone(),
            path: p.path.clone(),
            detected: p.detected,
        }
    }
}
