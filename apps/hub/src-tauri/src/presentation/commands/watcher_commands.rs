use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::sync::mpsc;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileChangeEvent {
    pub event_type: String,
    pub paths: Vec<String>,
}

/// Start watching a directory for file changes.
/// Emits "file-changed" events to the frontend.
#[tauri::command]
pub async fn start_watching(
    path: String,
    recursive: bool,
    app: AppHandle,
) -> Result<String, String> {
    let watch_path = path.clone();
    let watcher_id = format!("watcher-{}", uuid_simple());

    let mode = if recursive {
        RecursiveMode::Recursive
    } else {
        RecursiveMode::NonRecursive
    };

    std::thread::spawn(move || {
        let (tx, rx) = mpsc::channel::<Result<Event, notify::Error>>();

        let mut watcher = RecommendedWatcher::new(tx, Config::default())
            .expect("Failed to create file watcher");

        watcher
            .watch(std::path::Path::new(&watch_path), mode)
            .expect("Failed to start watching");

        // Keep watcher alive and relay events
        loop {
            match rx.recv() {
                Ok(Ok(event)) => {
                    let event_type = match event.kind {
                        notify::EventKind::Create(_) => "created",
                        notify::EventKind::Modify(_) => "modified",
                        notify::EventKind::Remove(_) => "deleted",
                        _ => continue,
                    };

                    let paths: Vec<String> = event
                        .paths
                        .iter()
                        .map(|p| p.to_string_lossy().to_string())
                        .collect();

                    let _ = app.emit(
                        "file-changed",
                        FileChangeEvent {
                            event_type: event_type.to_string(),
                            paths,
                        },
                    );
                }
                Ok(Err(_)) => continue,
                Err(_) => break,
            }
        }
    });

    Ok(watcher_id)
}

/// Stop watching (placeholder — full implementation needs watcher handle storage).
#[tauri::command]
pub async fn stop_watching(_watcher_id: String) -> Result<(), String> {
    Ok(())
}

fn uuid_simple() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("{:x}", ts)
}
