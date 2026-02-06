#!/usr/bin/env node
/**
 * MCP Doctor — Full diagnostic of the AIDD MCP environment.
 * Usage: node scripts/mcp-doctor.mjs
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const PREFIX = '[aidd.md]';

let issues = 0;
let warnings = 0;

function pass(msg) { console.log(`  ${GREEN}✅ ${msg}${RESET}`); }
function fail(msg) { issues++; console.log(`  ${RED}❌ ${msg}${RESET}`); }
function warn(msg, hint) {
  warnings++;
  console.log(`  ${YELLOW}⚠️  ${msg}${RESET}`);
  if (hint) console.log(`      ${DIM}→ ${hint}${RESET}`);
}

function getVersion(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf-8', shell: true }).trim().replace(/^v/, '');
  } catch {
    return null;
  }
}

function countFiles(dir, ext) {
  try {
    return readdirSync(dir).filter((f) => f.endsWith(ext)).length;
  } catch {
    return 0;
  }
}

console.log(`\n${BOLD}${PREFIX} Doctor${RESET}\n`);

// --- Environment ---
console.log(`${DIM}Environment${RESET}`);

const nodeVersion = getVersion('node', ['--version']);
if (nodeVersion && parseInt(nodeVersion) >= 22) {
  pass(`Node.js v${nodeVersion}`);
} else {
  fail(`Node.js ${nodeVersion ?? 'not found'} (requires v22+)`);
}

const pnpmVersion = getVersion('pnpm', ['--version']);
if (pnpmVersion && parseInt(pnpmVersion) >= 10) {
  pass(`pnpm ${pnpmVersion}`);
} else {
  fail(`pnpm ${pnpmVersion ?? 'not found'} (requires v10+)`);
}

// --- MCP Packages ---
console.log(`\n${DIM}MCP Packages${RESET}`);

const mcpsDir = resolve(root, 'mcps');
const packages = [
  { name: '@aidd.md/mcp-shared', dir: 'shared', dist: 'dist/index.js' },
  { name: '@aidd.md/mcp', dir: 'mcp-aidd', dist: 'dist/index.js' },
  { name: '@aidd.md/mcp-core', dir: 'mcp-aidd-core', dist: 'dist/index.js' },
  { name: '@aidd.md/mcp-memory', dir: 'mcp-aidd-memory', dist: 'dist/index.js' },
  { name: '@aidd.md/mcp-tools', dir: 'mcp-aidd-tools', dist: 'dist/index.js' },
];

let built = 0;
let exists = 0;

for (const pkg of packages) {
  const pkgDir = resolve(mcpsDir, pkg.dir);
  const distPath = resolve(pkgDir, pkg.dist);

  if (!existsSync(resolve(pkgDir, 'package.json'))) {
    continue; // Package not created yet — skip silently
  }

  exists++;

  if (existsSync(distPath)) {
    built++;
    pass(`${pkg.name} built`);
  } else {
    fail(`${pkg.name} not built`);
  }
}

if (exists === 0) {
  warn('No MCP packages found yet', 'Run: pnpm mcp:setup');
} else if (built === exists) {
  pass(`${built}/${exists} packages built`);
}

// --- AIDD Framework Content ---
console.log(`\n${DIM}AIDD Framework${RESET}`);

const agentsPath = resolve(root, 'AGENTS.md');
if (existsSync(agentsPath)) {
  pass('AGENTS.md found');
} else {
  fail('AGENTS.md missing');
}

const rulesDir = resolve(root, 'rules');
if (existsSync(rulesDir)) {
  const count = countFiles(rulesDir, '.md');
  pass(`rules/ (${count} files)`);
} else {
  fail('rules/ missing');
}

const skillsDir = resolve(root, 'skills');
if (existsSync(skillsDir)) {
  try {
    const agents = readdirSync(skillsDir).filter((f) => {
      return existsSync(resolve(skillsDir, f, 'SKILL.md'));
    });
    pass(`skills/ (${agents.length} agents)`);
  } catch {
    warn('skills/ exists but could not read');
  }
} else {
  fail('skills/ missing');
}

const knowledgeDir = resolve(root, 'knowledge');
if (existsSync(knowledgeDir)) {
  let entryCount = 0;
  try {
    const categories = readdirSync(knowledgeDir).filter((f) =>
      existsSync(resolve(knowledgeDir, f)) &&
      readdirSync(resolve(knowledgeDir, f)).some((e) => e.endsWith('.md'))
    );
    for (const cat of categories) {
      entryCount += countFiles(resolve(knowledgeDir, cat), '.md');
    }
    pass(`knowledge/ (${entryCount} entries)`);
  } catch {
    warn('knowledge/ exists but could not count entries');
  }
} else {
  warn('knowledge/ missing');
}

const workflowsDir = resolve(root, 'workflows');
if (existsSync(workflowsDir)) {
  const count = countFiles(workflowsDir, '.md');
  pass(`workflows/ (${count} files)`);
} else {
  warn('workflows/ missing');
}

const specDir = resolve(root, 'spec');
if (existsSync(specDir)) {
  const count = countFiles(specDir, '.md');
  pass(`spec/ (${count} files)`);
} else {
  warn('spec/ missing');
}

// --- Model Matrix ---
console.log(`\n${DIM}Model Matrix${RESET}`);

const modelMatrixMd = resolve(root, 'templates/model-matrix.md');
const modelMatrixTs = resolve(root, 'mcps/mcp-aidd-core/src/modules/routing/model-matrix.ts');

if (existsSync(modelMatrixMd) && existsSync(modelMatrixTs)) {
  const mdContent = readFileSync(modelMatrixMd, 'utf-8');
  const tsContent = readFileSync(modelMatrixTs, 'utf-8');

  // Quick sync check: extract model IDs from Provider Registry section only
  const registryStart = mdContent.indexOf('## 2. Provider Registry');
  const registryEnd = mdContent.indexOf('## 3.', registryStart > -1 ? registryStart : 0);
  const registrySection = registryStart > -1
    ? mdContent.slice(registryStart, registryEnd > -1 ? registryEnd : undefined)
    : '';
  // Match backticked IDs in table rows (column 3 of Provider Registry tables)
  const mdIds = [...registrySection.matchAll(/\|\s*`([^`]+)`\s*\|/g)].map((m) => m[1]);
  const tsIds = [...tsContent.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);

  const mdSet = new Set(mdIds);
  const tsSet = new Set(tsIds);
  const missingInTs = [...mdSet].filter((id) => !tsSet.has(id));
  const missingInMd = [...tsSet].filter((id) => !mdSet.has(id));

  if (missingInTs.length === 0 && missingInMd.length === 0) {
    pass(`model-matrix.md ↔ model-matrix.ts in sync (${tsIds.length} models)`);
  } else {
    warn(
      `Model matrix drift: ${missingInTs.length} in md only, ${missingInMd.length} in ts only`,
      'Run: pnpm mcp:models:sync for details'
    );
  }

  // Check last updated date
  const lastUpdatedMatch = mdContent.match(/\*\*Last Updated\*\*:\s*(\d{4}-\d{2}-\d{2})/);
  if (lastUpdatedMatch) {
    const daysSince = Math.floor((Date.now() - new Date(lastUpdatedMatch[1]).getTime()) / (24 * 60 * 60 * 1000));
    if (daysSince > 30) {
      warn(`Model matrix last updated ${daysSince} days ago`, 'Run: pnpm mcp:models:update');
    } else {
      pass(`Model matrix updated ${daysSince} day(s) ago`);
    }
  }
} else {
  if (!existsSync(modelMatrixMd)) warn('templates/model-matrix.md not found');
  if (!existsSync(modelMatrixTs)) warn('model-matrix.ts not found (core package)');
}

// --- Project State ---
console.log(`\n${DIM}Project State (.aidd/)${RESET}`);

const aiddDir = resolve(root, '.aidd');
if (existsSync(aiddDir)) {
  pass('.aidd/ directory found');

  const configPath = resolve(aiddDir, 'config.json');
  if (existsSync(configPath)) {
    try {
      JSON.parse(readFileSync(configPath, 'utf-8'));
      pass('config.json valid');
    } catch {
      fail('config.json invalid JSON');
    }
  } else {
    warn('config.json not found (using defaults)', 'Create .aidd/config.json for customization');
  }

  const sessionsDir = resolve(aiddDir, 'sessions');
  if (existsSync(sessionsDir)) {
    pass('sessions/ directory exists');
  } else {
    warn('sessions/ missing', 'Run: pnpm mcp:setup');
  }

  const evolutionDir = resolve(aiddDir, 'evolution');
  if (existsSync(evolutionDir)) {
    pass('evolution/ directory exists');
  } else {
    warn('evolution/ missing', 'Run: pnpm mcp:setup');
  }
} else {
  warn('.aidd/ directory not found', 'Run: pnpm mcp:setup');
}

// --- Summary ---
console.log();

if (issues === 0 && warnings === 0) {
  console.log(`${PREFIX} ${GREEN}All checks passed!${RESET}\n`);
  process.exit(0);
} else if (issues === 0) {
  console.log(`${PREFIX} ${YELLOW}${warnings} warning(s) — everything works, some optional setup pending${RESET}\n`);
  process.exit(0);
} else {
  console.log(`${PREFIX} ${RED}${issues} issue(s), ${warnings} warning(s)${RESET}\n`);
  process.exit(1);
}
