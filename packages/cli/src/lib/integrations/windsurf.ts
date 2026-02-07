/**
 * Windsurf / Antigravity integration adapter.
 * Mirrors: apps/hub/src-tauri/src/infrastructure/integrations/windsurf.rs
 *
 * Files managed:
 * - Global: ~/.codeium/windsurf/mcp_config.json — MCP server config
 * - Project: .windsurfrules — AIDD rules pointer
 * - Project: AGENTS.md — thin redirect
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { IntegrationConfig } from './types.js';
import {
  type ToolAdapter,
  RULES_POINTER,
  emptyResult,
  mcpEntry,
  upsertMcpConfig,
  removeMcpEntry,
  checkMcpEntry,
  ensureFile,
  ensureAgentsRedirect,
  removeFileIfExists,
  hasAgentsDir,
} from './shared.js';

export class WindsurfAdapter implements ToolAdapter {
  readonly tool = 'windsurf' as const;
  private readonly homeDir = homedir();

  integrate(projectPath: string, devMode: boolean) {
    const result = emptyResult(this.tool);

    // 1. Global: ~/.codeium/windsurf/mcp_config.json
    const mcpConfigPath = join(this.homeDir, '.codeium', 'windsurf', 'mcp_config.json');
    upsertMcpConfig(mcpConfigPath, 'mcpServers', mcpEntry(projectPath, devMode), result);

    // 2. Project: .windsurfrules (thin pointer)
    ensureFile(join(projectPath, '.windsurfrules'), RULES_POINTER, result);

    // 3. AGENTS.md redirect
    ensureAgentsRedirect(projectPath, result);

    result.messages.push('Windsurf: MCP server + .windsurfrules configured');
    return result;
  }

  remove(projectPath: string) {
    const result = emptyResult(this.tool);

    const mcpConfigPath = join(this.homeDir, '.codeium', 'windsurf', 'mcp_config.json');
    removeMcpEntry(mcpConfigPath, 'mcpServers', result);

    if (removeFileIfExists(join(projectPath, '.windsurfrules'))) {
      result.messages.push('Removed .windsurfrules');
    }

    result.messages.push('AGENTS.md preserved (shared across integrations)');
    return result;
  }

  check(projectPath: string): IntegrationConfig {
    const configFiles: string[] = [];

    const mcpConfigPath = join(this.homeDir, '.codeium', 'windsurf', 'mcp_config.json');
    const [hasMcp, devMode] = checkMcpEntry(mcpConfigPath, 'mcpServers');
    if (hasMcp) configFiles.push(mcpConfigPath);

    const hasAgents = hasAgentsDir(projectPath);
    if (hasAgents) configFiles.push(join(projectPath, '.aidd', 'content', 'agents'));

    const status = hasMcp && hasAgents
      ? 'configured'
      : hasMcp || hasAgents
        ? 'needs_update'
        : 'not_configured';

    return { tool: this.tool, status, config_files: configFiles, dev_mode: devMode };
  }
}
