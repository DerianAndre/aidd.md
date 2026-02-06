use serde::{Deserialize, Serialize};

/// Framework metadata and version tracking.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Framework {
    pub version: Option<String>,
    pub path: String,
}
