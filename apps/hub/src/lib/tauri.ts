import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

// ---------------------------------------------------------------------------
// Typed invoke wrappers for Rust commands
// ---------------------------------------------------------------------------

// Filesystem
export const readFile = (path: string) =>
  invoke<string>('read_file', { path });

export const writeFile = (path: string, content: string) =>
  invoke<void>('write_file', { path, content });

export const deleteFile = (path: string) =>
  invoke<void>('delete_file', { path });

export const fileExists = (path: string) =>
  invoke<boolean>('file_exists', { path });

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  extension: string | null;
  size: number;
}

export const listDirectory = (
  path: string,
  extensions?: string[],
  recursive = false,
) => invoke<FileEntry[]>('list_directory', { path, extensions, recursive });

export interface MarkdownEntity {
  path: string;
  name: string;
  frontmatter: Record<string, string>;
  content: string;
  last_modified: string;
}

export const listMarkdownEntities = (basePath: string, recursive = false) =>
  invoke<MarkdownEntity[]>('list_markdown_entities', {
    basePath,
    recursive,
  });

export const readJsonFile = (path: string) =>
  invoke<unknown>('read_json_file', { path });

export const writeJsonFile = (path: string, data: unknown) =>
  invoke<void>('write_json_file', { path, data });

// Project management
export interface ProjectInfo {
  name: string;
  path: string;
  detected: boolean;
  markers: {
    agents: boolean;
    rules: boolean;
    skills: boolean;
    workflows: boolean;
    specs: boolean;
    knowledge: boolean;
    templates: boolean;
    aidd_dir: boolean;
    memory: boolean;
  };
}

export interface ProjectEntry {
  name: string;
  path: string;
  detected: boolean;
}

export const detectProject = (path: string) =>
  invoke<ProjectInfo>('detect_project', { path });

export const addProject = (path: string) =>
  invoke<ProjectInfo>('add_project', { path });

export const removeProject = (path: string) =>
  invoke<void>('remove_project', { path });

export const listProjects = () =>
  invoke<ProjectEntry[]>('list_projects');

export const getActiveProject = () =>
  invoke<string | null>('get_active_project');

export const setActiveProject = (path: string) =>
  invoke<void>('set_active_project', { path });

// Framework management
export type FrameworkCategory = 'agents' | 'rules' | 'skills' | 'knowledge' | 'workflows' | 'templates' | 'specs';

export interface FrameworkEntity {
  name: string;
  category: string;
  path: string;
  frontmatter: Record<string, string>;
  content: string;
  last_modified: string;
  source: string;
}

export const getFrameworkPath = () =>
  invoke<string>('get_framework_path');

export const getFrameworkVersion = () =>
  invoke<string | null>('get_framework_version');

export const listFrameworkEntities = (category: FrameworkCategory, projectPath?: string) =>
  invoke<FrameworkEntity[]>('list_framework_entities', { category, projectPath: projectPath ?? null });

export const readFrameworkEntity = (category: FrameworkCategory, name: string) =>
  invoke<FrameworkEntity>('read_framework_entity', { category, name });

export const writeFrameworkEntity = (category: FrameworkCategory, name: string, content: string) =>
  invoke<void>('write_framework_entity', { category, name, content });

export const deleteFrameworkEntity = (category: FrameworkCategory, name: string) =>
  invoke<void>('delete_framework_entity', { category, name });

// Framework sync
export interface SyncInfo {
  current_version: string | null;
  latest_version: string | null;
  update_available: boolean;
  auto_sync: boolean;
  last_check: string | null;
  changelog: string | null;
}

export const getSyncStatus = () =>
  invoke<SyncInfo>('get_sync_status');

export const checkForUpdates = () =>
  invoke<SyncInfo>('check_for_updates');

export const syncFramework = (version?: string) =>
  invoke<SyncInfo>('sync_framework', { version: version ?? null });

export const setAutoSync = (enabled: boolean) =>
  invoke<void>('set_auto_sync', { enabled });

// Project overrides
export interface AgentOverrides {
  disabled: string[];
}

export interface ProjectOverrides {
  project_path: string;
  agents: AgentOverrides;
  rule_count: number;
  skill_count: number;
}

export interface EffectiveEntity {
  name: string;
  category: string;
  source: 'global' | 'override';
  enabled: boolean;
  content: string | null;
}

export const getProjectOverrides = (projectPath: string) =>
  invoke<ProjectOverrides>('get_project_overrides', { projectPath });

export const setAgentOverride = (projectPath: string, agent: string, enabled: boolean) =>
  invoke<void>('set_agent_override', { projectPath, agent, enabled });

export const addProjectRule = (projectPath: string, name: string, content: string) =>
  invoke<void>('add_project_rule', { projectPath, name, content });

export const removeProjectRule = (projectPath: string, name: string) =>
  invoke<void>('remove_project_rule', { projectPath, name });

export const listProjectRules = (projectPath: string) =>
  invoke<FrameworkEntity[]>('list_project_rules', { projectPath });

export const getEffectiveEntities = (projectPath: string, category: FrameworkCategory) =>
  invoke<EffectiveEntity[]>('get_effective_entities', { projectPath, category });

// Integration management
export type IntegrationTool = 'claude_code' | 'cursor' | 'vscode' | 'gemini' | 'windsurf';

export type IntegrationStatusValue = 'not_configured' | 'configured' | 'needs_update';

export interface IntegrationConfig {
  integration_type: IntegrationTool;
  status: IntegrationStatusValue;
  config_files: string[];
  dev_mode: boolean;
}

export interface IntegrationResult {
  tool: IntegrationTool;
  files_created: string[];
  files_modified: string[];
  messages: string[];
}

export const integrateTool = (projectPath: string, tool: IntegrationTool, devMode = false) =>
  invoke<IntegrationResult>('integrate_tool', { projectPath, tool, devMode });

export const removeIntegration = (projectPath: string, tool: IntegrationTool) =>
  invoke<IntegrationResult>('remove_integration', { projectPath, tool });

export const checkIntegrations = (projectPath: string) =>
  invoke<IntegrationConfig[]>('check_integrations', { projectPath });

export const listIntegrationTypes = () =>
  invoke<IntegrationTool[]>('list_integration_types');

// MCP server management
export type McpServerMode = 'tool_launched' | 'hub_hosted';
export type McpServerStatus = 'stopped' | 'running' | 'error';

export interface McpServer {
  id: string;
  name: string;
  mode: McpServerMode;
  status: McpServerStatus;
  pid: number | null;
  started_at: string | null;
  error: string | null;
}

export const startMcpServer = (pkg: string, mode: McpServerMode) =>
  invoke<McpServer>('start_mcp_server', { package: pkg, mode });

export const stopMcpServer = (serverId: string) =>
  invoke<void>('stop_mcp_server', { serverId });

export const stopAllMcpServers = () =>
  invoke<void>('stop_all_mcp_servers');

export const getMcpServers = () =>
  invoke<McpServer[]>('get_mcp_servers');

export interface McpRuntimeTool {
  name: string;
  description?: string;
  inputSchema?: unknown;
  annotations?: Record<string, unknown>;
}

export const listMcpTools = (pkg = 'engine') =>
  invoke<McpRuntimeTool[]>('list_mcp_tools', { package: pkg });

export const callMcpTool = <T = unknown>(
  pkg: string,
  toolName: string,
  args: Record<string, unknown>,
) =>
  invoke<T>('call_mcp_tool', {
    package: pkg,
    toolName,
    arguments: args,
  });

// MCP health scanning
export type McpToolSource = 'claude_code' | 'cursor' | 'vscode' | 'gemini' | 'windsurf';
export type McpConfigScope = 'global' | 'project';

export interface DiscoveredMcp {
  name: string;
  tool: McpToolSource;
  scope: McpConfigScope;
  config_path: string;
  command: string | null;
  args: string[] | null;
  url: string | null;
  transport_type: string | null;
  is_aidd: boolean;
}

export interface McpHealthSummary {
  total_discovered: number;
  aidd_count: number;
  third_party_count: number;
  tools_with_config: string[];
  hub_running: number;
  hub_stopped: number;
  hub_error: number;
}

export interface McpHealthReport {
  discovered: DiscoveredMcp[];
  hub_servers: McpServer[];
  summary: McpHealthSummary;
}

export const scanMcpHealth = (projectPath?: string) =>
  invoke<McpHealthReport>('scan_mcp_health', { projectPath: projectPath ?? null });

// Memory data (detailed queries from SQLite)
export const listAllSessions = (limit?: number) =>
  invoke<unknown[]>('list_all_sessions', { limit: limit ?? null });

export const listEvolutionCandidates = () =>
  invoke<unknown[]>('list_evolution_candidates');

export const listEvolutionLog = (limit?: number) =>
  invoke<unknown[]>('list_evolution_log', { limit: limit ?? null });

export const listPermanentMemory = (memoryType: string) =>
  invoke<unknown[]>('list_permanent_memory', { memoryType });

export const deletePermanentMemory = (memoryType: string, id: string) =>
  invoke<void>('delete_permanent_memory', { memoryType, id });

export const listAllObservations = (limit?: number) =>
  invoke<unknown[]>('list_all_observations', { limit: limit ?? null });

export const listObservationsBySession = (sessionId: string, limit?: number) =>
  invoke<unknown[]>('list_observations_by_session', { sessionId, limit: limit ?? null });

export const listDrafts = () =>
  invoke<unknown[]>('list_drafts');

export const listArtifacts = (artifactType?: string, status?: string, limit?: number) =>
  invoke<unknown[]>('list_artifacts', {
    artifactType: artifactType ?? null,
    status: status ?? null,
    limit: limit ?? null,
  });

export const listAuditScores = (limit?: number) =>
  invoke<unknown[]>('list_audit_scores', { limit: limit ?? null });

// Memory write operations
export const createPermanentMemory = (memoryType: string, title: string, content: string) =>
  invoke<string>('create_permanent_memory', { memoryType, title, content });

export const updatePermanentMemory = (id: string, title: string, content: string) =>
  invoke<void>('update_permanent_memory', { id, title, content });

export const createArtifact = (artifactType: string, feature: string, title: string, description: string, content: string) =>
  invoke<string>('create_artifact', { artifactType, feature, title, description, content });

export const updateArtifact = (id: string, artifactType: string, feature: string, title: string, description: string, content: string, status: string) =>
  invoke<void>('update_artifact', { id, artifactType, feature, title, description, content, status });

export const archiveArtifact = (id: string) =>
  invoke<void>('archive_artifact', { id });

export const deleteArtifact = (id: string) =>
  invoke<void>('delete_artifact', { id });

export const approveEvolutionCandidate = (id: string) =>
  invoke<void>('approve_evolution_candidate', { id });

export const rejectEvolutionCandidate = (id: string, reason: string) =>
  invoke<void>('reject_evolution_candidate', { id, reason });

export const approveDraft = (id: string) =>
  invoke<void>('approve_draft', { id });

export const rejectDraft = (id: string, reason: string) =>
  invoke<void>('reject_draft', { id, reason });

export const deleteSession = (id: string) =>
  invoke<void>('delete_session', { id });

export const updateSession = (id: string, branch?: string, input?: string, output?: string) =>
  invoke<void>('update_session', { id, branch: branch ?? null, input: input ?? null, output: output ?? null });

export const updateSessionFull = (id: string, updatesJson: string) =>
  invoke<void>('update_session_full', { id, updatesJson });

// Observation CRUD
export const createObservation = (
  sessionId: string,
  obsType: string,
  title: string,
  narrative?: string,
  facts?: string,
  concepts?: string,
  filesRead?: string,
  filesModified?: string,
  discoveryTokens?: number,
) =>
  invoke<string>('create_observation', {
    sessionId,
    obsType,
    title,
    narrative: narrative ?? null,
    facts: facts ?? null,
    concepts: concepts ?? null,
    filesRead: filesRead ?? null,
    filesModified: filesModified ?? null,
    discoveryTokens: discoveryTokens ?? null,
  });

export const updateObservation = (
  id: string,
  obsType: string,
  title: string,
  narrative?: string,
  facts?: string,
  concepts?: string,
  filesRead?: string,
  filesModified?: string,
  discoveryTokens?: number,
) =>
  invoke<void>('update_observation', {
    id,
    obsType,
    title,
    narrative: narrative ?? null,
    facts: facts ?? null,
    concepts: concepts ?? null,
    filesRead: filesRead ?? null,
    filesModified: filesModified ?? null,
    discoveryTokens: discoveryTokens ?? null,
  });

export const deleteObservation = (id: string) =>
  invoke<void>('delete_observation', { id });

// Evolution candidate CRUD
export const createEvolutionCandidateEntry = (evoType: string, title: string, confidence: number, data: string) =>
  invoke<string>('create_evolution_candidate_entry', { evoType, title, confidence, data });

export const updateEvolutionCandidateEntry = (id: string, evoType: string, title: string, confidence: number, data: string) =>
  invoke<void>('update_evolution_candidate_entry', { id, evoType, title, confidence, data });

export const deleteEvolutionCandidate = (id: string) =>
  invoke<void>('delete_evolution_candidate', { id });

// Draft CRUD
export const createDraft = (category: string, title: string, filename: string, content: string, confidence: number, source: string) =>
  invoke<string>('create_draft', { category, title, filename, content, confidence, source });

export const updateDraft = (id: string, title: string, content: string, category: string, confidence?: number, filename?: string) =>
  invoke<void>('update_draft', { id, title, content, category, confidence: confidence ?? null, filename: filename ?? null });

export const deleteDraft = (id: string) =>
  invoke<void>('delete_draft', { id });

// File watcher
export interface FileChangeEvent {
  event_type: 'created' | 'modified' | 'deleted';
  paths: string[];
}

export const startWatching = (path: string, recursive = true) =>
  invoke<string>('start_watching', { path, recursive });

export const stopWatching = (watcherId: string) =>
  invoke<void>('stop_watching', { watcherId });

export const onFileChanged = (
  callback: (event: FileChangeEvent) => void,
): Promise<UnlistenFn> =>
  listen<FileChangeEvent>('file-changed', (e) => callback(e.payload));
