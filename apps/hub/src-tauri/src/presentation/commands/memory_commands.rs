use tauri::State;
use crate::AppContext;
use crate::application::MemorySnapshot;

/// Get complete memory snapshot (sessions, observations, evolution, patterns)
#[tauri::command]
pub fn get_memory_snapshot(
    ctx: State<'_, AppContext>,
) -> Result<MemorySnapshot, String> {
    ctx.memory_service.get_memory_snapshot()
}

/// Get session summary and recent sessions
#[tauri::command]
pub fn get_sessions(
    ctx: State<'_, AppContext>,
) -> Result<serde_json::Value, String> {
    let summary = ctx.memory_service.get_session_summary()?;
    Ok(serde_json::to_value(summary).map_err(|e| e.to_string())?)
}

/// Get evolution status (pending, approved, rejected, auto-applied)
#[tauri::command]
pub fn get_evolution_status(
    ctx: State<'_, AppContext>,
) -> Result<serde_json::Value, String> {
    let status = ctx.memory_service.get_evolution_status()?;
    Ok(serde_json::to_value(status).map_err(|e| e.to_string())?)
}

/// Get pattern statistics (total, active, detections, false positives)
#[tauri::command]
pub fn get_pattern_stats(
    ctx: State<'_, AppContext>,
) -> Result<serde_json::Value, String> {
    let stats = ctx.memory_service.get_pattern_stats()?;
    Ok(serde_json::to_value(stats).map_err(|e| e.to_string())?)
}

/// List all observations
#[tauri::command]
pub fn list_all_observations(
    ctx: State<'_, AppContext>,
    limit: Option<usize>,
) -> Result<serde_json::Value, String> {
    let observations = ctx.memory_service.list_all_observations(limit)?;
    Ok(serde_json::Value::Array(observations))
}

/// Search observations
#[tauri::command]
pub fn search_observations(
    ctx: State<'_, AppContext>,
    query: String,
    limit: Option<usize>,
) -> Result<serde_json::Value, String> {
    let observations = ctx.memory_service.search_observations(&query, limit)?;
    Ok(serde_json::to_value(observations).map_err(|e| e.to_string())?)
}

/// List all sessions with full detail (JSON blobs from SQLite data column)
#[tauri::command]
pub fn list_all_sessions(
    ctx: State<'_, AppContext>,
    limit: Option<usize>,
) -> Result<serde_json::Value, String> {
    let sessions = ctx.memory_service.list_all_sessions(limit)?;
    Ok(serde_json::Value::Array(sessions))
}

/// List evolution candidates with full detail
#[tauri::command]
pub fn list_evolution_candidates(
    ctx: State<'_, AppContext>,
) -> Result<serde_json::Value, String> {
    let candidates = ctx.memory_service.list_evolution_candidates()?;
    Ok(serde_json::Value::Array(candidates))
}

/// List evolution log entries
#[tauri::command]
pub fn list_evolution_log(
    ctx: State<'_, AppContext>,
    limit: Option<usize>,
) -> Result<serde_json::Value, String> {
    let entries = ctx.memory_service.list_evolution_log(limit)?;
    Ok(serde_json::Value::Array(entries))
}

/// List permanent memory entries by type (decision, mistake, convention)
#[tauri::command]
pub fn list_permanent_memory(
    ctx: State<'_, AppContext>,
    memory_type: String,
) -> Result<serde_json::Value, String> {
    let entries = ctx.memory_service.list_permanent_memory(&memory_type)?;
    Ok(serde_json::Value::Array(entries))
}

/// Delete a permanent memory entry by type and id
#[tauri::command]
pub fn delete_permanent_memory(
    ctx: State<'_, AppContext>,
    memory_type: String,
    id: String,
) -> Result<(), String> {
    ctx.memory_service.delete_permanent_memory(&memory_type, &id)
}

/// List all draft entries
#[tauri::command]
pub fn list_drafts(
    ctx: State<'_, AppContext>,
) -> Result<serde_json::Value, String> {
    let drafts = ctx.memory_service.list_drafts()?;
    Ok(serde_json::Value::Array(drafts))
}

/// List artifacts with optional filters
#[tauri::command]
pub fn list_artifacts(
    ctx: State<'_, AppContext>,
    artifact_type: Option<String>,
    status: Option<String>,
    limit: Option<usize>,
) -> Result<serde_json::Value, String> {
    let artifacts = ctx.memory_service.list_artifacts(
        artifact_type.as_deref(),
        status.as_deref(),
        limit,
    )?;
    Ok(serde_json::Value::Array(artifacts))
}
