#!/usr/bin/env node
/**
 * MCP Check — Single-line infrastructure status for AI agent context.
 * Designed to be run at conversation start (e.g., in CLAUDE.md Startup Protocol).
 * Usage: node scripts/mcp-check.mjs
 */
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

try {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const root = resolve(__dirname, '..');
  const mcpsDir = resolve(root, 'mcps');

  const packages = [
    { dir: 'shared', dist: 'dist/index.js' },
    { dir: 'mcp-aidd', dist: 'dist/index.js' },
    { dir: 'mcp-aidd-core', dist: 'dist/index.js' },
    { dir: 'mcp-aidd-memory', dist: 'dist/index.js' },
    { dir: 'mcp-aidd-tools', dist: 'dist/index.js' },
  ];

  // Count only packages that exist in the workspace
  const existing = packages.filter((pkg) =>
    existsSync(resolve(mcpsDir, pkg.dir, 'package.json'))
  );

  if (existing.length === 0) {
    console.log('[aidd.md] Engine - OFF — no packages found → pnpm mcp:doctor');
    process.exit(1);
  }

  let ready = 0;
  for (const pkg of existing) {
    if (existsSync(resolve(mcpsDir, pkg.dir, pkg.dist))) {
      ready++;
    }
  }

  const total = existing.length;

  if (ready === total) {
    console.log(`[aidd.md] Engine - ON — ${ready}/${total} packages ready`);
    process.exit(0);
  } else if (ready > 0) {
    console.log(`[aidd.md] Engine - PARTIAL — ${ready}/${total} packages ready → pnpm mcp:doctor`);
    process.exit(1);
  } else {
    console.log(`[aidd.md] Engine - OFF — packages not built → pnpm mcp:doctor`);
    process.exit(1);
  }
} catch (error) {
  console.log(`[aidd.md] Engine - ERROR — ${error.message} → pnpm mcp:doctor`);
  process.exit(1);
}
