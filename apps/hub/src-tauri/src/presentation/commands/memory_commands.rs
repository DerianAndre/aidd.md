use std::path::PathBuf;
use tauri::{AppHandle, Emitter, State};
use crate::AppContext;
use crate::application::MemorySnapshot;
use crate::domain::ports::inbound::ProjectPort;

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

/// List observations for a specific session
#[tauri::command]
pub fn list_observations_by_session(
    ctx: State<'_, AppContext>,
    session_id: String,
    limit: Option<usize>,
) -> Result<serde_json::Value, String> {
    let observations = ctx
        .memory_service
        .list_observations_by_session(&session_id, limit)?;
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

/// List recent pattern audit scores.
#[tauri::command]
pub fn list_audit_scores(
    ctx: State<'_, AppContext>,
    limit: Option<usize>,
) -> Result<serde_json::Value, String> {
    let entries = ctx.memory_service.list_audit_scores(limit)?;
    Ok(serde_json::Value::Array(entries))
}

/// Get governance configuration from project-local SQLite.
#[tauri::command]
pub fn get_governance_config(
    ctx: State<'_, AppContext>,
) -> Result<serde_json::Value, String> {
    ctx.memory_service.get_governance_config()
}

/// Upsert governance configuration in project-local SQLite and sync .aidd/config.json.
#[tauri::command]
pub fn upsert_governance_config(
    ctx: State<'_, AppContext>,
    app: AppHandle,
    config: serde_json::Value,
) -> Result<(), String> {
    let payload = serde_json::to_string(&config).map_err(|e| e.to_string())?;
    ctx.memory_service.upsert_governance_config(&payload)?;

    let normalized = ctx.memory_service.get_governance_config()?;
    let active_path = ctx
        .project_service
        .get_active_path()
        .map_err(|e| format!("Failed to resolve active project: {}", e))?;
    if let Some(project_root) = active_path {
        let config_path = PathBuf::from(project_root).join(".aidd").join("config.json");
        if let Some(parent) = config_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create .aidd directory: {}", e))?;
        }
        let pretty = serde_json::to_string_pretty(&normalized).map_err(|e| e.to_string())?;
        std::fs::write(&config_path, pretty)
            .map_err(|e| format!("Failed to write {}: {}", config_path.display(), e))?;
    }

    let _ = app.emit("CONFIG_UPDATED", normalized);
    Ok(())
}

// --- Write commands ---

/// Create a permanent memory entry. Returns the new entry ID.
#[tauri::command]
pub fn create_permanent_memory(
    ctx: State<'_, AppContext>,
    memory_type: String,
    title: String,
    content: String,
) -> Result<String, String> {
    ctx.memory_service.create_permanent_memory(&memory_type, &title, &content)
}

/// Update a permanent memory entry by ID.
#[tauri::command]
pub fn update_permanent_memory(
    ctx: State<'_, AppContext>,
    id: String,
    title: String,
    content: String,
) -> Result<(), String> {
    ctx.memory_service.update_permanent_memory(&id, &title, &content)
}

/// Create an artifact. Returns the new artifact ID.
#[tauri::command]
pub fn create_artifact(
    ctx: State<'_, AppContext>,
    artifact_type: String,
    feature: String,
    title: String,
    description: String,
    content: String,
) -> Result<String, String> {
    ctx.memory_service.create_artifact(&artifact_type, &feature, &title, &description, &content)
}

/// Update an artifact by ID.
#[tauri::command]
pub fn update_artifact(
    ctx: State<'_, AppContext>,
    id: String,
    artifact_type: String,
    feature: String,
    title: String,
    description: String,
    content: String,
    status: String,
) -> Result<(), String> {
    ctx.memory_service.update_artifact(&id, &artifact_type, &feature, &title, &description, &content, &status)
}

/// Archive an artifact (set status to 'done').
#[tauri::command]
pub fn archive_artifact(
    ctx: State<'_, AppContext>,
    id: String,
) -> Result<(), String> {
    ctx.memory_service.archive_artifact(&id)
}

/// Delete an artifact by ID.
#[tauri::command]
pub fn delete_artifact(
    ctx: State<'_, AppContext>,
    id: String,
) -> Result<(), String> {
    ctx.memory_service.delete_artifact(&id)
}

/// Approve an evolution candidate.
#[tauri::command]
pub fn approve_evolution_candidate(
    ctx: State<'_, AppContext>,
    id: String,
) -> Result<(), String> {
    ctx.memory_service.approve_evolution_candidate(&id)
}

/// Reject an evolution candidate with a reason.
#[tauri::command]
pub fn reject_evolution_candidate(
    ctx: State<'_, AppContext>,
    id: String,
    reason: String,
) -> Result<(), String> {
    ctx.memory_service.reject_evolution_candidate(&id, &reason)
}

/// Approve a draft entry.
#[tauri::command]
pub fn approve_draft(
    ctx: State<'_, AppContext>,
    id: String,
) -> Result<(), String> {
    ctx.memory_service.approve_draft(&id)
}

/// Reject a draft entry with a reason.
#[tauri::command]
pub fn reject_draft(
    ctx: State<'_, AppContext>,
    id: String,
    reason: String,
) -> Result<(), String> {
    ctx.memory_service.reject_draft(&id, &reason)
}

/// Delete a session and its associated observations.
#[tauri::command]
pub fn delete_session(
    ctx: State<'_, AppContext>,
    id: String,
) -> Result<(), String> {
    ctx.memory_service.delete_session(&id)
}

/// Update a session's editable fields.
#[tauri::command]
pub fn update_session(
    ctx: State<'_, AppContext>,
    id: String,
    branch: Option<String>,
    input: Option<String>,
    output: Option<String>,
) -> Result<(), String> {
    ctx.memory_service.update_session(&id, branch.as_deref(), input.as_deref(), output.as_deref())
}

/// Update a session's full data via JSON merge.
#[tauri::command]
pub fn update_session_full(
    ctx: State<'_, AppContext>,
    id: String,
    updates_json: String,
) -> Result<(), String> {
    ctx.memory_service.update_session_full(&id, &updates_json)
}

// --- Observation CRUD ---

/// Create an observation. Returns the new observation ID.
#[tauri::command]
pub fn create_observation(
    ctx: State<'_, AppContext>,
    session_id: String,
    obs_type: String,
    title: String,
    narrative: Option<String>,
    facts: Option<String>,
    concepts: Option<String>,
    files_read: Option<String>,
    files_modified: Option<String>,
    discovery_tokens: Option<i64>,
) -> Result<String, String> {
    ctx.memory_service.create_observation(
        &session_id,
        &obs_type,
        &title,
        narrative.as_deref(),
        facts.as_deref(),
        concepts.as_deref(),
        files_read.as_deref(),
        files_modified.as_deref(),
        discovery_tokens,
    )
}

/// Update an observation by ID.
#[tauri::command]
pub fn update_observation(
    ctx: State<'_, AppContext>,
    id: String,
    obs_type: String,
    title: String,
    narrative: Option<String>,
    facts: Option<String>,
    concepts: Option<String>,
    files_read: Option<String>,
    files_modified: Option<String>,
    discovery_tokens: Option<i64>,
) -> Result<(), String> {
    ctx.memory_service.update_observation(
        &id,
        &obs_type,
        &title,
        narrative.as_deref(),
        facts.as_deref(),
        concepts.as_deref(),
        files_read.as_deref(),
        files_modified.as_deref(),
        discovery_tokens,
    )
}

/// Delete an observation by ID.
#[tauri::command]
pub fn delete_observation(
    ctx: State<'_, AppContext>,
    id: String,
) -> Result<(), String> {
    ctx.memory_service.delete_observation(&id)
}

// --- Evolution Candidate CRUD ---

/// Create an evolution candidate. Returns the new candidate ID.
#[tauri::command]
pub fn create_evolution_candidate_entry(
    ctx: State<'_, AppContext>,
    evo_type: String,
    title: String,
    confidence: f64,
    data: String,
) -> Result<String, String> {
    ctx.memory_service.create_evolution_candidate_entry(&evo_type, &title, confidence, &data)
}

/// Update an evolution candidate by ID.
#[tauri::command]
pub fn update_evolution_candidate_entry(
    ctx: State<'_, AppContext>,
    id: String,
    evo_type: String,
    title: String,
    confidence: f64,
    data: String,
) -> Result<(), String> {
    ctx.memory_service.update_evolution_candidate_entry(&id, &evo_type, &title, confidence, &data)
}

/// Delete an evolution candidate by ID.
#[tauri::command]
pub fn delete_evolution_candidate(
    ctx: State<'_, AppContext>,
    id: String,
) -> Result<(), String> {
    ctx.memory_service.delete_evolution_candidate(&id)
}

// --- Draft CRUD ---

/// Create a draft. Returns the new draft ID.
#[tauri::command]
pub fn create_draft(
    ctx: State<'_, AppContext>,
    category: String,
    title: String,
    filename: String,
    content: String,
    confidence: f64,
    source: String,
) -> Result<String, String> {
    ctx.memory_service.create_draft(&category, &title, &filename, &content, confidence, &source)
}

/// Update a draft by ID.
#[tauri::command]
pub fn update_draft(
    ctx: State<'_, AppContext>,
    id: String,
    title: String,
    content: String,
    category: String,
    confidence: Option<f64>,
    filename: Option<String>,
) -> Result<(), String> {
    ctx.memory_service.update_draft(&id, &title, &content, &category, confidence, filename.as_deref())
}

/// Delete a draft by ID.
#[tauri::command]
pub fn delete_draft(
    ctx: State<'_, AppContext>,
    id: String,
) -> Result<(), String> {
    ctx.memory_service.delete_draft(&id)
}
