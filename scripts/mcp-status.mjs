#!/usr/bin/env node
/**
 * Status — Quick check if MCP packages are built and ready.
 * Usage: node scripts/mcp-status.mjs
 */
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const mcpsDir = resolve(root, 'mcps');
const pkgsDir = resolve(root, 'packages');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const PREFIX = '[aidd.md]';

const packages = [
  { name: '@aidd.md/mcp-shared', baseDir: pkgsDir, dir: 'shared', dist: 'dist/index.js' },
  { name: '@aidd.md/mcp', baseDir: mcpsDir, dir: 'mcp-aidd', dist: 'dist/index.js' },
  { name: '@aidd.md/mcp-core', baseDir: mcpsDir, dir: 'mcp-aidd-core', dist: 'dist/index.js' },
  { name: '@aidd.md/mcp-memory', baseDir: mcpsDir, dir: 'mcp-aidd-memory', dist: 'dist/index.js' },
  { name: '@aidd.md/mcp-tools', baseDir: mcpsDir, dir: 'mcp-aidd-tools', dist: 'dist/index.js' },
];

// Filter to only packages that exist in the workspace
const existing = packages.filter((pkg) =>
  existsSync(resolve(pkg.baseDir, pkg.dir, 'package.json'))
);

if (existing.length === 0) {
  console.log(`\n${PREFIX} ${RED}No packages found${RESET}`);
  console.log(`${DIM}→ Run: pnpm mcp:doctor${RESET}\n`);
  process.exit(1);
}

console.log(`\n${BOLD}${PREFIX} Status${RESET}\n`);

let ready = 0;
for (const pkg of existing) {
  const distPath = resolve(pkg.baseDir, pkg.dir, pkg.dist);
  const isBuilt = existsSync(distPath);

  if (isBuilt) {
    ready++;
    console.log(`  ${GREEN}✅ ${pkg.name.padEnd(22)}${RESET} ready`);
  } else {
    console.log(`  ${RED}❌ ${pkg.name.padEnd(22)}${RESET} not built`);
  }
}

console.log();

if (ready === existing.length) {
  console.log(`${PREFIX} ${GREEN}${ready}/${existing.length} packages ready${RESET}\n`);
  process.exit(0);
} else {
  console.log(`${PREFIX} ${RED}${ready}/${existing.length} packages ready${RESET} → Run: pnpm mcp:build\n`);
  process.exit(1);
}
