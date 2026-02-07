/**
 * VS Code / Copilot integration adapter.
 * Mirrors: apps/hub/src-tauri/src/infrastructure/integrations/vscode.rs
 *
 * Files managed:
 * - Project: .vscode/mcp.json — MCP server config (VS Code native format)
 * - Project: .github/copilot-instructions.md — Copilot instructions
 * - Project: AGENTS.md — thin redirect
 *
 * Note: VS Code uses `"servers"` key (not `"mcpServers"`) and requires `"type"` field.
 */
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

export class VscodeAdapter implements ToolAdapter {
  readonly tool = 'vscode' as const;

  integrate(projectPath: string, devMode: boolean) {
    const result = emptyResult(this.tool);

    // 1. Project: .vscode/mcp.json (VS Code native MCP format)
    const vscodeMcpPath = join(projectPath, '.vscode', 'mcp.json');
    const vscodeEntry = { type: 'stdio', ...mcpEntry(projectPath, devMode) };
    upsertMcpConfig(vscodeMcpPath, 'servers', vscodeEntry, result);

    // 2. Project: .github/copilot-instructions.md
    const name = projectName(projectPath);
    ensureFile(
      join(projectPath, '.github', 'copilot-instructions.md'),
      projectInstructions(name, 'Copilot', 'The aidd.md MCP server is configured at `.vscode/mcp.json`.'),
      result,
    );

    // 3. AGENTS.md redirect
    ensureAgentsRedirect(projectPath, result);

    result.messages.push('VS Code: MCP server + copilot-instructions.md configured');
    return result;
  }

  remove(projectPath: string) {
    const result = emptyResult(this.tool);

    const mcpPath = join(projectPath, '.vscode', 'mcp.json');
    removeMcpEntry(mcpPath, 'servers', result);

    if (removeFileIfExists(join(projectPath, '.github', 'copilot-instructions.md'))) {
      result.messages.push('Removed .github/copilot-instructions.md');
    }

    result.messages.push('AGENTS.md preserved (shared across integrations)');
    return result;
  }

  check(projectPath: string): IntegrationConfig {
    const configFiles: string[] = [];

    const mcpPath = join(projectPath, '.vscode', 'mcp.json');
    const [hasMcp, devMode] = checkMcpEntry(mcpPath, 'servers');
    if (hasMcp) configFiles.push(mcpPath);

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
