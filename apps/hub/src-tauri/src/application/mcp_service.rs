use crate::domain::model::{McpServer, McpServerMode};
use crate::domain::ports::inbound::McpPort;
use crate::infrastructure::process::McpProcessManager;

pub struct McpService {
    process_manager: McpProcessManager,
}

impl McpService {
    pub fn new(process_manager: McpProcessManager) -> Self {
        Self { process_manager }
    }
}

impl McpPort for McpService {
    fn start_server(&self, package: &str, mode: McpServerMode) -> Result<McpServer, String> {
        self.process_manager.start(package, mode)
    }

    fn stop_server(&self, server_id: &str) -> Result<(), String> {
        self.process_manager.stop(server_id)
    }

    fn stop_all(&self) -> Result<(), String> {
        self.process_manager.stop_all()
    }

    fn get_servers(&self) -> Vec<McpServer> {
        self.process_manager.get_servers()
    }
}
