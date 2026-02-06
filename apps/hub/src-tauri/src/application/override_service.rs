use std::path::{Path, PathBuf};
use std::sync::Arc;

use crate::domain::model::{
    AgentOverrides, EffectiveEntity, FrameworkEntity, ProjectOverrides, FRAMEWORK_CATEGORIES,
};
use crate::domain::ports::outbound::FileSystemPort;

pub struct OverrideService {
    framework_path: PathBuf,
    fs: Arc<dyn FileSystemPort>,
}

impl OverrideService {
    pub fn new(framework_path: &Path, fs: Arc<dyn FileSystemPort>) -> Self {
        Self {
            framework_path: framework_path.to_path_buf(),
            fs,
        }
    }

    // ── Agent overrides ──────────────────────────────────────────────────

    /// Get the full project overrides summary.
    pub fn get_overrides(&self, project_path: &str) -> Result<ProjectOverrides, String> {
        let agents = self.load_agent_overrides(project_path)?;
        let rule_count = self.count_override_entities(project_path, "rules");
        let skill_count = self.count_override_entities(project_path, "skills");

        Ok(ProjectOverrides {
            project_path: project_path.to_string(),
            agents,
            rule_count,
            skill_count,
        })
    }

    /// Enable or disable an agent for a project.
    pub fn set_agent_override(
        &self,
        project_path: &str,
        agent: &str,
        enabled: bool,
    ) -> Result<(), String> {
        let mut overrides = self.load_agent_overrides(project_path)?;

        if enabled {
            overrides.disabled.retain(|a| a != agent);
        } else if !overrides.disabled.contains(&agent.to_string()) {
            overrides.disabled.push(agent.to_string());
        }

        self.save_agent_overrides(project_path, &overrides)
    }

    // ── Project override rules ───────────────────────────────────────────

    /// Add (or update) a project-specific rule.
    pub fn add_project_rule(
        &self,
        project_path: &str,
        name: &str,
        content: &str,
    ) -> Result<(), String> {
        let rules_dir = self.overrides_dir(project_path).join("rules");
        self.fs.create_dir_all(&rules_dir.to_string_lossy())?;

        let file_path = rules_dir.join(format!("{}.md", name));
        self.fs.write(&file_path.to_string_lossy(), content)
    }

    /// Remove a project-specific rule.
    pub fn remove_project_rule(&self, project_path: &str, name: &str) -> Result<(), String> {
        let file_path = self
            .overrides_dir(project_path)
            .join("rules")
            .join(format!("{}.md", name));
        std::fs::remove_file(&file_path)
            .map_err(|e| format!("Failed to delete override rule: {}", e))
    }

    /// List project-specific override rules.
    pub fn list_project_rules(&self, project_path: &str) -> Result<Vec<FrameworkEntity>, String> {
        self.list_override_entities(project_path, "rules")
    }

    // ── Effective content merge ──────────────────────────────────────────

    /// Get effective entities for a category: global framework merged with project overrides.
    pub fn get_effective_entities(
        &self,
        project_path: &str,
        category: &str,
    ) -> Result<Vec<EffectiveEntity>, String> {
        validate_category(category)?;

        let agents = self.load_agent_overrides(project_path)?;
        let mut result: Vec<EffectiveEntity> = Vec::new();

        // 1. Global entities
        let global_dir = self.framework_path.join(category);
        if self.fs.is_dir(&global_dir.to_string_lossy()) {
            for entry in list_md_files(&global_dir)? {
                let name = entry
                    .file_stem()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();

                let enabled = if category == "skills" {
                    // For skills, check if the agent (skill name) is disabled
                    !agents.disabled.iter().any(|a| a == &name)
                } else {
                    true
                };

                let content = self.fs.read_to_string(&entry.to_string_lossy()).ok();

                result.push(EffectiveEntity {
                    name,
                    category: category.to_string(),
                    source: "global".to_string(),
                    enabled,
                    content,
                });
            }
        }

        // 2. Override entities (additions — merge by name)
        let override_dir = self.overrides_dir(project_path).join(category);
        if self.fs.is_dir(&override_dir.to_string_lossy()) {
            for entry in list_md_files(&override_dir)? {
                let name = entry
                    .file_stem()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();

                let content = self.fs.read_to_string(&entry.to_string_lossy()).ok();

                // Check if we already have a global entity with same name
                if let Some(existing) = result.iter_mut().find(|e| e.name == name) {
                    // Override replaces the global content
                    existing.source = "override".to_string();
                    existing.content = content;
                } else {
                    // New entity from project
                    result.push(EffectiveEntity {
                        name,
                        category: category.to_string(),
                        source: "override".to_string(),
                        enabled: true,
                        content,
                    });
                }
            }
        }

        result.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(result)
    }

    // ── Private helpers ──────────────────────────────────────────────────

    fn overrides_dir(&self, project_path: &str) -> PathBuf {
        Path::new(project_path).join(".aidd").join("overrides")
    }

    fn load_agent_overrides(&self, project_path: &str) -> Result<AgentOverrides, String> {
        let agents_file = self.overrides_dir(project_path).join("agents.json");
        let path_str = agents_file.to_string_lossy();

        if !self.fs.exists(&path_str) {
            return Ok(AgentOverrides::default());
        }

        let content = self.fs.read_to_string(&path_str)?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse agents.json: {}", e))
    }

    fn save_agent_overrides(
        &self,
        project_path: &str,
        overrides: &AgentOverrides,
    ) -> Result<(), String> {
        let overrides_dir = self.overrides_dir(project_path);
        self.fs.create_dir_all(&overrides_dir.to_string_lossy())?;

        let agents_file = overrides_dir.join("agents.json");
        let content = serde_json::to_string_pretty(overrides)
            .map_err(|e| format!("Failed to serialize agents.json: {}", e))?;

        self.fs.write(&agents_file.to_string_lossy(), &content)
    }

    fn count_override_entities(&self, project_path: &str, category: &str) -> usize {
        let dir = self.overrides_dir(project_path).join(category);
        if !self.fs.is_dir(&dir.to_string_lossy()) {
            return 0;
        }
        list_md_files(&dir).map(|v| v.len()).unwrap_or(0)
    }

    fn list_override_entities(
        &self,
        project_path: &str,
        category: &str,
    ) -> Result<Vec<FrameworkEntity>, String> {
        let dir = self.overrides_dir(project_path).join(category);
        if !self.fs.is_dir(&dir.to_string_lossy()) {
            return Ok(Vec::new());
        }

        let mut result = Vec::new();
        for entry in list_md_files(&dir)? {
            let name = entry
                .file_stem()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();

            let content = self.fs.read_to_string(&entry.to_string_lossy())
                .unwrap_or_default();

            let last_modified = std::fs::metadata(&entry)
                .ok()
                .and_then(|m| m.modified().ok())
                .map(|t| format!("{:?}", t))
                .unwrap_or_default();

            result.push(FrameworkEntity {
                name,
                category: category.to_string(),
                path: entry.to_string_lossy().to_string(),
                frontmatter: serde_json::Value::Object(serde_json::Map::new()),
                content,
                last_modified,
                source: "override".to_string(),
            });
        }

        result.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(result)
    }
}

/// List .md files in a directory (non-recursive, skip hidden).
fn list_md_files(dir: &Path) -> Result<Vec<PathBuf>, String> {
    let entries = std::fs::read_dir(dir)
        .map_err(|e| format!("Failed to read {}: {}", dir.display(), e))?;

    let mut files = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("Dir entry error: {}", e))?;
        let path = entry.path();

        if path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }
        if path
            .file_name()
            .map(|n| n.to_string_lossy().starts_with('.'))
            .unwrap_or(true)
        {
            continue;
        }

        files.push(path);
    }

    Ok(files)
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
