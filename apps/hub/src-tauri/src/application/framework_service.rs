use std::path::{Path, PathBuf};
use std::sync::Arc;

use crate::domain::model::{FrameworkEntity, SyncInfo, FRAMEWORK_CATEGORIES};
use crate::domain::ports::inbound::FrameworkPort;
use crate::domain::ports::outbound::{FileSystemPort, ProjectRepository};
use crate::infrastructure::integrations::adapter_trait::resolve_content_dir;
use crate::infrastructure::sync::GitHubAdapter;

// FileSystemPort is used both as Arc<dyn ...> in the struct and as &dyn ... in free functions.

pub struct FrameworkService {
    framework_path: PathBuf,
    repository: Arc<dyn ProjectRepository>,
    fs: Arc<dyn FileSystemPort>,
    github: GitHubAdapter,
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
            github: GitHubAdapter::new(),
        })
    }

    // ── Sync methods (async, called from Tauri async commands) ──────────

    /// Check for framework updates without downloading.
    pub async fn check_for_updates(&self) -> Result<SyncInfo, String> {
        let data = self.repository.load()?;

        let (latest_version, changelog) = self.github.fetch_latest_release().await?;
        let update_available = match &data.framework_version {
            Some(current) => current != &latest_version,
            None => true,
        };

        let now = format!("{:?}", std::time::SystemTime::now());

        // Persist the check timestamp
        let mut data = data;
        data.last_sync_check = Some(now.clone());
        self.repository.save(&data)?;

        Ok(SyncInfo {
            current_version: data.framework_version,
            latest_version: Some(latest_version),
            update_available,
            auto_sync: data.auto_sync,
            last_check: Some(now),
            changelog,
        })
    }

    /// Download and install a framework version (or latest if None).
    pub async fn sync_framework(&self, version: Option<String>) -> Result<SyncInfo, String> {
        // Determine target version
        let (target_version, changelog) = match version {
            Some(v) => (v, None),
            None => {
                let (v, c) = self.github.fetch_latest_release().await?;
                (v, c)
            }
        };

        // Download and extract
        self.github
            .download_and_extract(&target_version, &self.framework_path)
            .await?;

        // Ensure category dirs still exist after extraction
        for cat in FRAMEWORK_CATEGORIES {
            self.fs
                .create_dir_all(&self.framework_path.join(cat).to_string_lossy())?;
        }

        // Update persisted version
        let mut data = self.repository.load()?;
        let now = format!("{:?}", std::time::SystemTime::now());
        data.framework_version = Some(target_version.clone());
        data.last_sync_check = Some(now.clone());
        self.repository.save(&data)?;

        Ok(SyncInfo {
            current_version: Some(target_version),
            latest_version: None, // already at latest
            update_available: false,
            auto_sync: data.auto_sync,
            last_check: Some(now),
            changelog,
        })
    }

    /// Set auto-sync preference.
    pub fn set_auto_sync(&self, enabled: bool) -> Result<(), String> {
        let mut data = self.repository.load()?;
        data.auto_sync = enabled;
        self.repository.save(&data)
    }

    /// Get current sync status without hitting the network.
    pub fn get_sync_status(&self) -> Result<SyncInfo, String> {
        let data = self.repository.load()?;
        Ok(SyncInfo {
            current_version: data.framework_version,
            latest_version: None,
            update_available: false,
            auto_sync: data.auto_sync,
            last_check: data.last_sync_check,
            changelog: None,
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
        self.list_entities_with_project(category, None)
    }

    fn list_entities_with_project(
        &self,
        category: &str,
        project_path: Option<&str>,
    ) -> Result<Vec<FrameworkEntity>, String> {
        validate_category(category)?;

        let mut result = Vec::new();
        let mut seen_names = std::collections::HashSet::new();

        // 1. Scan global framework directory (~/.aidd/framework/{category}/)
        let global_dir = self.framework_path.join(category);
        scan_directory(
            &global_dir,
            category,
            "global",
            &*self.fs,
            &mut result,
            &mut seen_names,
        );

        // 2. Scan project directory (config-aware — respects .aidd/config.json path overrides)
        if let Some(proj) = project_path {
            let project_dir = resolve_content_dir(Path::new(proj), category);
            scan_directory(
                &project_dir,
                category,
                "project",
                &*self.fs,
                &mut result,
                &mut seen_names,
            );
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
            source: "global".to_string(),
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

/// Scan a directory for framework entities, handling different directory structures:
/// - Flat .md files (rules, workflows, templates, spec)
/// - Subdirs with SKILL.md (skills)
/// - Nested subdirs with .md files (knowledge)
fn scan_directory(
    dir: &Path,
    category: &str,
    source: &str,
    fs: &dyn FileSystemPort,
    result: &mut Vec<FrameworkEntity>,
    seen: &mut std::collections::HashSet<String>,
) {
    if !fs.is_dir(&dir.to_string_lossy()) {
        return;
    }

    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let file_name = match path.file_name() {
            Some(n) => n.to_string_lossy().to_string(),
            None => continue,
        };

        // Skip hidden files/dirs and README.md
        if file_name.starts_with('.') || file_name == "README.md" {
            continue;
        }

        if path.is_file() && file_name.ends_with(".md") {
            // Flat .md file (rules, workflows, templates, spec, or a top-level skill file)
            let name = file_name.trim_end_matches(".md").to_string();
            if seen.contains(&name) {
                continue;
            }
            if let Some(entity) = read_md_entity(&path, &name, category, source, fs) {
                seen.insert(name);
                result.push(entity);
            }
        } else if path.is_dir() {
            match category {
                "skills" => {
                    // Skills: look for SKILL.md inside the subdir
                    let skill_md = path.join("SKILL.md");
                    if skill_md.exists() {
                        let name = file_name.clone();
                        if seen.contains(&name) {
                            continue;
                        }
                        if let Some(entity) = read_md_entity(&skill_md, &name, category, source, fs) {
                            seen.insert(name);
                            result.push(entity);
                        }
                    }
                }
                "knowledge" => {
                    // Knowledge: recurse into subdirs, use relative path as name
                    scan_knowledge_subdir(&path, &file_name, category, source, fs, result, seen);
                }
                "workflows" => {
                    // Workflows: check for subdirs like orchestrators/
                    scan_workflows_subdir(&path, &file_name, category, source, fs, result, seen);
                }
                _ => {
                    // Other categories: skip subdirs
                }
            }
        }
    }
}

/// Recursively scan a knowledge subdirectory, collecting .md files with path-based names.
fn scan_knowledge_subdir(
    dir: &Path,
    prefix: &str,
    category: &str,
    source: &str,
    fs: &dyn FileSystemPort,
    result: &mut Vec<FrameworkEntity>,
    seen: &mut std::collections::HashSet<String>,
) {
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let file_name = match path.file_name() {
            Some(n) => n.to_string_lossy().to_string(),
            None => continue,
        };

        if file_name.starts_with('.') || file_name == "README.md" {
            continue;
        }

        if path.is_file() && file_name.ends_with(".md") {
            let stem = file_name.trim_end_matches(".md");
            let name = format!("{}/{}", prefix, stem);
            if seen.contains(&name) {
                continue;
            }
            if let Some(entity) = read_md_entity(&path, &name, category, source, fs) {
                seen.insert(name);
                result.push(entity);
            }
        } else if path.is_dir() {
            let sub_prefix = format!("{}/{}", prefix, file_name);
            scan_knowledge_subdir(&path, &sub_prefix, category, source, fs, result, seen);
        }
    }
}

/// Scan a workflows subdirectory (e.g. orchestrators/).
fn scan_workflows_subdir(
    dir: &Path,
    prefix: &str,
    category: &str,
    source: &str,
    fs: &dyn FileSystemPort,
    result: &mut Vec<FrameworkEntity>,
    seen: &mut std::collections::HashSet<String>,
) {
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let file_name = match path.file_name() {
            Some(n) => n.to_string_lossy().to_string(),
            None => continue,
        };

        if file_name.starts_with('.') || file_name == "README.md" {
            continue;
        }

        if path.is_file() && file_name.ends_with(".md") {
            let stem = file_name.trim_end_matches(".md");
            let name = format!("{}/{}", prefix, stem);
            if seen.contains(&name) {
                continue;
            }
            if let Some(entity) = read_md_entity(&path, &name, category, source, fs) {
                seen.insert(name);
                result.push(entity);
            }
        }
    }
}

/// Read a single .md file into a FrameworkEntity.
fn read_md_entity(
    path: &Path,
    name: &str,
    category: &str,
    source: &str,
    fs: &dyn FileSystemPort,
) -> Option<FrameworkEntity> {
    let content = fs.read_to_string(&path.to_string_lossy()).ok()?;
    let (frontmatter, body) = parse_frontmatter(&content);

    let last_modified = std::fs::metadata(path)
        .ok()
        .and_then(|m| m.modified().ok())
        .map(|t| format!("{:?}", t))
        .unwrap_or_default();

    Some(FrameworkEntity {
        name: name.to_string(),
        category: category.to_string(),
        path: path.to_string_lossy().to_string(),
        frontmatter,
        content: body,
        last_modified,
        source: source.to_string(),
    })
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
