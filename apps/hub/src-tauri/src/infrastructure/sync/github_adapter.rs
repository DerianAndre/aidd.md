use std::io::Read;
use std::path::Path;

use serde::Deserialize;

const GITHUB_OWNER: &str = "DerianAndre";
const GITHUB_REPO: &str = "aidd.md";
const GITHUB_API_BASE: &str = "https://api.github.com";

/// A single GitHub release from the API.
#[derive(Debug, Deserialize)]
struct GitHubRelease {
    tag_name: String,
    body: Option<String>,
}

/// Infrastructure adapter for fetching framework releases from GitHub.
pub struct GitHubAdapter {
    client: reqwest::Client,
}

impl GitHubAdapter {
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .user_agent("aidd-hub/1.0")
            .build()
            .unwrap_or_default();
        Self { client }
    }

    /// Fetch the latest release tag and changelog from GitHub.
    pub async fn fetch_latest_release(&self) -> Result<(String, Option<String>), String> {
        let url = format!(
            "{}/repos/{}/{}/releases/latest",
            GITHUB_API_BASE, GITHUB_OWNER, GITHUB_REPO
        );

        let resp = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("GitHub API request failed: {}", e))?;

        if resp.status() == reqwest::StatusCode::NOT_FOUND {
            return Err("No releases found for this repository".to_string());
        }

        if !resp.status().is_success() {
            return Err(format!(
                "GitHub API returned status {}",
                resp.status()
            ));
        }

        let release: GitHubRelease = resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse GitHub release: {}", e))?;

        // Strip leading 'v' if present (e.g. "v1.0.0" → "1.0.0")
        let version = release.tag_name.strip_prefix('v').unwrap_or(&release.tag_name);

        Ok((version.to_string(), release.body))
    }

    /// Download and extract a release zipball into the target directory.
    /// Overwrites existing files but does NOT delete files not in the release.
    pub async fn download_and_extract(
        &self,
        version: &str,
        target_dir: &Path,
    ) -> Result<(), String> {
        // Try tagged release zipball first, fallback to archive URL
        let tag = if version.starts_with('v') {
            version.to_string()
        } else {
            format!("v{}", version)
        };

        let url = format!(
            "{}/repos/{}/{}/zipball/{}",
            GITHUB_API_BASE, GITHUB_OWNER, GITHUB_REPO, tag
        );

        let resp = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Download failed: {}", e))?;

        if !resp.status().is_success() {
            return Err(format!(
                "Download returned status {}",
                resp.status()
            ));
        }

        let bytes = resp
            .bytes()
            .await
            .map_err(|e| format!("Failed to read download body: {}", e))?;

        // Extract zip into target directory
        extract_zip(&bytes, target_dir)
    }
}

/// Extract a zip archive, stripping the top-level directory GitHub adds.
/// Only extracts framework-relevant directories: rules/, skills/, knowledge/,
/// workflows/, templates/, spec/, and top-level files like AGENTS.md.
fn extract_zip(data: &[u8], target_dir: &Path) -> Result<(), String> {
    let cursor = std::io::Cursor::new(data);
    let mut archive = zip::ZipArchive::new(cursor)
        .map_err(|e| format!("Failed to open zip: {}", e))?;

    // Framework categories to extract
    let categories = [
        "rules/", "skills/", "knowledge/", "workflows/", "templates/", "spec/",
    ];
    // Top-level files to extract
    let top_files = ["AGENTS.md", "CONTRIBUTING.md", "README.md"];

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| format!("Zip entry error: {}", e))?;

        let raw_name = match file.enclosed_name() {
            Some(name) => name.to_path_buf(),
            None => continue,
        };

        // Strip the top-level directory GitHub adds (e.g. "DerianAndre-aidd.md-abc1234/")
        let components: Vec<_> = raw_name.components().collect();
        if components.len() < 2 {
            continue; // skip the root dir entry itself
        }
        let relative: std::path::PathBuf = components[1..].iter().collect();
        let relative_str = relative.to_string_lossy();

        // Filter: only extract framework-relevant content
        let should_extract = categories.iter().any(|cat| relative_str.starts_with(cat))
            || top_files.iter().any(|f| relative_str == *f);

        if !should_extract {
            continue;
        }

        let target_path = target_dir.join(&relative);

        if file.is_dir() {
            std::fs::create_dir_all(&target_path)
                .map_err(|e| format!("Failed to create dir {}: {}", target_path.display(), e))?;
        } else {
            // Ensure parent exists
            if let Some(parent) = target_path.parent() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create parent dir: {}", e))?;
            }

            let mut content = Vec::new();
            file.read_to_end(&mut content)
                .map_err(|e| format!("Failed to read zip entry: {}", e))?;

            std::fs::write(&target_path, &content)
                .map_err(|e| format!("Failed to write {}: {}", target_path.display(), e))?;
        }
    }

    Ok(())
}
