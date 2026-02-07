/**
 * Domain types for AI tool integrations.
 * Mirrors: apps/hub/src-tauri/src/domain/model/integration.rs
 */

export type IntegrationTool = 'claude' | 'cursor' | 'vscode' | 'gemini' | 'windsurf';

export type IntegrationStatus = 'not_configured' | 'configured' | 'needs_update';

export interface IntegrationResult {
  tool: IntegrationTool;
  files_created: string[];
  files_modified: string[];
  messages: string[];
}

export interface IntegrationConfig {
  tool: IntegrationTool;
  status: IntegrationStatus;
  config_files: string[];
  dev_mode: boolean;
}

export const ALL_TOOLS: IntegrationTool[] = ['claude', 'cursor', 'vscode', 'gemini', 'windsurf'];
