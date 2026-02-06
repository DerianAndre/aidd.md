pub(crate) mod adapter_trait;
pub(crate) mod claude;
pub(crate) mod cursor;
pub(crate) mod vscode;
pub(crate) mod gemini;

pub use claude::ClaudeAdapter;
pub use cursor::CursorAdapter;
pub use vscode::VscodeAdapter;
pub use gemini::GeminiAdapter;
