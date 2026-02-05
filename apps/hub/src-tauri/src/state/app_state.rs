use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectEntry {
    pub name: String,
    pub path: String,
    pub detected: bool,
}

pub struct AppState {
    pub projects: Mutex<Vec<ProjectEntry>>,
    pub active_project: Mutex<Option<String>>,
    pub watchers: Mutex<HashMap<String, u64>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            projects: Mutex::new(Vec::new()),
            active_project: Mutex::new(None),
            watchers: Mutex::new(HashMap::new()),
        }
    }
}
