/// Outbound port for generic file system operations.
pub trait FileSystemPort: Send + Sync {
    fn read_to_string(&self, path: &str) -> Result<String, String>;
    fn write(&self, path: &str, content: &str) -> Result<(), String>;
    fn exists(&self, path: &str) -> bool;
    fn is_dir(&self, path: &str) -> bool;
    fn create_dir_all(&self, path: &str) -> Result<(), String>;
}
