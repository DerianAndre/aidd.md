#!/usr/bin/env node
/**
 * Setup — One-command setup for AIDD MCP ecosystem.
 * Builds MCP packages, initializes project state, detects and configures IDEs.
 * Usage: node scripts/mcp-setup.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const STEPS = 7;
const PREFIX = '[aidd.md]';

async function main() {
  console.log(`\n${BOLD}${PREFIX} Setup${RESET}\n`);

  // ── Step 1: Check prerequisites ──────────────────────────────────────────
  console.log(`${DIM}[1/${STEPS}]${RESET} Checking prerequisites...`);
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

  // ── Step 2: Install dependencies ─────────────────────────────────────────
  console.log(`${DIM}[2/${STEPS}]${RESET} Installing dependencies...\n`);
  try {
    execFileSync('pnpm', ['install'], {
      cwd: root,
      stdio: 'inherit',
      shell: true,
    });
    console.log(`\n${GREEN}✅ Dependencies installed${RESET}\n`);
  } catch {
    console.error(`\n${PREFIX} ${RED}Failed to install dependencies. Check errors above.${RESET}\n`);
    process.exit(1);
  }

  // ── Step 3: Build MCP packages ───────────────────────────────────────────
  console.log(`${DIM}[3/${STEPS}]${RESET} Building MCP packages...\n`);
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

  // ── Step 4: Initialize .aidd/ directory ──────────────────────────────────
  console.log(`${DIM}[4/${STEPS}]${RESET} Initializing project state...`);
  const aiddDir = resolve(root, '.aidd');
  const dirs = [
    'content/agents',
    'content/rules',
    'content/skills',
    'content/workflows',
    'content/specs',
    'content/knowledge',
    'content/templates',
    'memory',
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
    writeFileSync(gitignorePath, [
      '# Private (per-developer)',
      'sessions/active/',
      'cache/',
      'data.db',
      'data.db-wal',
      'data.db-shm',
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

  // ── Step 5: Detect & configure IDEs ──────────────────────────────────────
  await detectAndConfigureIDEs(root);

  // ── Step 6: Run diagnostics ──────────────────────────────────────────────
  console.log(`${DIM}[6/${STEPS}]${RESET} Running diagnostics...\n`);
  try {
    execFileSync('node', [resolve(__dirname, 'mcp-doctor.mjs')], {
      cwd: root,
      stdio: 'inherit',
    });
  } catch {
    // doctor exits with code 1 on warnings — already printed
  }

  // ── Step 7: Summary ──────────────────────────────────────────────────────
  console.log(`\n${BOLD}${PREFIX} Setup Complete${RESET}\n`);
  console.log(`  Next steps:`);
  console.log(`    1. Open your IDE and start coding — MCPs auto-start`);
  console.log(`    2. ${BOLD}pnpm mcp:check${RESET}  — quick status check`);
  console.log(`    3. ${BOLD}pnpm mcp:doctor${RESET} — full diagnostics\n`);
}

// ── IDE Detection & Configuration ──────────────────────────────────────────

async function detectAndConfigureIDEs(projectRoot) {
  console.log(`${DIM}[5/${STEPS}]${RESET} Detecting IDE integrations...\n`);

  const detected = [];

  // 1. Claude Code — check if ~/.claude/ or ~/.claude.json exists
  const claudeDir = join(homedir(), '.claude');
  const claudeJson = join(homedir(), '.claude.json');
  if (existsSync(claudeDir) || existsSync(claudeJson)) {
    detected.push({
      name: 'Claude Code',
      key: 'claude',
      path: claudeJson,
    });
  }

  // 2. Cursor — always available (project-local config)
  detected.push({
    name: 'Cursor',
    key: 'cursor',
    path: join(projectRoot, '.cursor', 'mcp.json'),
  });

  // 3. VS Code — check if .vscode/ exists or `code` CLI available
  const vscodeDir = join(projectRoot, '.vscode');
  if (existsSync(vscodeDir) || commandExists('code')) {
    detected.push({
      name: 'VS Code',
      key: 'vscode',
      path: join(vscodeDir, 'mcp.json'),
    });
  }

  // 4. Gemini — AGENTS.md always present in this repo
  if (existsSync(join(projectRoot, 'AGENTS.md'))) {
    detected.push({
      name: 'Gemini',
      key: 'gemini',
      path: 'AGENTS.md (auto-detected)',
    });
  }

  // 5. Windsurf / Antigravity — check if ~/.codeium/windsurf/ exists
  const windsurfDir = join(homedir(), '.codeium', 'windsurf');
  if (existsSync(windsurfDir)) {
    detected.push({
      name: 'Windsurf',
      key: 'windsurf',
      path: join(windsurfDir, 'mcp_config.json'),
    });
  }

  if (detected.length === 0) {
    console.log(`  No IDEs detected. Run ${BOLD}aidd integrate <tool>${RESET} later.\n`);
    return;
  }

  // Show detected IDEs
  console.log('  Detected:');
  for (const ide of detected) {
    console.log(`    ${GREEN}●${RESET} ${ide.name} → ${DIM}${ide.path}${RESET}`);
  }

  // Ask confirmation
  const answer = await askUser(`\n  Configure these IDEs? [Y/n] `);
  if (answer.toLowerCase() === 'n') {
    console.log(`\n  ${YELLOW}Skipped.${RESET} Run ${BOLD}aidd integrate <tool>${RESET} later.\n`);
    return;
  }

  // Determine contributor vs adopter mode
  const engineDist = join(projectRoot, 'mcps', 'mcp-aidd-engine', 'dist', 'index.js');
  const isContributor = existsSync(engineDist);

  if (isContributor) {
    console.log(`\n  ${DIM}Mode: contributor (local build path)${RESET}`);
  } else {
    console.log(`\n  ${DIM}Mode: adopter (npx)${RESET}`);
  }

  // Write configs
  const results = [];
  for (const ide of detected) {
    if (ide.key === 'gemini') {
      results.push({ name: ide.name, status: 'auto-detected' });
      continue;
    }

    try {
      writeMcpConfig(ide.path, projectRoot, isContributor, ide.key);
      results.push({ name: ide.name, status: 'configured' });
    } catch (err) {
      results.push({ name: ide.name, status: `failed: ${err.message}` });
    }
  }

  console.log('');
  for (const r of results) {
    const ok = r.status === 'configured' || r.status === 'auto-detected';
    const icon = ok ? `${GREEN}✅${RESET}` : `${RED}❌${RESET}`;
    console.log(`  ${icon} ${r.name} — ${r.status}`);
  }
  console.log('');
}

// ── MCP Config Writer ──────────────────────────────────────────────────────

function writeMcpConfig(configPath, projectRoot, isContributor, toolKey) {
  const isWindows = process.platform === 'win32';
  const mcpEntry = isContributor
    ? {
        // Contributor: point to local build (fast cold-start, works offline)
        command: 'node',
        args: [resolve(projectRoot, 'mcps', 'mcp-aidd-engine', 'dist', 'index.js')],
        env: { AIDD_PROJECT_PATH: projectRoot },
      }
    : isWindows
      ? {
          // Adopter (Windows): npx requires cmd /c wrapper
          command: 'cmd',
          args: ['/c', 'npx', '-y', '@aidd.md/mcp-engine'],
          env: { AIDD_PROJECT_PATH: projectRoot },
        }
      : {
          // Adopter (Unix): npx runs directly
          command: 'npx',
          args: ['-y', '@aidd.md/mcp-engine'],
          env: { AIDD_PROJECT_PATH: projectRoot },
        };

  // VS Code uses { "servers": { ... } } with required "type" field
  const isVscode = toolKey === 'vscode';
  const serversKey = isVscode ? 'servers' : 'mcpServers';
  const entry = isVscode ? { type: 'stdio', ...mcpEntry } : mcpEntry;

  // Read existing config or start fresh
  let config = {};
  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch {
      // Malformed JSON — start fresh but warn
      console.log(`    ${YELLOW}⚠ Could not parse ${configPath}, creating new config${RESET}`);
    }
  } else {
    mkdirSync(dirname(configPath), { recursive: true });
  }

  // Merge: only touch our entry, preserve everything else
  if (!config[serversKey]) config[serversKey] = {};
  config[serversKey]['aidd-engine'] = entry;

  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getVersion(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf-8', shell: true }).trim().replace(/^v/, '');
  } catch {
    return null;
  }
}

function commandExists(cmd) {
  try {
    execFileSync(process.platform === 'win32' ? 'where' : 'which', [cmd], {
      stdio: 'ignore',
      shell: true,
    });
    return true;
  } catch {
    return false;
  }
}

function askUser(prompt) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

main().catch((err) => {
  console.error(`${PREFIX} ${RED}${err.message}${RESET}`);
  process.exit(1);
});
