/**
 * Gemini integration adapter.
 * Mirrors: apps/hub/src-tauri/src/infrastructure/integrations/gemini.rs
 *
 * Files managed:
 * - Project: AGENTS.md — thin redirect (Gemini reads this natively)
 * - Project: .gemini/settings.json — optional settings
 *
 * Note: Gemini does not use MCP — it reads AGENTS.md directly.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { IntegrationConfig } from './types.js';
import {
  type ToolAdapter,
  emptyResult,
  ensureFile,
  ensureAgentsRedirect,
  removeFileIfExists,
  hasAgentsDir,
} from './shared.js';

export class GeminiAdapter implements ToolAdapter {
  readonly tool = 'gemini' as const;

  integrate(projectPath: string, _devMode: boolean) {
    const result = emptyResult(this.tool);

    // 1. AGENTS.md redirect (Gemini reads this natively)
    ensureAgentsRedirect(projectPath, result);

    // 2. Optional .gemini/settings.json
    ensureFile(
      join(projectPath, '.gemini', 'settings.json'),
      JSON.stringify({ agentsFile: 'AGENTS.md' }, null, 2),
      result,
    );

    const routingFile = join(projectPath, '.aidd', 'content', 'routing.md');
    if (existsSync(routingFile)) {
      result.messages.push('Gemini: AGENTS.md redirect + .gemini/settings.json configured');
    } else {
      result.messages.push('Gemini: configured \u2014 run scaffold to create .aidd/content/routing.md');
    }

    return result;
  }

  remove(projectPath: string) {
    const result = emptyResult(this.tool);

    if (removeFileIfExists(join(projectPath, '.gemini', 'settings.json'))) {
      result.messages.push('Removed .gemini/settings.json');
    }

    result.messages.push('AGENTS.md preserved (shared across integrations)');
    return result;
  }

  check(projectPath: string): IntegrationConfig {
    const configFiles: string[] = [];

    const hasAgents = hasAgentsDir(projectPath);
    if (hasAgents) configFiles.push(join(projectPath, '.aidd', 'content', 'routing.md'));

    const hasSettings = existsSync(join(projectPath, '.gemini', 'settings.json'));
    if (hasSettings) configFiles.push(join(projectPath, '.gemini', 'settings.json'));

    const hasAgentsFile = existsSync(join(projectPath, 'AGENTS.md'));
    if (hasAgentsFile) configFiles.push(join(projectPath, 'AGENTS.md'));

    const status = hasAgentsFile && hasAgents
      ? 'configured'
      : hasAgentsFile || hasAgents
        ? 'needs_update'
        : 'not_configured';

    return { tool: this.tool, status, config_files: configFiles, dev_mode: false };
  }
}
