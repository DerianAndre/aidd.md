/**
 * Cursor integration adapter.
 * Mirrors: apps/hub/src-tauri/src/infrastructure/integrations/cursor.rs
 *
 * Files managed:
 * - Project: .cursor/mcp.json — MCP server config
 * - Project: .cursor/rules/aidd.mdc — AIDD rules pointer (MDC format)
 * - Project: AGENTS.md — thin redirect
 */
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

export class CursorAdapter implements ToolAdapter {
  readonly tool = 'cursor' as const;

  integrate(projectPath: string, devMode: boolean) {
    const result = emptyResult(this.tool);

    // 1. Project: .cursor/mcp.json
    const mcpJsonPath = join(projectPath, '.cursor', 'mcp.json');
    upsertMcpConfig(mcpJsonPath, 'mcpServers', mcpEntry(projectPath, devMode), result);

    // 2. Project: .cursor/rules/aidd.mdc (thin pointer with YAML frontmatter)
    const mdcContent = `---
description: "AIDD framework rules \u2014 AI-Driven Development"
alwaysApply: true
globs: []
---

# AIDD Framework

${RULES_POINTER}`;
    ensureFile(join(projectPath, '.cursor', 'rules', 'aidd.mdc'), mdcContent, result);

    // 3. AGENTS.md redirect
    ensureAgentsRedirect(projectPath, result);

    result.messages.push('Cursor: MCP server + rules configured for project');
    return result;
  }

  remove(projectPath: string) {
    const result = emptyResult(this.tool);

    const mcpPath = join(projectPath, '.cursor', 'mcp.json');
    removeMcpEntry(mcpPath, 'mcpServers', result);

    if (removeFileIfExists(join(projectPath, '.cursor', 'rules', 'aidd.mdc'))) {
      result.messages.push('Removed .cursor/rules/aidd.mdc');
    }

    result.messages.push('AGENTS.md preserved (shared across integrations)');
    return result;
  }

  check(projectPath: string): IntegrationConfig {
    const configFiles: string[] = [];

    const mcpPath = join(projectPath, '.cursor', 'mcp.json');
    const [hasMcp, devMode] = checkMcpEntry(mcpPath, 'mcpServers');
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
