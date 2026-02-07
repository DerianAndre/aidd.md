use std::path::{Path, PathBuf};
use std::sync::Arc;

use crate::domain::model::{AiddMarkers, Project, ProjectEntry};
use crate::domain::ports::inbound::ProjectPort;
use crate::domain::ports::outbound::{FileSystemPort, ProjectRepository};

pub struct ProjectService {
    repository: Arc<dyn ProjectRepository>,
    fs: Arc<dyn FileSystemPort>,
}

impl ProjectService {
    pub fn new(
        repository: Arc<dyn ProjectRepository>,
        fs: Arc<dyn FileSystemPort>,
    ) -> Self {
        Self { repository, fs }
    }

    /// Resolve the content directory for a category, checking config overrides first.
    /// Priority: config path override → .aidd/content/ → root content/
    fn resolve_content_path(
        &self,
        project_root: &Path,
        aidd_dir: &Path,
        category: &str,
        config_paths: &Option<serde_json::Value>,
    ) -> PathBuf {
        // 1. Check config.content.paths.<category> override
        if let Some(paths) = config_paths {
            if let Some(override_path) = paths.get(category).and_then(|v| v.as_str()) {
                return aidd_dir.join(override_path);
            }
            // Check base content dir override
            if let Some(base) = paths.get("content").and_then(|v| v.as_str()) {
                return aidd_dir.join(base).join(category);
            }
        }

        // 2. Check .aidd/content/<category>
        let aidd_path = aidd_dir.join("content").join(category);
        if self.fs.is_dir(&aidd_path.to_string_lossy()) {
            return aidd_path;
        }

        // 3. Fallback to root content/<category>
        project_root.join("content").join(category)
    }

    /// Try to read content.paths from .aidd/config.json
    fn read_config_paths(&self, aidd_dir: &Path) -> Option<serde_json::Value> {
        let config_path = aidd_dir.join("config.json");
        self.fs
            .read_to_string(&config_path.to_string_lossy())
            .ok()
            .and_then(|c| serde_json::from_str::<serde_json::Value>(&c).ok())
            .and_then(|v| v.get("content")?.get("paths").cloned())
    }
}

impl ProjectPort for ProjectService {
    fn detect(&self, path: &str) -> Result<Project, String> {
        if !self.fs.is_dir(path) {
            return Err(format!("{} is not a directory", path));
        }

        let p = Path::new(path);
        let aidd_dir = p.join(".aidd");
        let config_paths = self.read_config_paths(&aidd_dir);

        let markers = AiddMarkers {
            agents: self.fs.is_dir(&self.resolve_content_path(p, &aidd_dir, "agents", &config_paths).to_string_lossy()),
            rules: self.fs.is_dir(&self.resolve_content_path(p, &aidd_dir, "rules", &config_paths).to_string_lossy()),
            skills: self.fs.is_dir(&self.resolve_content_path(p, &aidd_dir, "skills", &config_paths).to_string_lossy()),
            workflows: self.fs.is_dir(&self.resolve_content_path(p, &aidd_dir, "workflows", &config_paths).to_string_lossy()),
            specs: self.fs.is_dir(&self.resolve_content_path(p, &aidd_dir, "specs", &config_paths).to_string_lossy()),
            knowledge: self.fs.is_dir(&self.resolve_content_path(p, &aidd_dir, "knowledge", &config_paths).to_string_lossy()),
            templates: self.fs.is_dir(&self.resolve_content_path(p, &aidd_dir, "templates", &config_paths).to_string_lossy()),
            aidd_dir: self.fs.is_dir(&aidd_dir.to_string_lossy()),
            memory: self.fs.is_dir(&aidd_dir.join("memory").to_string_lossy()),
        };

        let detected = markers.agents || markers.rules || markers.skills;

        // Try to read name from package.json
        let pkg_path = p.join("package.json");
        let name = if self.fs.exists(&pkg_path.to_string_lossy()) {
            self.fs
                .read_to_string(&pkg_path.to_string_lossy())
                .ok()
                .and_then(|c| serde_json::from_str::<serde_json::Value>(&c).ok())
                .and_then(|v| v.get("name").and_then(|n| n.as_str()).map(String::from))
                .unwrap_or_else(|| dir_name(p))
        } else {
            dir_name(p)
        };

        Ok(Project {
            name,
            path: path.to_string(),
            detected,
            markers,
        })
    }

    fn register(&self, path: &str) -> Result<Project, String> {
        let project = self.detect(path)?;
        let mut data = self.repository.load()?;

        // Don't add duplicates
        if !data.projects.iter().any(|p| p.path == path) {
            data.projects.push(ProjectEntry::from(&project));
        }

        // Set as active if first project
        if data.active_project.is_none() {
            data.active_project = Some(path.to_string());
        }

        self.repository.save(&data)?;
        Ok(project)
    }

    fn remove(&self, path: &str) -> Result<(), String> {
        let mut data = self.repository.load()?;
        data.projects.retain(|p| p.path != path);

        if data.active_project.as_deref() == Some(path) {
            data.active_project = data.projects.first().map(|p| p.path.clone());
        }

        self.repository.save(&data)?;
        Ok(())
    }

    fn list(&self) -> Result<Vec<ProjectEntry>, String> {
        let data = self.repository.load()?;
        Ok(data.projects)
    }

    fn switch(&self, path: &str) -> Result<(), String> {
        let mut data = self.repository.load()?;

        if !data.projects.iter().any(|p| p.path == path) {
            return Err(format!("Project not found: {}", path));
        }

        data.active_project = Some(path.to_string());
        self.repository.save(&data)?;
        Ok(())
    }

    fn get_active_path(&self) -> Result<Option<String>, String> {
        let data = self.repository.load()?;
        Ok(data.active_project)
    }
}

fn dir_name(p: &Path) -> String {
    p.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string())
}
