use std::collections::HashSet;
use std::sync::Arc;

use crate::domain::model::{
    McpHealthReport, McpHealthSummary, McpServerStatus,
};
use crate::domain::ports::inbound::McpHealthPort;
use crate::infrastructure::integrations::McpConfigScanner;
use crate::infrastructure::process::McpProcessManager;

pub struct McpHealthService {
    config_scanner: McpConfigScanner,
    process_manager: Arc<McpProcessManager>,
}

impl McpHealthService {
    pub fn new(config_scanner: McpConfigScanner, process_manager: Arc<McpProcessManager>) -> Self {
        Self {
            config_scanner,
            process_manager,
        }
    }
}

impl McpHealthPort for McpHealthService {
    fn scan_health(&self, project_path: Option<&str>) -> Result<McpHealthReport, String> {
        let discovered = self.config_scanner.scan(project_path)?;
        let hub_servers = self.process_manager.get_servers();

        // Compute summary
        let aidd_count = discovered.iter().filter(|d| d.is_aidd).count();
        let third_party_count = discovered.len() - aidd_count;

        let tools_with_config: Vec<String> = {
            let mut set = HashSet::new();
            for d in &discovered {
                set.insert(format!("{:?}", d.tool).to_lowercase());
            }
            set.into_iter().collect()
        };

        let hub_running = hub_servers
            .iter()
            .filter(|s| matches!(s.status, McpServerStatus::Running))
            .count();
        let hub_stopped = hub_servers
            .iter()
            .filter(|s| matches!(s.status, McpServerStatus::Stopped))
            .count();
        let hub_error = hub_servers
            .iter()
            .filter(|s| matches!(s.status, McpServerStatus::Error))
            .count();

        let summary = McpHealthSummary {
            total_discovered: discovered.len(),
            aidd_count,
            third_party_count,
            tools_with_config,
            hub_running,
            hub_stopped,
            hub_error,
        };

        Ok(McpHealthReport {
            discovered,
            hub_servers,
            summary,
        })
    }
}
