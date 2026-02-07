/**
 * IntegrationService — adapter registry and orchestration.
 * Mirrors: apps/hub/src-tauri/src/application/integration_service.rs
 */
import { resolve } from 'node:path';
import type { IntegrationTool, IntegrationResult, IntegrationConfig } from './types.js';
import { ALL_TOOLS } from './types.js';
import type { ToolAdapter } from './shared.js';
import { detectDevMode } from './shared.js';
import { ClaudeAdapter } from './claude.js';
import { CursorAdapter } from './cursor.js';
import { VscodeAdapter } from './vscode.js';
import { GeminiAdapter } from './gemini.js';
import { WindsurfAdapter } from './windsurf.js';

export class IntegrationService {
  private readonly adapters: ToolAdapter[];

  constructor() {
    this.adapters = [
      new ClaudeAdapter(),
      new CursorAdapter(),
      new VscodeAdapter(),
      new GeminiAdapter(),
      new WindsurfAdapter(),
    ];
  }

  private adapterFor(tool: IntegrationTool): ToolAdapter {
    const adapter = this.adapters.find((a) => a.tool === tool);
    if (!adapter) throw new Error(`No adapter for: ${tool}`);
    return adapter;
  }

  integrate(projectPath: string, tool: IntegrationTool, devMode?: boolean): IntegrationResult {
    const absPath = resolve(projectPath);
    const dev = devMode ?? detectDevMode(absPath);
    return this.adapterFor(tool).integrate(absPath, dev);
  }

  remove(projectPath: string, tool: IntegrationTool): IntegrationResult {
    return this.adapterFor(tool).remove(resolve(projectPath));
  }

  check(projectPath: string, tool: IntegrationTool): IntegrationConfig {
    return this.adapterFor(tool).check(resolve(projectPath));
  }

  checkAll(projectPath: string): IntegrationConfig[] {
    const absPath = resolve(projectPath);
    return this.adapters.map((a) => a.check(absPath));
  }

  integrateAll(projectPath: string, devMode?: boolean): IntegrationResult[] {
    const absPath = resolve(projectPath);
    const dev = devMode ?? detectDevMode(absPath);
    return this.adapters.map((a) => a.integrate(absPath, dev));
  }

  listTools(): IntegrationTool[] {
    return [...ALL_TOOLS];
  }
}
