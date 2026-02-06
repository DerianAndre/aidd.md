use serde::{Deserialize, Serialize};

/// Framework metadata and version tracking.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Framework {
    pub version: Option<String>,
    pub path: String,
}

/// A framework entity (markdown file within a category).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrameworkEntity {
    pub name: String,
    pub category: String,
    pub path: String,
    pub frontmatter: serde_json::Value,
    pub content: String,
    pub last_modified: String,
    /// Where this entity comes from: "global" (~/.aidd/framework) or "project" (project root).
    pub source: String,
}

/// Valid framework categories.
pub const FRAMEWORK_CATEGORIES: &[&str] = &[
    "rules", "skills", "knowledge", "workflows", "templates", "spec",
];
