import { resolve } from 'node:path';
import { loadHubData } from '../lib/hub-store.js';
import { integrate, integrateAll, listTools, type IntegrationTool } from '../lib/integrations.js';

/**
 * `aidd integrate <tool> [--project <path>]` — Configure integration.
 */
export function runIntegrate(tool: string, options: { project?: string; all?: boolean }): void {
  const projectPath = resolveProjectPath(options.project);

  if (options.all || tool === 'all') {
    console.log(`Integrating all tools for: ${projectPath}\n`);
    const results = integrateAll(projectPath);
    for (const r of results) {
      printResult(r);
    }
    return;
  }

  const validTools = listTools();
  if (!validTools.includes(tool as IntegrationTool)) {
    console.error(`Unknown tool: ${tool}`);
    console.error(`Valid tools: ${validTools.join(', ')}, all`);
    process.exit(1);
  }

  console.log(`Integrating ${tool} for: ${projectPath}\n`);
  const result = integrate(projectPath, tool as IntegrationTool);
  printResult(result);
}

function resolveProjectPath(project?: string): string {
  if (project) return resolve(project);

  // Try active project from hub.json
  const data = loadHubData();
  if (data.active_project) return data.active_project;

  // Fallback to cwd
  return process.cwd();
}

function printResult(r: { tool: string; files_created: string[]; files_modified: string[]; messages: string[] }): void {
  for (const msg of r.messages) {
    console.log(`  ${msg}`);
  }
  for (const f of r.files_created) {
    console.log(`  + ${f}`);
  }
  for (const f of r.files_modified) {
    console.log(`  ~ ${f}`);
  }
  console.log('');
}
