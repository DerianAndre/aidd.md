use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub extension: Option<String>,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarkdownEntity {
    pub path: String,
    pub name: String,
    pub frontmatter: serde_json::Value,
    pub content: String,
    pub last_modified: String,
}

/// Read a file as UTF-8 string.
#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read {}: {}", path, e))
}

/// Write content to a file, creating parent directories if needed.
#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    let p = Path::new(&path);
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create dirs: {}", e))?;
    }
    fs::write(&path, content).map_err(|e| format!("Failed to write {}: {}", path, e))
}

/// Delete a file.
#[tauri::command]
pub async fn delete_file(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| format!("Failed to delete {}: {}", path, e))
}

/// Check if a file or directory exists.
#[tauri::command]
pub async fn file_exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}

/// List files in a directory with optional extension filter and recursive flag.
#[tauri::command]
pub async fn list_directory(
    path: String,
    extensions: Option<Vec<String>>,
    recursive: bool,
) -> Result<Vec<FileEntry>, String> {
    let p = Path::new(&path);
    if !p.is_dir() {
        return Err(format!("{} is not a directory", path));
    }

    let mut entries = Vec::new();
    collect_entries(p, &extensions, recursive, &mut entries)?;
    Ok(entries)
}

fn collect_entries(
    dir: &Path,
    extensions: &Option<Vec<String>>,
    recursive: bool,
    entries: &mut Vec<FileEntry>,
) -> Result<(), String> {
    let read_dir = fs::read_dir(dir).map_err(|e| format!("Failed to read dir: {}", e))?;

    for entry in read_dir {
        let entry = entry.map_err(|e| format!("Dir entry error: {}", e))?;
        let path = entry.path();
        let metadata = entry
            .metadata()
            .map_err(|e| format!("Metadata error: {}", e))?;

        let is_dir = metadata.is_dir();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files/dirs
        if name.starts_with('.') {
            continue;
        }

        let extension = path
            .extension()
            .map(|e| e.to_string_lossy().to_string());

        // Filter by extension if specified
        if !is_dir {
            if let Some(ref exts) = extensions {
                if let Some(ref ext) = extension {
                    if !exts.iter().any(|e| e == ext) {
                        continue;
                    }
                } else {
                    continue;
                }
            }
        }

        entries.push(FileEntry {
            name: name.clone(),
            path: path.to_string_lossy().to_string(),
            is_dir,
            extension: extension.clone(),
            size: metadata.len(),
        });

        if is_dir && recursive {
            collect_entries(&path, extensions, recursive, entries)?;
        }
    }

    Ok(())
}

/// List markdown files in a directory, parsing YAML frontmatter from each.
#[tauri::command]
pub async fn list_markdown_entities(
    base_path: String,
    recursive: bool,
) -> Result<Vec<MarkdownEntity>, String> {
    let p = Path::new(&base_path);
    if !p.is_dir() {
        return Err(format!("{} is not a directory", base_path));
    }

    let mut file_entries = Vec::new();
    collect_entries(p, &Some(vec!["md".to_string()]), recursive, &mut file_entries)?;

    let mut entities = Vec::new();
    for entry in file_entries {
        if entry.is_dir {
            continue;
        }

        let content = match fs::read_to_string(&entry.path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let (frontmatter, body) = parse_frontmatter(&content);

        let last_modified = fs::metadata(&entry.path)
            .ok()
            .and_then(|m| m.modified().ok())
            .map(|t| format!("{:?}", t))
            .unwrap_or_default();

        let name = entry
            .name
            .strip_suffix(".md")
            .unwrap_or(&entry.name)
            .to_string();

        entities.push(MarkdownEntity {
            path: entry.path,
            name,
            frontmatter,
            content: body,
            last_modified,
        });
    }

    Ok(entities)
}

/// Parse YAML frontmatter from a markdown string.
/// Returns (frontmatter as JSON value, body content).
fn parse_frontmatter(content: &str) -> (serde_json::Value, String) {
    let trimmed = content.trim_start();
    if !trimmed.starts_with("---") {
        return (serde_json::Value::Object(serde_json::Map::new()), content.to_string());
    }

    let after_start = &trimmed[3..];
    if let Some(end_idx) = after_start.find("\n---") {
        let yaml_str = &after_start[..end_idx].trim();
        let body = &after_start[end_idx + 4..].trim_start();

        // Simple YAML key-value parser (no dependency needed for basic frontmatter)
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
        (serde_json::Value::Object(serde_json::Map::new()), content.to_string())
    }
}

/// Read a JSON file and return as serde_json::Value.
#[tauri::command]
pub async fn read_json_file(path: String) -> Result<serde_json::Value, String> {
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read {}: {}", path, e))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse JSON from {}: {}", path, e))
}

/// Write a serde_json::Value to a JSON file with pretty formatting.
#[tauri::command]
pub async fn write_json_file(path: String, data: serde_json::Value) -> Result<(), String> {
    let p = Path::new(&path);
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create dirs: {}", e))?;
    }
    let content = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Failed to serialize JSON: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("Failed to write {}: {}", path, e))
}
