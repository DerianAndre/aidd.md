use serde::{Deserialize, Serialize};

/// Framework sync status returned to the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncInfo {
    pub current_version: Option<String>,
    pub latest_version: Option<String>,
    pub update_available: bool,
    pub auto_sync: bool,
    pub last_check: Option<String>,
    pub changelog: Option<String>,
}
