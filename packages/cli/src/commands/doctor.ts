import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { loadHubData, aiddHome, frameworkDir } from '../lib/hub-store.js';

interface Check {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

/**
 * `aidd doctor` — Full diagnostic.
 */
export function runDoctor(): void {
  console.log('aidd.md Doctor\n');

  const checks: Check[] = [];

  // 1. Node.js version
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.replace('v', ''), 10);
  checks.push({
    name: 'Node.js version',
    status: major >= 22 ? 'pass' : major >= 20 ? 'warn' : 'fail',
    detail: `${nodeVersion}${major < 22 ? ' (22+ recommended)' : ''}`,
  });

  // 2. ~/.aidd/ exists
  const home = aiddHome();
  checks.push({
    name: '~/.aidd/ directory',
    status: existsSync(home) ? 'pass' : 'fail',
    detail: existsSync(home) ? home : 'Not found — run `aidd init`',
  });

  // 3. hub.json
  const hubJson = join(home, 'hub.json');
  checks.push({
    name: 'hub.json',
    status: existsSync(hubJson) ? 'pass' : 'warn',
    detail: existsSync(hubJson) ? 'present' : 'Missing — run `aidd init`',
  });

  // 4. Framework directory
  const fw = frameworkDir();
  checks.push({
    name: 'Framework directory',
    status: existsSync(fw) ? 'pass' : 'fail',
    detail: existsSync(fw) ? fw : 'Not found — run `aidd init`',
  });

  // 5. Framework content
  const hasAgents = existsSync(join(fw, 'AGENTS.md'));
  const categories = ['rules', 'skills', 'knowledge', 'workflows', 'templates', 'spec'];
  let totalFiles = hasAgents ? 1 : 0;
  for (const cat of categories) {
    const dir = join(fw, cat);
    if (existsSync(dir)) {
      totalFiles += readdirSync(dir).filter((f) => f.endsWith('.md')).length;
    }
  }
  checks.push({
    name: 'Framework content',
    status: totalFiles > 0 ? 'pass' : 'warn',
    detail: `${totalFiles} files${totalFiles === 0 ? ' — run `aidd sync`' : ''}`,
  });

  // 6. Framework version
  const data = loadHubData();
  checks.push({
    name: 'Framework version',
    status: data.framework_version ? 'pass' : 'warn',
    detail: data.framework_version ?? 'None — run `aidd sync`',
  });

  // 7. Claude Code integration
  const claudeMcp = join(homedir(), '.claude', 'mcp.json');
  let claudeConfigured = false;
  if (existsSync(claudeMcp)) {
    try {
      const content = readFileSync(claudeMcp, 'utf-8');
      const config = JSON.parse(content);
      claudeConfigured = !!config?.mcpServers?.['aidd-engine'] || !!config?.mcpServers?.aidd;
    } catch {
      // ignore
    }
  }
  checks.push({
    name: 'Claude Code integration',
    status: claudeConfigured ? 'pass' : 'warn',
    detail: claudeConfigured
      ? 'aidd MCP server configured'
      : 'Not configured — run `aidd integrate claude`',
  });

  // 8. MCP packages — check if the engine dist exists in the monorepo
  const engineDist = join(aiddHome(), '..', 'aidd.md', 'mcps', 'mcp-aidd-engine', 'dist', 'index.js');
  const mcpAvailable = existsSync(engineDist);
  checks.push({
    name: 'MCP server package',
    status: mcpAvailable ? 'pass' : 'warn',
    detail: mcpAvailable
      ? '@aidd.md/mcp-engine is available'
      : 'Not installed globally (npx will auto-install)',
  });

  // Print results
  let hasFailure = false;

  for (const check of checks) {
    const prefix = check.status === 'fail' ? '  ✗' : check.status === 'warn' ? '  !' : '  ✓';
    console.log(`${prefix} ${check.name}: ${check.detail}`);
    if (check.status === 'fail') hasFailure = true;
  }

  console.log('');
  if (hasFailure) {
    console.log('Some checks failed. Run the suggested commands to fix.');
  } else {
    console.log('All checks passed!');
  }
}
