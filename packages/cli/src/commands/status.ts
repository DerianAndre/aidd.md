import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadHubData, aiddHome, frameworkDir } from '../lib/hub-store.js';

/**
 * `aidd status` — Show everything: framework, projects, integrations, MCP.
 */
export function runStatus(): void {
  const data = loadHubData();
  const home = aiddHome();
  const fw = frameworkDir();

  console.log('aidd.md Status\n');

  // Global
  console.log('  Global:');
  console.log(`    Home:               ${home}`);
  console.log(`    hub.json:           ${existsSync(join(home, 'hub.json')) ? 'present' : 'missing'}`);
  console.log(`    Framework version:  ${data.framework_version ?? 'none'}`);
  console.log(`    Auto-sync:          ${data.auto_sync ? 'enabled' : 'disabled'}`);
  console.log(`    Last check:         ${data.last_sync_check ?? 'never'}`);
  console.log('');

  // Framework content
  console.log('  Framework:');
  const categories = ['rules', 'skills', 'knowledge', 'workflows', 'templates', 'spec'];
  const hasAgents = existsSync(join(fw, 'AGENTS.md'));
  console.log(`    AGENTS.md:          ${hasAgents ? 'present' : 'missing'}`);
  for (const cat of categories) {
    const dir = join(fw, cat);
    const count = existsSync(dir)
      ? readdirSync(dir).filter((f) => f.endsWith('.md')).length
      : 0;
    console.log(`    ${cat.padEnd(20)}${count} files`);
  }
  console.log('');

  // Projects
  console.log(`  Projects (${data.projects.length}):`);
  if (data.projects.length === 0) {
    console.log('    (none registered)');
  } else {
    for (const p of data.projects) {
      const active = p.path === data.active_project ? ' *' : '';
      const exists = existsSync(p.path) ? '' : ' (missing)';
      console.log(`    ${p.name}${active}${exists}`);
    }
  }
}
