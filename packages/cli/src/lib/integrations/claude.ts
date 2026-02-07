/**
 * Claude Code integration adapter.
 * Mirrors: apps/hub/src-tauri/src/infrastructure/integrations/claude.rs
 *
 * Files managed:
 * - User scope: ~/.claude.json — MCP server config
 * - Project scope: .mcp.json — MCP server config (team-shareable via git)
 * - Project: CLAUDE.md — project instructions
 * - Project: AGENTS.md — thin redirect
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { IntegrationConfig } from './types.js';
import {
  type ToolAdapter,
  emptyResult,
  mcpEntry,
  projectName,
  projectInstructions,
  upsertMcpConfig,
  removeMcpEntry,
  checkMcpEntry,
  ensureFile,
  ensureAgentsRedirect,
  removeFileIfExists,
  hasAgentsDir,
} from './shared.js';

export class ClaudeAdapter implements ToolAdapter {
  readonly tool = 'claude' as const;
  private readonly homeDir = homedir();

  integrate(projectPath: string, devMode: boolean) {
    const result = emptyResult(this.tool);
    const entry = mcpEntry(projectPath, devMode);

    // 1. User scope: ~/.claude.json
    const userConfig = join(this.homeDir, '.claude.json');
    upsertMcpConfig(userConfig, 'mcpServers', entry, result);

    // 2. Project scope: .mcp.json (team-shareable via git)
    const projectMcp = join(projectPath, '.mcp.json');
    upsertMcpConfig(projectMcp, 'mcpServers', entry, result);

    // 3. Project: CLAUDE.md
    const name = projectName(projectPath);
    ensureFile(
      join(projectPath, 'CLAUDE.md'),
      projectInstructions(
        name,
        'Claude Code',
        'The aidd.md MCP server is configured at `~/.claude.json` (user scope) and `.mcp.json` (project scope).',
      ),
      result,
    );

    // 4. AGENTS.md redirect
    ensureAgentsRedirect(projectPath, result);

    const mode = devMode ? 'dev' : 'npx';
    result.messages.push(`Claude Code: MCP server configured (${mode}, user + project scope)`);
    return result;
  }

  remove(projectPath: string) {
    const result = emptyResult(this.tool);

    // Remove from ~/.claude.json
    const userConfig = join(this.homeDir, '.claude.json');
    removeMcpEntry(userConfig, 'mcpServers', result);

    // Remove .mcp.json entry
    const projectMcp = join(projectPath, '.mcp.json');
    removeMcpEntry(projectMcp, 'mcpServers', result);

    // Remove CLAUDE.md
    if (removeFileIfExists(join(projectPath, 'CLAUDE.md'))) {
      result.messages.push('Removed CLAUDE.md');
    }

    result.messages.push('AGENTS.md preserved (shared across integrations)');
    return result;
  }

  check(projectPath: string): IntegrationConfig {
    const configFiles: string[] = [];

    const userConfig = join(this.homeDir, '.claude.json');
    const [hasUser, devModeUser] = checkMcpEntry(userConfig, 'mcpServers');
    if (hasUser) configFiles.push(userConfig);

    const projectMcp = join(projectPath, '.mcp.json');
    const [hasProject, devModeProject] = checkMcpEntry(projectMcp, 'mcpServers');
    if (hasProject) configFiles.push(projectMcp);

    const hasAgents = hasAgentsDir(projectPath);
    if (hasAgents) configFiles.push(join(projectPath, '.aidd', 'content', 'agents'));

    const hasMcp = hasUser || hasProject;
    const status = hasMcp && hasAgents
      ? 'configured'
      : hasMcp || hasAgents
        ? 'needs_update'
        : 'not_configured';

    return {
      tool: this.tool,
      status,
      config_files: configFiles,
      dev_mode: devModeUser || devModeProject,
    };
  }
}
