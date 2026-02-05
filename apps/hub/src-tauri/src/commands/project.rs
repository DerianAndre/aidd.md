use crate::state::{AppState};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub name: String,
    pub path: String,
    pub detected: bool,
    pub markers: AiddMarkers,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiddMarkers {
    pub agents_md: bool,
    pub rules: bool,
    pub skills: bool,
    pub workflows: bool,
    pub spec: bool,
    pub knowledge: bool,
    pub templates: bool,
    pub aidd_dir: bool,
    pub memory: bool,
}

/// Detect AIDD markers in a project directory.
#[tauri::command]
pub async fn detect_project(path: String) -> Result<ProjectInfo, String> {
    let p = Path::new(&path);
    if !p.is_dir() {
        return Err(format!("{} is not a directory", path));
    }

    // Check root level and ai/ subfolder
    let aidd_root = if p.join("ai").join("AGENTS.md").exists() || p.join("ai").join("rules").exists() {
        p.join("ai")
    } else {
        p.to_path_buf()
    };

    let markers = AiddMarkers {
        agents_md: aidd_root.join("AGENTS.md").exists(),
        rules: aidd_root.join("rules").is_dir(),
        skills: aidd_root.join("skills").is_dir(),
        workflows: aidd_root.join("workflows").is_dir(),
        spec: aidd_root.join("spec").is_dir(),
        knowledge: aidd_root.join("knowledge").is_dir(),
        templates: aidd_root.join("templates").is_dir(),
        aidd_dir: p.join(".aidd").is_dir(),
        memory: p.join("ai").join("memory").is_dir() || p.join("memory").is_dir(),
    };

    let detected = markers.agents_md || markers.rules || markers.skills;

    // Try to read name from package.json
    let name = p
        .join("package.json")
        .exists()
        .then(|| {
            std::fs::read_to_string(p.join("package.json"))
                .ok()
                .and_then(|c| serde_json::from_str::<serde_json::Value>(&c).ok())
                .and_then(|v| v.get("name").and_then(|n| n.as_str()).map(String::from))
        })
        .flatten()
        .unwrap_or_else(|| {
            p.file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "unknown".to_string())
        });

    Ok(ProjectInfo {
        name,
        path,
        detected,
        markers,
    })
}

/// Add a project to the registry.
#[tauri::command]
pub async fn add_project(
    path: String,
    state: State<'_, AppState>,
) -> Result<ProjectInfo, String> {
    let info = detect_project(path.clone()).await?;

    let entry = crate::state::ProjectEntry {
        name: info.name.clone(),
        path: info.path.clone(),
        detected: info.detected,
    };

    let mut projects = state.projects.lock().map_err(|e| e.to_string())?;

    // Don't add duplicates
    if !projects.iter().any(|p| p.path == path) {
        projects.push(entry);
    }

    // Set as active if first project
    let mut active = state.active_project.lock().map_err(|e| e.to_string())?;
    if active.is_none() {
        *active = Some(path);
    }

    Ok(info)
}

/// Remove a project from the registry.
#[tauri::command]
pub async fn remove_project(
    path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut projects = state.projects.lock().map_err(|e| e.to_string())?;
    projects.retain(|p| p.path != path);

    let mut active = state.active_project.lock().map_err(|e| e.to_string())?;
    if active.as_deref() == Some(&path) {
        *active = projects.first().map(|p| p.path.clone());
    }

    Ok(())
}

/// List all registered projects.
#[tauri::command]
pub async fn list_projects(
    state: State<'_, AppState>,
) -> Result<Vec<crate::state::ProjectEntry>, String> {
    let projects = state.projects.lock().map_err(|e| e.to_string())?;
    Ok(projects.clone())
}

/// Get the currently active project path.
#[tauri::command]
pub async fn get_active_project(
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    let active = state.active_project.lock().map_err(|e| e.to_string())?;
    Ok(active.clone())
}

/// Set the active project by path.
#[tauri::command]
pub async fn set_active_project(
    path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let projects = state.projects.lock().map_err(|e| e.to_string())?;
    if !projects.iter().any(|p| p.path == path) {
        return Err(format!("Project not found: {}", path));
    }

    let mut active = state.active_project.lock().map_err(|e| e.to_string())?;
    *active = Some(path);
    Ok(())
}
