use std::path::{Path, PathBuf};
use crate::domain::model::{IntegrationConfig, IntegrationResult, IntegrationType};
use crate::domain::ports::inbound::IntegrationPort;
use crate::infrastructure::integrations::adapter_trait::ToolAdapter;
use crate::infrastructure::integrations::{ClaudeAdapter, CursorAdapter, VscodeAdapter, GeminiAdapter};

pub struct IntegrationService {
    framework_path: PathBuf,
    adapters: Vec<Box<dyn ToolAdapter>>,
}

impl IntegrationService {
    pub fn new(framework_path: &Path) -> Self {
        let adapters: Vec<Box<dyn ToolAdapter>> = vec![
            Box::new(ClaudeAdapter::new()),
            Box::new(CursorAdapter),
            Box::new(VscodeAdapter),
            Box::new(GeminiAdapter),
        ];
        Self {
            framework_path: framework_path.to_path_buf(),
            adapters,
        }
    }

    fn adapter_for(&self, tool: &IntegrationType) -> Result<&dyn ToolAdapter, String> {
        self.adapters
            .iter()
            .find(|a| &a.tool_type() == tool)
            .map(|a| a.as_ref())
            .ok_or_else(|| format!("No adapter for {:?}", tool))
    }
}

impl IntegrationPort for IntegrationService {
    fn integrate(&self, project_path: &str, tool: IntegrationType) -> Result<IntegrationResult, String> {
        let project = Path::new(project_path);
        if !project.exists() {
            return Err(format!("Project path does not exist: {}", project_path));
        }
        let adapter = self.adapter_for(&tool)?;
        adapter.integrate(project, &self.framework_path)
    }

    fn remove_integration(&self, project_path: &str, tool: IntegrationType) -> Result<IntegrationResult, String> {
        let project = Path::new(project_path);
        let adapter = self.adapter_for(&tool)?;
        adapter.remove(project)
    }

    fn check_status(&self, project_path: &str) -> Result<Vec<IntegrationConfig>, String> {
        let project = Path::new(project_path);
        let mut results = Vec::new();
        for adapter in &self.adapters {
            results.push(adapter.check(project)?);
        }
        Ok(results)
    }

    fn list_available(&self) -> Vec<IntegrationType> {
        IntegrationType::all()
    }
}
