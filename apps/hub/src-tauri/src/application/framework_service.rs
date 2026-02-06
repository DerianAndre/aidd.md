use std::path::{Path, PathBuf};
use std::sync::Arc;

use crate::domain::model::{FrameworkEntity, FRAMEWORK_CATEGORIES};
use crate::domain::ports::inbound::FrameworkPort;
use crate::domain::ports::outbound::{FileSystemPort, ProjectRepository};

pub struct FrameworkService {
    framework_path: PathBuf,
    repository: Arc<dyn ProjectRepository>,
    fs: Arc<dyn FileSystemPort>,
}

impl FrameworkService {
    pub fn new(
        aidd_home: &Path,
        repository: Arc<dyn ProjectRepository>,
        fs: Arc<dyn FileSystemPort>,
    ) -> Result<Self, String> {
        let framework_path = aidd_home.join("framework");

        // Ensure framework directory + category subdirs exist
        fs.create_dir_all(&framework_path.to_string_lossy())?;
        for cat in FRAMEWORK_CATEGORIES {
            fs.create_dir_all(&framework_path.join(cat).to_string_lossy())?;
        }

        Ok(Self {
            framework_path,
            repository,
            fs,
        })
    }
}

impl FrameworkPort for FrameworkService {
    fn get_version(&self) -> Result<Option<String>, String> {
        let data = self.repository.load()?;
        Ok(data.framework_version)
    }

    fn get_path(&self) -> String {
        self.framework_path.to_string_lossy().to_string()
    }

    fn list_entities(&self, category: &str) -> Result<Vec<FrameworkEntity>, String> {
        validate_category(category)?;

        let cat_path = self.framework_path.join(category);
        if !self.fs.is_dir(&cat_path.to_string_lossy()) {
            return Ok(Vec::new());
        }

        let entries = std::fs::read_dir(&cat_path)
            .map_err(|e| format!("Failed to read {}: {}", cat_path.display(), e))?;

        let mut result = Vec::new();
        for entry in entries {
            let entry = entry.map_err(|e| format!("Dir entry error: {}", e))?;
            let path = entry.path();

            // Only process .md files
            if path.extension().and_then(|e| e.to_str()) != Some("md") {
                continue;
            }
            if path.file_name().map(|n| n.to_string_lossy().starts_with('.')).unwrap_or(true) {
                continue;
            }

            let content = match self.fs.read_to_string(&path.to_string_lossy()) {
                Ok(c) => c,
                Err(_) => continue,
            };

            let name = path
                .file_stem()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();

            let (frontmatter, body) = parse_frontmatter(&content);

            let last_modified = std::fs::metadata(&path)
                .ok()
                .and_then(|m| m.modified().ok())
                .map(|t| format!("{:?}", t))
                .unwrap_or_default();

            result.push(FrameworkEntity {
                name,
                category: category.to_string(),
                path: path.to_string_lossy().to_string(),
                frontmatter,
                content: body,
                last_modified,
            });
        }

        result.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(result)
    }

    fn read_entity(&self, category: &str, name: &str) -> Result<FrameworkEntity, String> {
        validate_category(category)?;

        let file_path = self.framework_path.join(category).join(format!("{}.md", name));
        let content = self.fs.read_to_string(&file_path.to_string_lossy())?;

        let (frontmatter, body) = parse_frontmatter(&content);

        let last_modified = std::fs::metadata(&file_path)
            .ok()
            .and_then(|m| m.modified().ok())
            .map(|t| format!("{:?}", t))
            .unwrap_or_default();

        Ok(FrameworkEntity {
            name: name.to_string(),
            category: category.to_string(),
            path: file_path.to_string_lossy().to_string(),
            frontmatter,
            content: body,
            last_modified,
        })
    }

    fn write_entity(&self, category: &str, name: &str, content: &str) -> Result<(), String> {
        validate_category(category)?;

        let file_path = self.framework_path.join(category).join(format!("{}.md", name));
        self.fs.write(&file_path.to_string_lossy(), content)
    }

    fn delete_entity(&self, category: &str, name: &str) -> Result<(), String> {
        validate_category(category)?;

        let file_path = self.framework_path.join(category).join(format!("{}.md", name));
        std::fs::remove_file(&file_path)
            .map_err(|e| format!("Failed to delete {}: {}", file_path.display(), e))
    }
}

fn validate_category(category: &str) -> Result<(), String> {
    if FRAMEWORK_CATEGORIES.contains(&category) {
        Ok(())
    } else {
        Err(format!(
            "Invalid category '{}'. Valid: {:?}",
            category, FRAMEWORK_CATEGORIES
        ))
    }
}

/// Parse YAML frontmatter from a markdown string.
fn parse_frontmatter(content: &str) -> (serde_json::Value, String) {
    let trimmed = content.trim_start();
    if !trimmed.starts_with("---") {
        return (
            serde_json::Value::Object(serde_json::Map::new()),
            content.to_string(),
        );
    }

    let after_start = &trimmed[3..];
    if let Some(end_idx) = after_start.find("\n---") {
        let yaml_str = after_start[..end_idx].trim();
        let body = after_start[end_idx + 4..].trim_start();

        let mut map = serde_json::Map::new();
        for line in yaml_str.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            if let Some((key, value)) = line.split_once(':') {
                let key = key.trim().to_string();
                let value = value.trim().trim_matches('"').trim_matches('\'').to_string();
                map.insert(key, serde_json::Value::String(value));
            }
        }

        (serde_json::Value::Object(map), body.to_string())
    } else {
        (
            serde_json::Value::Object(serde_json::Map::new()),
            content.to_string(),
        )
    }
}
