mod commands;
mod state;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::filesystem::read_file,
            commands::filesystem::write_file,
            commands::filesystem::delete_file,
            commands::filesystem::list_directory,
            commands::filesystem::list_markdown_entities,
            commands::filesystem::file_exists,
            commands::filesystem::read_json_file,
            commands::filesystem::write_json_file,
            commands::project::detect_project,
            commands::project::add_project,
            commands::project::remove_project,
            commands::project::list_projects,
            commands::project::get_active_project,
            commands::project::set_active_project,
            commands::watcher::start_watching,
            commands::watcher::stop_watching,
        ])
        .run(tauri::generate_context!())
        .expect("error while running aidd.md Hub");
}
