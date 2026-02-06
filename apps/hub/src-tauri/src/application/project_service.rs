use std::path::Path;
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
}

impl ProjectPort for ProjectService {
    fn detect(&self, path: &str) -> Result<Project, String> {
        if !self.fs.is_dir(path) {
            return Err(format!("{} is not a directory", path));
        }

        let p = Path::new(path);

        // Check ai/ subfolder first
        let ai_agents = p.join("ai").join("AGENTS.md");
        let ai_rules = p.join("ai").join("rules");
        let aidd_root = if self.fs.exists(&ai_agents.to_string_lossy())
            || self.fs.is_dir(&ai_rules.to_string_lossy())
        {
            p.join("ai")
        } else {
            p.to_path_buf()
        };

        let markers = AiddMarkers {
            agents_md: self.fs.exists(&aidd_root.join("AGENTS.md").to_string_lossy()),
            rules: self.fs.is_dir(&aidd_root.join("rules").to_string_lossy()),
            skills: self.fs.is_dir(&aidd_root.join("skills").to_string_lossy()),
            workflows: self.fs.is_dir(&aidd_root.join("workflows").to_string_lossy()),
            spec: self.fs.is_dir(&aidd_root.join("spec").to_string_lossy()),
            knowledge: self.fs.is_dir(&aidd_root.join("knowledge").to_string_lossy()),
            templates: self.fs.is_dir(&aidd_root.join("templates").to_string_lossy()),
            aidd_dir: self.fs.is_dir(&p.join(".aidd").to_string_lossy()),
            memory: self.fs.is_dir(&p.join("ai").join("memory").to_string_lossy())
                || self.fs.is_dir(&p.join("memory").to_string_lossy()),
        };

        let detected = markers.agents_md || markers.rules || markers.skills;

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
