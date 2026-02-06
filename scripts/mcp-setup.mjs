#!/usr/bin/env node
/**
 * Setup — One-command setup for AIDD MCP ecosystem.
 * Builds MCP packages and verifies configuration.
 * Usage: node scripts/mcp-setup.mjs
 */
import { existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const PREFIX = '[aidd.md]';

async function main() {
  console.log(`\n${BOLD}${PREFIX} Setup${RESET}\n`);

  // Step 1: Check prerequisites
  console.log(`${DIM}[1/4]${RESET} Checking prerequisites...`);
  const nodeVersion = getVersion('node', ['--version']);
  const pnpmVersion = getVersion('pnpm', ['--version']);

  if (!nodeVersion || parseInt(nodeVersion) < 22) {
    console.error(`\n${PREFIX} ${RED}Node.js v22+ required (found: ${nodeVersion ?? 'not installed'})${RESET}`);
    process.exit(1);
  }
  if (!pnpmVersion || parseInt(pnpmVersion) < 10) {
    console.error(`\n${PREFIX} ${RED}pnpm v10+ required (found: ${pnpmVersion ?? 'not installed'})${RESET}`);
    process.exit(1);
  }
  console.log(`${GREEN}✅ Node.js v${nodeVersion}, pnpm ${pnpmVersion}${RESET}\n`);

  // Step 2: Install dependencies
  console.log(`${DIM}[2/4]${RESET} Installing dependencies...\n`);
  try {
    execFileSync('pnpm', ['install', '--filter', './mcps/**', '--filter', './packages/**'], {
      cwd: root,
      stdio: 'inherit',
      shell: true,
    });
    console.log(`\n${GREEN}✅ Dependencies installed${RESET}\n`);
  } catch {
    console.error(`\n${PREFIX} ${RED}Failed to install dependencies. Check errors above.${RESET}\n`);
    process.exit(1);
  }

  // Step 3: Build MCP packages
  console.log(`${DIM}[3/4]${RESET} Building MCP packages...\n`);
  try {
    execFileSync('pnpm', ['mcp:build'], {
      cwd: root,
      stdio: 'inherit',
      shell: true,
    });
    console.log(`\n${GREEN}✅ MCP packages built${RESET}\n`);
  } catch {
    console.error(`\n${PREFIX} ${RED}Failed to build MCP packages. Check errors above.${RESET}\n`);
    process.exit(1);
  }

  // Step 4: Initialize .aidd/ directory
  console.log(`${DIM}[4/4]${RESET} Initializing project state...`);
  const aiddDir = resolve(root, '.aidd');
  const dirs = [
    'sessions/active',
    'sessions/completed',
    'branches',
    'branches/archive',
    'drafts/rules',
    'drafts/knowledge',
    'drafts/skills',
    'drafts/workflows',
    'analytics',
    'evolution/snapshots',
    'cache',
  ];

  for (const dir of dirs) {
    mkdirSync(resolve(aiddDir, dir), { recursive: true });
  }

  // Create .gitignore if it doesn't exist
  const gitignorePath = resolve(aiddDir, '.gitignore');
  if (!existsSync(gitignorePath)) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(gitignorePath, [
      '# Private (per-developer)',
      'sessions/active/',
      'cache/',
      '',
      '# Shared (committed)',
      '# analytics/',
      '# drafts/',
      '# evolution/log.json',
      '# config.json',
      '',
    ].join('\n'));
  }

  console.log(`${GREEN}✅ .aidd/ directory initialized${RESET}\n`);

  // Final verification
  console.log(`${BOLD}${PREFIX} Final Verification${RESET}\n`);
  try {
    execFileSync('node', [resolve(__dirname, 'mcp-doctor.mjs')], {
      cwd: root,
      stdio: 'inherit',
    });
  } catch {
    // doctor exits with code 1 on issues — already printed
  }
}

function getVersion(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf-8', shell: true }).trim().replace(/^v/, '');
  } catch {
    return null;
  }
}

main().catch((err) => {
  console.error(`${PREFIX} ${RED}${err.message}${RESET}`);
  process.exit(1);
});
