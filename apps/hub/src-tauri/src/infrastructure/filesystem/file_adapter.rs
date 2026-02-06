use std::path::Path;

use crate::domain::ports::outbound::FileSystemPort;

/// Standard filesystem adapter using `std::fs`.
pub struct FileAdapter;

impl FileSystemPort for FileAdapter {
    fn read_to_string(&self, path: &str) -> Result<String, String> {
        std::fs::read_to_string(path)
            .map_err(|e| format!("Failed to read {}: {}", path, e))
    }

    fn write(&self, path: &str, content: &str) -> Result<(), String> {
        let p = Path::new(path);
        if let Some(parent) = p.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create dirs: {}", e))?;
        }
        std::fs::write(path, content)
            .map_err(|e| format!("Failed to write {}: {}", path, e))
    }

    fn exists(&self, path: &str) -> bool {
        Path::new(path).exists()
    }

    fn is_dir(&self, path: &str) -> bool {
        Path::new(path).is_dir()
    }

    fn create_dir_all(&self, path: &str) -> Result<(), String> {
        std::fs::create_dir_all(path)
            .map_err(|e| format!("Failed to create directories: {}", e))
    }
}
