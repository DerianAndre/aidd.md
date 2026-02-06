#!/usr/bin/env node
/**
 * MCP Doctor — Full diagnostic of the AIDD MCP environment.
 *
 * Usage: node scripts/mcp-doctor.mjs [flags]
 *
 * Flags:
 *   --json         Output results as JSON (no colors, no interactive)
 *   --quiet        Only show failures and warnings (suppress passes/info)
 *   --fix          Auto-fix common issues (rebuild packages, create .aidd/)
 *   --deep         Run slow checks (typecheck)
 *   --no-runtime   Skip process detection (faster)
 *   --no-color     Disable ANSI colors
 *   --help, -h     Show this help
 */
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, appendFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { homedir } from 'node:os';
import { performance } from 'node:perf_hooks';

// =========================================================================
// CLI Flags
// =========================================================================
const argv = process.argv.slice(2);
const flags = {
  json: argv.includes('--json'),
  quiet: argv.includes('--quiet'),
  fix: argv.includes('--fix'),
  deep: argv.includes('--deep'),
  noRuntime: argv.includes('--no-runtime'),
  noColor: argv.includes('--no-color') || !!process.env.NO_COLOR,
  help: argv.includes('--help') || argv.includes('-h'),
};

if (flags.help) {
  console.log(`
  MCP Doctor — Full diagnostic of the AIDD MCP environment.

  Usage: node scripts/mcp-doctor.mjs [flags]

  Flags:
    --json         Output results as JSON (no colors, no interactive)
    --quiet        Only show failures and warnings (suppress passes/info)
    --fix          Auto-fix common issues (rebuild packages, create .aidd/)
    --deep         Run slow checks (typecheck)
    --no-runtime   Skip process detection (faster)
    --no-color     Disable ANSI colors
    --help, -h     Show this help
  `);
  process.exit(0);
}

// =========================================================================
// Constants
// =========================================================================
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const home = homedir();

const useColor = !flags.noColor && !flags.json && process.stdout.isTTY !== false;
const GREEN = useColor ? '\x1b[32m' : '';
const RED = useColor ? '\x1b[31m' : '';
const YELLOW = useColor ? '\x1b[33m' : '';
const DIM = useColor ? '\x1b[2m' : '';
const BOLD = useColor ? '\x1b[1m' : '';
const RESET = useColor ? '\x1b[0m' : '';

const PREFIX = '[aidd.md]';

// =========================================================================
// Results Collector (for JSON mode + timing)
// =========================================================================
const totalStart = performance.now();

/** @type {{ name: string, description: string, checks: Array<{ type: string, msg: string, hint?: string }>, durationMs: number }[]} */
const sections = [];
let currentSection = null;

let issues = 0;
let warnings = 0;

function beginSection(name, description) {
  currentSection = { name, description, checks: [], startMs: performance.now() };
  sections.push(currentSection);
  if (!flags.json) {
    const prefix = sections.length === 1 ? '' : '\n';
    console.log(`${prefix}${DIM}${name}${RESET} ${DIM}— ${description}${RESET}`);
  }
}

function endSection() {
  if (currentSection) {
    currentSection.durationMs = Math.round(performance.now() - currentSection.startMs);
    delete currentSection.startMs;
  }
}

function pass(msg) {
  currentSection?.checks.push({ type: 'pass', msg });
  if (!flags.json && !flags.quiet) {
    console.log(`  ${GREEN}✅ ${msg}${RESET}`);
  }
}

function fail(msg, hint) {
  issues++;
  currentSection?.checks.push({ type: 'fail', msg, ...(hint && { hint }) });
  if (!flags.json) {
    console.log(`  ${RED}❌ ${msg}${RESET}`);
    if (hint) console.log(`      ${DIM}→ ${hint}${RESET}`);
  }
}

function warn(msg, hint) {
  warnings++;
  currentSection?.checks.push({ type: 'warn', msg, ...(hint && { hint }) });
  if (!flags.json) {
    console.log(`  ${YELLOW}⚠️  ${msg}${RESET}`);
    if (hint) console.log(`      ${DIM}→ ${hint}${RESET}`);
  }
}

function info(msg) {
  currentSection?.checks.push({ type: 'info', msg });
  if (!flags.json && !flags.quiet) {
    console.log(`  ${DIM}ℹ  ${msg}${RESET}`);
  }
}

function detail(msg) {
  if (!flags.json && !flags.quiet) {
    console.log(`      ${DIM}→ ${msg}${RESET}`);
  }
}

// =========================================================================
// Utility Functions
// =========================================================================
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

function countFilesRecursive(dir, ext) {
  let count = 0;
  try {
    for (const entry of readdirSync(dir)) {
      const full = resolve(dir, entry);
      if (statSync(full).isDirectory()) {
        count += countFilesRecursive(full, ext);
      } else if (entry.endsWith(ext)) {
        count++;
      }
    }
  } catch { /* skip unreadable dirs */ }
  return count;
}

function dirSizeBytes(dir) {
  let total = 0;
  try {
    for (const entry of readdirSync(dir)) {
      const full = resolve(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        total += dirSizeBytes(full);
      } else {
        total += st.size;
      }
    }
  } catch { /* skip unreadable */ }
  return total;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const fm = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      if (key && !key.startsWith('#') && !key.startsWith('-')) {
        fm[key] = val;
      }
    }
  }
  return fm;
}

/**
 * Get the newest mtime of any .ts file under srcDir (recursive).
 * Returns 0 if srcDir does not exist.
 */
function newestSourceMtime(srcDir) {
  let newest = 0;
  try {
    for (const entry of readdirSync(srcDir)) {
      const full = resolve(srcDir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        newest = Math.max(newest, newestSourceMtime(full));
      } else if (entry.endsWith('.ts')) {
        newest = Math.max(newest, st.mtimeMs);
      }
    }
  } catch { /* skip */ }
  return newest;
}

/**
 * Get command lines of all running processes (for MCP server detection).
 */
function getRunningProcessCommandLines() {
  try {
    if (process.platform === 'win32') {
      const ps = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
      const out = execFileSync(ps, ['-NoProfile', '-Command',
        'Get-CimInstance Win32_Process | Select-Object -ExpandProperty CommandLine',
      ], { encoding: 'utf-8', timeout: 8000, stdio: ['pipe', 'pipe', 'pipe'] });
      return out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    } else {
      const out = execFileSync('ps', ['-eo', 'args'], {
        encoding: 'utf-8', timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return out.split('\n').map((l) => l.trim()).filter(Boolean);
    }
  } catch {
    return null;
  }
}

function resolveServerEntryPoint(config) {
  const cmd = config.command ?? '';
  const args = config.args ?? [];
  const serverCwd = (config.cwd ?? '').replace(/\$\{workspaceFolder\}/g, root) || root;

  if (/\bnode(\.exe)?$/.test(cmd)) {
    const script = args.find((a) => /\.(m?js|cjs|ts)$/.test(a));
    if (script) {
      if (script.includes('${') && !script.includes('${workspaceFolder}')) return null;
      return resolve(serverCwd, script.replace(/\$\{workspaceFolder\}/g, root));
    }
  }
  if (cmd.includes('${')) return null;
  return null;
}

function getMcpServerStatus(config, processLines) {
  if (config.disabled === true) return { status: 'disabled' };
  if (config.url) return { status: 'running' };

  const cmd = config.command ?? '';
  const args = config.args ?? [];
  const entryPoint = resolveServerEntryPoint(config);

  if (entryPoint) {
    if (!existsSync(entryPoint)) {
      return { status: 'error', detail: 'entry point not found' };
    }
    if (processLines) {
      const normalized = entryPoint.replace(/\\/g, '/').toLowerCase();
      const isRunning = processLines.some((line) =>
        line.replace(/\\/g, '/').toLowerCase().includes(normalized)
      );
      return { status: isRunning ? 'running' : 'not running' };
    }
    return { status: 'unknown' };
  }

  if (cmd === 'npx') {
    const pkg = args.find((a) => !a.startsWith('-'));
    if (pkg && processLines) {
      const isRunning = processLines.some((line) => line.includes(pkg));
      return { status: isRunning ? 'running' : 'not running' };
    }
    return processLines ? { status: 'not running' } : { status: 'unknown' };
  }

  if (cmd.includes('CLAUDE_PLUGIN_ROOT')) {
    if (processLines) {
      const isRunning = processLines.some((line) =>
        args.some((a) => !a.includes('$') && line.includes(a))
      );
      return { status: isRunning ? 'running' : 'not running' };
    }
    return { status: 'unknown' };
  }

  if (processLines && args.length > 0) {
    const isRunning = processLines.some((line) => {
      const lower = line.toLowerCase();
      return args.some((a) => lower.includes(a.toLowerCase()));
    });
    return { status: isRunning ? 'running' : 'not running' };
  }

  return { status: 'unknown' };
}

function collectServers(filePath, label, discoveredServers) {
  if (!existsSync(filePath)) return;
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    const servers = data.mcpServers ?? {};
    for (const [name, config] of Object.entries(servers)) {
      if (!discoveredServers.has(name)) {
        discoveredServers.set(name, { config, label });
      }
    }
  } catch { /* skip unreadable */ }
}

function isRealAgentDir(dirPath) {
  if (!existsSync(dirPath)) return false;
  try {
    const st = statSync(dirPath);
    if (!st.isDirectory()) return true;
    const entries = readdirSync(dirPath);
    if (entries.length === 1 && entries[0] === 'skills') return false;
    if (entries.length === 0) return false;
    return true;
  } catch {
    return false;
  }
}

// =========================================================================
// Section Table of Contents
// =========================================================================
const sectionCatalog = [
  { name: 'Environment', desc: 'Node.js, pnpm' },
  { name: 'Dependencies', desc: 'Lockfile and node_modules' },
  { name: 'aidd.md MCPs', desc: 'Package build status' },
  { name: 'MCPs installed', desc: 'External MCP servers' },
  { name: 'aidd.md Framework', desc: 'Content and structure' },
  { name: 'Skills Validation', desc: 'Frontmatter integrity' },
  { name: 'Cross-References', desc: 'AGENTS.md ↔ skills/' },
  { name: 'Model Matrix', desc: 'SSOT sync and freshness' },
  { name: 'Project State (.aidd/)', desc: 'Config, sessions, storage' },
  { name: 'Installed Agents', desc: 'Detected AI editors/CLIs' },
  ...(flags.deep ? [{ name: 'TypeScript', desc: 'Type checking (deep)' }] : []),
];

if (!flags.json) {
  console.log(`\n${BOLD}${PREFIX} Doctor${RESET}`);
  if (!flags.quiet) {
    console.log(`${DIM}  ${sectionCatalog.map((s) => s.name).join(' → ')}${RESET}`);
  }
  console.log();
}

// =========================================================================
// 1. Environment
// =========================================================================
beginSection('Environment', 'Node.js, pnpm');

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

endSection();

// =========================================================================
// 2. Dependencies
// =========================================================================
beginSection('Dependencies', 'Lockfile and node_modules');

const nodeModulesDir = resolve(root, 'node_modules');
if (existsSync(nodeModulesDir)) {
  pass('node_modules/ exists');
} else {
  fail('node_modules/ missing', 'Run: pnpm install');
  if (flags.fix) {
    info('Running pnpm install...');
    try {
      execFileSync('pnpm', ['install'], { cwd: root, encoding: 'utf-8', shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
      pass('pnpm install succeeded');
    } catch {
      fail('pnpm install failed');
    }
  }
}

const lockfilePath = resolve(root, 'pnpm-lock.yaml');
if (existsSync(lockfilePath)) {
  const lockMtime = statSync(lockfilePath).mtimeMs;
  const pkgJsonMtime = statSync(resolve(root, 'package.json')).mtimeMs;
  if (lockMtime >= pkgJsonMtime) {
    pass('pnpm-lock.yaml up to date');
  } else {
    warn('pnpm-lock.yaml older than package.json', 'Run: pnpm install');
  }
} else {
  warn('pnpm-lock.yaml not found', 'Run: pnpm install');
}

endSection();

// =========================================================================
// 3. aidd.md MCPs
// =========================================================================
beginSection('aidd.md MCPs', 'Package build status');

const mcpsDir = resolve(root, 'mcps');
const pkgsDir = resolve(root, 'packages');
const packages = [
  { name: '@aidd.md/mcp-shared', baseDir: pkgsDir, dir: 'shared', dist: 'dist/index.js', src: 'src' },
  { name: '@aidd.md/mcp', baseDir: mcpsDir, dir: 'mcp-aidd', dist: 'dist/index.js', src: 'src' },
  { name: '@aidd.md/mcp-core', baseDir: mcpsDir, dir: 'mcp-aidd-core', dist: 'dist/index.js', src: 'src' },
  { name: '@aidd.md/mcp-memory', baseDir: mcpsDir, dir: 'mcp-aidd-memory', dist: 'dist/index.js', src: 'src' },
  { name: '@aidd.md/mcp-tools', baseDir: mcpsDir, dir: 'mcp-aidd-tools', dist: 'dist/index.js', src: 'src' },
];

let built = 0;
let pkgExists = 0;
let stalePackages = [];
let unbuiltPackages = [];

for (const pkg of packages) {
  const pkgDir = resolve(pkg.baseDir, pkg.dir);
  const distPath = resolve(pkgDir, pkg.dist);

  if (!existsSync(resolve(pkgDir, 'package.json'))) {
    continue;
  }

  pkgExists++;

  if (existsSync(distPath)) {
    built++;
    // Stale build detection: compare source mtime vs dist mtime
    const srcDir = resolve(pkgDir, pkg.src);
    const srcMtime = newestSourceMtime(srcDir);
    const distMtime = statSync(distPath).mtimeMs;
    if (srcMtime > distMtime) {
      warn(`${pkg.name} built but stale (source newer than dist)`);
      stalePackages.push(pkg.name);
    } else {
      pass(`${pkg.name} built`);
    }
  } else {
    fail(`${pkg.name} not built`);
    unbuiltPackages.push(pkg.name);
  }
}

if (pkgExists === 0) {
  warn('No MCP packages found yet', 'Run: pnpm mcp:setup');
} else if (built === pkgExists && stalePackages.length === 0) {
  pass(`${built}/${pkgExists} packages built`);
}

// --fix: rebuild stale or unbuilt packages
if (flags.fix && (stalePackages.length > 0 || unbuiltPackages.length > 0)) {
  info('Rebuilding MCP packages...');
  try {
    execFileSync('pnpm', ['mcp:build'], { cwd: root, encoding: 'utf-8', shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
    pass('pnpm mcp:build succeeded');
  } catch {
    fail('pnpm mcp:build failed');
  }
}

// Check key dependency
const sdkLocations = [
  resolve(root, 'node_modules/@modelcontextprotocol/sdk/package.json'),
  resolve(pkgsDir, 'shared/node_modules/@modelcontextprotocol/sdk/package.json'),
  resolve(mcpsDir, 'mcp-aidd/node_modules/@modelcontextprotocol/sdk/package.json'),
];
const sdkPath = sdkLocations.find((p) => existsSync(p));
if (sdkPath) {
  try {
    const sdkPkg = JSON.parse(readFileSync(sdkPath, 'utf-8'));
    pass(`@modelcontextprotocol/sdk ${sdkPkg.version}`);
  } catch {
    pass('@modelcontextprotocol/sdk installed');
  }
} else {
  fail('@modelcontextprotocol/sdk not installed', 'Run: pnpm install');
}

endSection();

// =========================================================================
// 4. MCPs installed
// =========================================================================
beginSection('MCPs installed', 'External MCP servers');

/** @type {Map<string, { config: any, label: string }>} */
const discoveredServers = new Map();

// 1. Standalone MCP configs (Claude Code, Cursor, VS Code)
const mcpConfigLocations = [
  { path: resolve(root, '.claude', 'mcp.json'), label: 'project' },
  { path: resolve(root, '.mcp.json'), label: 'project' },
  { path: resolve(home, '.claude', 'mcp.json'), label: 'claude' },
  { path: resolve(home, '.mcp.json'), label: 'claude' },
  { path: resolve(root, '.cursor', 'mcp.json'), label: 'cursor' },
  { path: resolve(home, '.cursor', 'mcp.json'), label: 'cursor' },
  { path: resolve(root, '.vscode', 'mcp.json'), label: 'vscode' },
];

for (const loc of mcpConfigLocations) {
  collectServers(loc.path, loc.label, discoveredServers);
}

// 2. Enabled Claude Code plugins that expose MCP servers
const userSettingsPath = resolve(home, '.claude', 'settings.json');
let enabledPlugins = {};
try {
  enabledPlugins = JSON.parse(readFileSync(userSettingsPath, 'utf-8')).enabledPlugins ?? {};
} catch { /* no settings */ }

const pluginCacheDir = resolve(home, '.claude', 'plugins', 'cache');
if (existsSync(pluginCacheDir)) {
  try {
    for (const marketplace of readdirSync(pluginCacheDir)) {
      const mktDir = resolve(pluginCacheDir, marketplace);
      if (!statSync(mktDir).isDirectory()) continue;

      for (const plugin of readdirSync(mktDir)) {
        const pluginKey = `${plugin}@${marketplace}`;
        if (enabledPlugins[pluginKey] !== true) continue;

        const pluginDir = resolve(mktDir, plugin);
        if (!statSync(pluginDir).isDirectory()) continue;

        const versions = readdirSync(pluginDir).filter((v) => {
          const vDir = resolve(pluginDir, v);
          return statSync(vDir).isDirectory();
        });
        if (versions.length === 0) continue;
        const latestDir = resolve(pluginDir, versions[versions.length - 1]);

        collectServers(resolve(latestDir, '.mcp.json'), 'plugin', discoveredServers);

        const pluginJson = resolve(latestDir, '.claude-plugin', 'plugin.json');
        if (existsSync(pluginJson)) {
          collectServers(pluginJson, 'plugin', discoveredServers);
        }
      }
    }
  } catch { /* skip unreadable plugin dirs */ }
}

// 3. External plugins — only if enabled via enabledMcpjsonServers
let enabledMcpjsonServers = [];
try {
  const localSettingsPath = resolve(home, '.claude', 'settings.local.json');
  const local = JSON.parse(readFileSync(localSettingsPath, 'utf-8'));
  enabledMcpjsonServers = local.enabledMcpjsonServers ?? [];
} catch { /* no local settings */ }

const pluginMktsDir = resolve(home, '.claude', 'plugins', 'marketplaces');
if (existsSync(pluginMktsDir)) {
  try {
    for (const marketplace of readdirSync(pluginMktsDir)) {
      const mktDir = resolve(pluginMktsDir, marketplace);
      if (!statSync(mktDir).isDirectory()) continue;

      const extDir = resolve(mktDir, 'external_plugins');
      if (existsSync(extDir) && statSync(extDir).isDirectory()) {
        for (const plugin of readdirSync(extDir)) {
          if (!enabledMcpjsonServers.includes(plugin)) continue;
          const mcpFile = resolve(extDir, plugin, '.mcp.json');
          collectServers(mcpFile, 'plugin', discoveredServers);
        }
      }
    }
  } catch { /* skip */ }
}

// Filter disabled
for (const [name, { config }] of discoveredServers) {
  if (config.disabled === true) {
    discoveredServers.delete(name);
  }
}

if (discoveredServers.size === 0) {
  info('No MCP servers configured');
} else {
  // Only scan processes if --no-runtime is not set
  const processLines = flags.noRuntime ? null : getRunningProcessCommandLines();

  for (const [name, { config, label }] of discoveredServers) {
    const { status, detail: statusDetail } = getMcpServerStatus(config, processLines);
    const suffix = statusDetail ? ` (${statusDetail})` : '';
    const source = `${DIM}[${label}]${RESET}`;

    switch (status) {
      case 'running':
        pass(`${name} ${source} — running`);
        break;
      case 'not running':
        info(`${name} ${source} — not running`);
        break;
      case 'error':
        fail(`${name} ${source} — error${suffix}`);
        break;
      default:
        info(`${name} ${source} — ${flags.noRuntime ? 'skipped' : 'unknown'}`);
        break;
    }
  }
}

endSection();

// =========================================================================
// 5. aidd.md Framework
// =========================================================================
beginSection('aidd.md Framework', 'Content and structure');

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
let skillDirs = [];
if (existsSync(skillsDir)) {
  try {
    skillDirs = readdirSync(skillsDir).filter((f) =>
      existsSync(resolve(skillsDir, f, 'SKILL.md'))
    );
    pass(`skills/ (${skillDirs.length} agents)`);
  } catch {
    warn('skills/ exists but could not read');
  }
} else {
  fail('skills/ missing');
}

const knowledgeDir = resolve(root, 'knowledge');
if (existsSync(knowledgeDir)) {
  try {
    const domains = readdirSync(knowledgeDir).filter((f) =>
      statSync(resolve(knowledgeDir, f)).isDirectory()
    );
    const totalEntries = countFilesRecursive(knowledgeDir, '.md');
    pass(`knowledge/ (${domains.length} domains, ${totalEntries} entries)`);
  } catch {
    warn('knowledge/ exists but could not count entries');
  }
} else {
  warn('knowledge/ missing');
}

const workflowsDir = resolve(root, 'workflows');
if (existsSync(workflowsDir)) {
  const mdCount = countFiles(workflowsDir, '.md');
  const orchDir = resolve(workflowsDir, 'orchestrators');
  const orchCount = existsSync(orchDir) ? countFiles(orchDir, '.md') : 0;
  pass(`workflows/ (${mdCount} files + ${orchCount} orchestrators)`);
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

const templatesDir = resolve(root, 'templates');
if (existsSync(templatesDir)) {
  const count = countFilesRecursive(templatesDir, '.md');
  pass(`templates/ (${count} files)`);
} else {
  warn('templates/ missing');
}

const claudeMdPath = resolve(root, 'CLAUDE.md');
if (existsSync(claudeMdPath)) {
  pass('CLAUDE.md found');
} else {
  warn('CLAUDE.md missing (project instructions for Claude Code)');
}

endSection();

// =========================================================================
// 6. Skills Validation
// =========================================================================
beginSection('Skills Validation', 'Frontmatter integrity');

if (skillDirs.length > 0) {
  let validSkills = 0;
  const skillIssues = [];

  for (const dir of skillDirs) {
    const skillPath = resolve(skillsDir, dir, 'SKILL.md');
    try {
      const content = readFileSync(skillPath, 'utf-8');
      const fm = parseFrontmatter(content);
      const errs = [];

      if (!fm) {
        errs.push('no frontmatter');
      } else {
        if (!fm.name) errs.push('missing name');
        if (!fm.description) errs.push('missing description');
        const tier = parseInt(fm.tier, 10);
        if (!fm.tier || isNaN(tier) || tier < 1 || tier > 3) {
          errs.push(`invalid tier: ${fm.tier ?? 'missing'}`);
        }
      }

      if (errs.length === 0) {
        validSkills++;
      } else {
        skillIssues.push({ dir, errs });
      }
    } catch {
      skillIssues.push({ dir, errs: ['could not read'] });
    }
  }

  if (skillIssues.length === 0) {
    pass(`${validSkills}/${skillDirs.length} skills have valid frontmatter`);
  } else {
    warn(`${skillIssues.length} skill(s) with issues:`);
    for (const { dir, errs } of skillIssues) {
      detail(`${dir}: ${errs.join(', ')}`);
    }
  }
} else {
  info('No skills to validate');
}

endSection();

// =========================================================================
// 7. Cross-Reference Integrity
// =========================================================================
beginSection('Cross-References', 'AGENTS.md ↔ skills/');

if (existsSync(agentsPath) && skillDirs.length > 0) {
  try {
    const agentsContent = readFileSync(agentsPath, 'utf-8');
    const refs = [...agentsContent.matchAll(/skills\/([a-z0-9-]+)\/?/g)].map((m) => m[1]);
    const uniqueRefs = [...new Set(refs)];
    const missing = uniqueRefs.filter((ref) => !skillDirs.includes(ref));

    if (missing.length === 0) {
      pass(`AGENTS.md → skills/ (${uniqueRefs.length} refs, all valid)`);
    } else {
      warn(`AGENTS.md references ${missing.length} missing skill(s):`);
      for (const m of missing) {
        detail(`skills/${m}/ not found`);
      }
    }
  } catch {
    warn('Could not check cross-references');
  }
} else {
  info('Skipping cross-reference check (missing AGENTS.md or skills/)');
}

endSection();

// =========================================================================
// 8. Model Matrix
// =========================================================================
beginSection('Model Matrix', 'SSOT sync and freshness');

const modelMatrixMd = resolve(root, 'templates/model-matrix.md');
const modelMatrixTs = resolve(root, 'mcps/mcp-aidd-core/src/modules/routing/model-matrix.ts');

if (existsSync(modelMatrixMd) && existsSync(modelMatrixTs)) {
  const mdContent = readFileSync(modelMatrixMd, 'utf-8');
  const tsContent = readFileSync(modelMatrixTs, 'utf-8');

  const registryStart = mdContent.indexOf('## 2. Provider Registry');
  const registryEnd = mdContent.indexOf('## 3.', registryStart > -1 ? registryStart : 0);
  const registrySection = registryStart > -1
    ? mdContent.slice(registryStart, registryEnd > -1 ? registryEnd : undefined)
    : '';
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

endSection();

// =========================================================================
// 9. Project State (.aidd/)
// =========================================================================
beginSection('Project State (.aidd/)', 'Config, sessions, storage');

let needsAiddSetup = false;
const aiddDir = resolve(root, '.aidd');
if (existsSync(aiddDir)) {
  pass('.aidd/ directory found');

  const configPath = resolve(aiddDir, 'config.json');
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      const expectedKeys = ['evolution', 'memory', 'modelTracking', 'ci', 'content'];
      const configKeys = Object.keys(config);
      const missing = expectedKeys.filter((k) => !configKeys.includes(k));
      const unknown = configKeys.filter((k) => !expectedKeys.includes(k));

      if (missing.length === 0 && unknown.length === 0) {
        pass('config.json valid (all sections present)');
      } else {
        if (missing.length > 0) warn(`config.json missing sections: ${missing.join(', ')}`);
        if (unknown.length > 0) info(`config.json has extra sections: ${unknown.join(', ')}`);
      }

      if (config.evolution) {
        const evo = config.evolution;
        if (typeof evo.autoApplyThreshold === 'number' && (evo.autoApplyThreshold < 0 || evo.autoApplyThreshold > 100)) {
          warn('config.json: evolution.autoApplyThreshold should be 0-100');
        }
        if (typeof evo.draftThreshold === 'number' && (evo.draftThreshold < 0 || evo.draftThreshold > 100)) {
          warn('config.json: evolution.draftThreshold should be 0-100');
        }
      }

      if (config.content?.overrideMode && !['merge', 'project_only', 'bundled_only'].includes(config.content.overrideMode)) {
        warn(`config.json: content.overrideMode "${config.content.overrideMode}" invalid (merge|project_only|bundled_only)`);
      }
    } catch {
      fail('config.json invalid JSON');
    }
  } else {
    warn('config.json not found (using defaults)', 'Run: pnpm mcp:doctor --fix to create');
  }

  const requiredDirs = ['sessions', 'evolution', 'branches', 'drafts'];
  for (const sub of requiredDirs) {
    const subDir = resolve(aiddDir, sub);
    if (existsSync(subDir)) {
      pass(`${sub}/ exists`);
    } else {
      warn(`${sub}/ missing`, 'Run: pnpm mcp:setup');
    }
  }

  const sessionsDir = resolve(aiddDir, 'sessions');
  if (existsSync(sessionsDir)) {
    try {
      const sessionFiles = readdirSync(sessionsDir).filter((f) => f.endsWith('.json'));
      if (sessionFiles.length > 0) {
        let pruneAfterDays = 90;
        try {
          const cfg = JSON.parse(readFileSync(resolve(aiddDir, 'config.json'), 'utf-8'));
          pruneAfterDays = cfg.memory?.pruneAfterDays ?? 90;
        } catch { /* use default */ }

        const cutoff = Date.now() - (pruneAfterDays * 24 * 60 * 60 * 1000);
        const stale = sessionFiles.filter((f) => {
          try { return statSync(resolve(sessionsDir, f)).mtimeMs < cutoff; }
          catch { return false; }
        });

        if (stale.length > 0) {
          warn(`${stale.length} session(s) older than ${pruneAfterDays} days`, 'Use aidd_memory_prune tool to clean up');
        } else {
          pass(`${sessionFiles.length} session(s), none stale`);
        }
      } else {
        info('No sessions recorded yet');
      }
    } catch { /* skip */ }
  }

  const totalBytes = dirSizeBytes(aiddDir);
  if (totalBytes > 50 * 1024 * 1024) {
    warn(`.aidd/ using ${formatBytes(totalBytes)}`, 'Consider pruning old sessions');
  } else {
    info(`.aidd/ disk usage: ${formatBytes(totalBytes)}`);
  }
} else {
  warn('.aidd/ directory not found');
  needsAiddSetup = true;
}

endSection();

// =========================================================================
// 10. Installed Agents
// =========================================================================
beginSection('Installed Agents', 'Detected AI editors/CLIs');

// Load registry from shared data file
let agentRegistry = [];
try {
  agentRegistry = JSON.parse(readFileSync(resolve(__dirname, 'agent-registry.json'), 'utf-8'));
} catch {
  warn('Could not load agent-registry.json');
}

const installedAgents = agentRegistry.filter((a) => {
  // Check project-relative files (e.g., .github/copilot-instructions.md)
  if (a.projectFiles?.some((f) => existsSync(resolve(root, f)))) return true;
  // Check home-relative files (strongest signal)
  if (a.files?.some((f) => existsSync(resolve(home, f)))) return true;
  // Check home-relative directories (must have real content)
  return a.paths.some((p) => isRealAgentDir(resolve(home, p)));
});

if (installedAgents.length === 0) {
  info('No AI agents detected');
} else {
  for (const agent of installedAgents) {
    pass(`${agent.displayName} ${DIM}(${agent.category})${RESET}`);
  }
}

endSection();

// =========================================================================
// 11. TypeScript (--deep only)
// =========================================================================
if (flags.deep) {
  beginSection('TypeScript', 'Type checking (deep)');

  info('Running pnpm mcp:typecheck...');
  try {
    execFileSync('pnpm', ['mcp:typecheck'], {
      cwd: root,
      encoding: 'utf-8',
      shell: true,
      timeout: 120_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    pass('pnpm mcp:typecheck passed (0 errors)');
  } catch (err) {
    const output = (err.stdout ?? '') + (err.stderr ?? '');
    const errorMatch = output.match(/Found (\d+) error/);
    if (errorMatch) {
      fail(`TypeScript: ${errorMatch[1]} error(s)`, 'Run: pnpm mcp:typecheck for details');
    } else {
      fail('pnpm mcp:typecheck failed');
    }
  }

  endSection();
}

// =========================================================================
// Summary
// =========================================================================
const totalMs = Math.round(performance.now() - totalStart);

if (flags.json) {
  // JSON output
  const result = {
    prefix: PREFIX,
    issues,
    warnings,
    totalMs,
    sections: sections.map(({ name, description, checks, durationMs }) => ({
      name,
      description,
      durationMs,
      checks,
    })),
  };
  console.log(JSON.stringify(result, null, 2));
} else {
  // Human output
  console.log();

  if (issues === 0 && warnings === 0) {
    console.log(`${PREFIX} ${GREEN}All checks passed!${RESET} ${DIM}(${totalMs}ms)${RESET}\n`);
  } else if (issues === 0) {
    console.log(`${PREFIX} ${YELLOW}${warnings} warning(s) — everything works, some optional setup pending${RESET} ${DIM}(${totalMs}ms)${RESET}\n`);
  } else {
    console.log(`${PREFIX} ${RED}${issues} issue(s), ${warnings} warning(s)${RESET} ${DIM}(${totalMs}ms)${RESET}\n`);
  }

  // Per-section timing (only in non-quiet mode)
  if (!flags.quiet && sections.length > 0) {
    const slowest = [...sections].sort((a, b) => b.durationMs - a.durationMs)[0];
    if (slowest && slowest.durationMs > 1000) {
      console.log(`${DIM}  Slowest: ${slowest.name} (${slowest.durationMs}ms)${RESET}\n`);
    }
  }
}

// =========================================================================
// Interactive: offer to create .aidd/ (or auto-create in --fix mode)
// =========================================================================
if (needsAiddSetup) {
  const shouldCreate = flags.fix || flags.json ? flags.fix : await (async () => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise((r) => {
      rl.question(`  ${YELLOW}→ Create .aidd/ directory structure now? (y/N) ${RESET}`, r);
    });
    rl.close();
    return answer.trim().toLowerCase() === 'y';
  })();

  if (shouldCreate) {
    const dirs = ['', 'sessions', 'evolution', 'branches', 'drafts'];
    for (const sub of dirs) {
      const dir = resolve(aiddDir, sub);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    }

    const configPath = resolve(aiddDir, 'config.json');
    if (!existsSync(configPath)) {
      const defaultConfig = {
        evolution: {
          enabled: true,
          autoApplyThreshold: 90,
          draftThreshold: 70,
          learningPeriodSessions: 5,
          killSwitch: false,
        },
        memory: {
          maxSessionHistory: 100,
          autoPromoteBranchDecisions: true,
          pruneAfterDays: 90,
        },
        modelTracking: {
          enabled: true,
          crossProject: false,
        },
        ci: {
          blockOn: ['security_critical', 'type_safety'],
          warnOn: ['code_style', 'documentation'],
          ignore: ['commit_format'],
        },
        content: {
          overrideMode: 'merge',
        },
      };
      writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2) + '\n');
      if (!flags.json) console.log(`  ${GREEN}✅ config.json created with defaults${RESET}`);
    }

    const gitignorePath = resolve(root, '.gitignore');
    if (existsSync(gitignorePath)) {
      const gitignore = readFileSync(gitignorePath, 'utf-8');
      if (!gitignore.includes('.aidd/') && !gitignore.includes('.aidd\n')) {
        appendFileSync(gitignorePath, '\n# AIDD runtime state\n.aidd/\n');
        if (!flags.json) console.log(`  ${GREEN}✅ .aidd/ added to .gitignore${RESET}`);
      }
    }

    if (!flags.json) console.log(`  ${GREEN}✅ .aidd/ created with sessions/, evolution/, branches/, drafts/${RESET}\n`);
  } else if (!flags.json) {
    console.log(`  ${DIM}→ Skipped. Run pnpm mcp:setup later to initialize.${RESET}\n`);
  }
}

// Exit codes: 0=ok, 1=warnings only, 2=errors
process.exit(issues > 0 ? 2 : warnings > 0 ? 1 : 0);
