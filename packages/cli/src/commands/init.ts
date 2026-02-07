import { existsSync } from 'node:fs';
import { ensureAiddHome, ensureFrameworkDirs, loadHubData, aiddHome, frameworkDir } from '../lib/hub-store.js';

/**
 * `aidd init` — Create ~/.aidd/ + populate framework skeleton.
 */
export function runInit(): void {
  console.log('Initializing aidd.md...\n');

  // 1. Create ~/.aidd/
  ensureAiddHome();
  console.log(`  ~/.aidd/              created`);

  // 2. Create framework directories
  ensureFrameworkDirs();
  console.log(`  ~/.aidd/framework/    created (with category subdirs)`);

  // 3. Ensure hub.json exists
  const data = loadHubData();
  console.log(`  ~/.aidd/hub.json      ${existsSync(`${aiddHome()}/hub.json`) ? 'loaded' : 'created'}`);
  console.log(`  Framework version:    ${data.framework_version ?? 'none (run `aidd sync` to download)'}`);
  console.log(`  Auto-sync:            ${data.auto_sync ? 'enabled' : 'disabled'}`);
  console.log(`  Projects registered:  ${data.projects.length}`);

  // 4. Check if framework has content
  const fwDir = frameworkDir();
  const hasAgents = existsSync(`${fwDir}/AGENTS.md`);
  const hasRules = existsSync(`${fwDir}/content/rules`) && (existsSync(`${fwDir}/content/rules/global.md`) || existsSync(`${fwDir}/content/rules/orchestrator.md`));

  console.log('');
  if (hasAgents && hasRules) {
    console.log('Framework content is present. Ready to use!');
  } else {
    console.log('Framework content is empty. Run `aidd sync` to download from GitHub.');
  }
}
