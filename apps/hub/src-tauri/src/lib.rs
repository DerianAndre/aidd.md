mod domain;
mod application;
mod infrastructure;
mod presentation;

use std::sync::Arc;

use application::{FrameworkService, IntegrationService, McpService, ProjectService};
use infrastructure::filesystem::FileAdapter;
use infrastructure::persistence::JsonStore;


/// Shared application context — injected as Tauri managed state.
pub struct AppContext {
    pub project_service: Arc<ProjectService>,
    pub framework_service: Arc<FrameworkService>,
    pub integration_service: Arc<IntegrationService>,
    pub mcp_service: Arc<McpService>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Infrastructure
    let json_store = Arc::new(
        JsonStore::new().expect("Failed to initialize ~/.aidd/ storage"),
    );
    let file_adapter = Arc::new(FileAdapter);

    // Application services
    let project_service = Arc::new(ProjectService::new(
        json_store.clone(),
        file_adapter.clone(),
    ));
    let framework_service = Arc::new(
        FrameworkService::new(json_store.aidd_dir(), json_store.clone(), file_adapter.clone())
            .expect("Failed to initialize framework service"),
    );
    let integration_service = Arc::new(
        IntegrationService::new(json_store.aidd_dir()),
    );
    let process_manager = infrastructure::process::McpProcessManager::new();
    let mcp_service = Arc::new(McpService::new(process_manager));

    let ctx = AppContext {
        project_service,
        framework_service,
        integration_service,
        mcp_service,
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(ctx)
        .invoke_handler(tauri::generate_handler![
            // Project management (DDD)
            presentation::commands::project_commands::detect_project,
            presentation::commands::project_commands::add_project,
            presentation::commands::project_commands::remove_project,
            presentation::commands::project_commands::list_projects,
            presentation::commands::project_commands::get_active_project,
            presentation::commands::project_commands::set_active_project,
            // Framework management (DDD)
            presentation::commands::framework_commands::get_framework_path,
            presentation::commands::framework_commands::get_framework_version,
            presentation::commands::framework_commands::list_framework_entities,
            presentation::commands::framework_commands::read_framework_entity,
            presentation::commands::framework_commands::write_framework_entity,
            presentation::commands::framework_commands::delete_framework_entity,
            // Integration management (DDD)
            presentation::commands::integration_commands::integrate_tool,
            presentation::commands::integration_commands::remove_integration,
            presentation::commands::integration_commands::check_integrations,
            presentation::commands::integration_commands::list_integration_types,
            // MCP server management (DDD)
            presentation::commands::mcp_commands::start_mcp_server,
            presentation::commands::mcp_commands::stop_mcp_server,
            presentation::commands::mcp_commands::stop_all_mcp_servers,
            presentation::commands::mcp_commands::get_mcp_servers,
            // Filesystem
            presentation::commands::filesystem_commands::read_file,
            presentation::commands::filesystem_commands::write_file,
            presentation::commands::filesystem_commands::delete_file,
            presentation::commands::filesystem_commands::list_directory,
            presentation::commands::filesystem_commands::list_markdown_entities,
            presentation::commands::filesystem_commands::file_exists,
            presentation::commands::filesystem_commands::read_json_file,
            presentation::commands::filesystem_commands::write_json_file,
            // File watcher
            presentation::commands::watcher_commands::start_watching,
            presentation::commands::watcher_commands::stop_watching,
        ])
        .run(tauri::generate_context!())
        .expect("error while running aidd.md Hub");
}
