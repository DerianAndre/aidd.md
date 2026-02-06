#!/usr/bin/env node
/**
 * MCP Doctor — Full diagnostic of the AIDD MCP environment.
 * Usage: node scripts/mcp-doctor.mjs
 */
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, appendFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const home = homedir();

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
function info(msg) { console.log(`  ${DIM}ℹ  ${msg}${RESET}`); }

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

/**
 * Parse YAML frontmatter from a markdown string.
 * Returns key-value object or null if no frontmatter found.
 */
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
 * Get command lines of all running processes (for MCP server detection).
 * Returns array of command-line strings, or null if detection unavailable.
 */
function getRunningProcessCommandLines() {
  try {
    if (process.platform === 'win32') {
      // PowerShell — wmic is deprecated on modern Windows
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

/**
 * Resolve the entry-point file for an MCP server config.
 * Returns absolute path or null if unresolvable.
 */
function resolveServerEntryPoint(config) {
  const cmd = config.command ?? '';
  const args = config.args ?? [];
  const serverCwd = (config.cwd ?? '').replace(/\$\{workspaceFolder\}/g, root) || root;

  if (/\bnode(\.exe)?$/.test(cmd)) {
    const script = args.find((a) => /\.(m?js|cjs|ts)$/.test(a));
    if (script) {
      // Can't resolve paths with unresolvable template variables
      if (script.includes('${') && !script.includes('${workspaceFolder}')) return null;
      return resolve(serverCwd, script.replace(/\$\{workspaceFolder\}/g, root));
    }
  }
  // Commands with template variables can't be resolved
  if (cmd.includes('${')) return null;
  return null;
}

/**
 * Determine runtime status of an MCP server.
 * Returns { status, detail? }
 */
function getMcpServerStatus(config, processLines) {
  if (config.disabled === true) return { status: 'disabled' };

  // HTTP/SSE transport servers (url-based) — always considered available
  if (config.url) {
    return { status: 'running' };
  }

  const cmd = config.command ?? '';
  const args = config.args ?? [];
  const entryPoint = resolveServerEntryPoint(config);

  // For "node" command: check if entry point exists
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

  // For "npx" command: match by package name in process list
  if (cmd === 'npx') {
    const pkg = args.find((a) => !a.startsWith('-'));
    if (pkg && processLines) {
      const isRunning = processLines.some((line) => line.includes(pkg));
      return { status: isRunning ? 'running' : 'not running' };
    }
    return processLines ? { status: 'not running' } : { status: 'unknown' };
  }

  // Plugin servers using ${CLAUDE_PLUGIN_ROOT} — can't resolve path
  if (cmd.includes('CLAUDE_PLUGIN_ROOT')) {
    if (processLines) {
      const isRunning = processLines.some((line) =>
        args.some((a) => !a.includes('$') && line.includes(a))
      );
      return { status: isRunning ? 'running' : 'not running' };
    }
    return { status: 'unknown' };
  }

  // For other commands: best-effort match by args
  if (processLines && args.length > 0) {
    const isRunning = processLines.some((line) => {
      const lower = line.toLowerCase();
      return args.some((a) => lower.includes(a.toLowerCase()));
    });
    return { status: isRunning ? 'running' : 'not running' };
  }

  return { status: 'unknown' };
}

console.log(`\n${BOLD}${PREFIX} Doctor${RESET}\n`);

// =========================================================================
// 1. Environment
// =========================================================================
console.log(`${DIM}Environment${RESET} ${DIM}— Node.js, pnpm${RESET}`);

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

// =========================================================================
// 2. aidd.md MCPs
// =========================================================================
console.log(`\n${DIM}aidd.md MCPs${RESET} ${DIM}— Package build status${RESET}`);

const mcpsDir = resolve(root, 'mcps');
const pkgsDir = resolve(root, 'packages');
const packages = [
  { name: '@aidd.md/mcp-shared', baseDir: pkgsDir, dir: 'shared', dist: 'dist/index.js' },
  { name: '@aidd.md/mcp', baseDir: mcpsDir, dir: 'mcp-aidd', dist: 'dist/index.js' },
  { name: '@aidd.md/mcp-core', baseDir: mcpsDir, dir: 'mcp-aidd-core', dist: 'dist/index.js' },
  { name: '@aidd.md/mcp-memory', baseDir: mcpsDir, dir: 'mcp-aidd-memory', dist: 'dist/index.js' },
  { name: '@aidd.md/mcp-tools', baseDir: mcpsDir, dir: 'mcp-aidd-tools', dist: 'dist/index.js' },
];

let built = 0;
let pkgExists = 0;

for (const pkg of packages) {
  const pkgDir = resolve(pkg.baseDir, pkg.dir);
  const distPath = resolve(pkgDir, pkg.dist);

  if (!existsSync(resolve(pkgDir, 'package.json'))) {
    continue; // Package not created yet — skip silently
  }

  pkgExists++;

  if (existsSync(distPath)) {
    built++;
    pass(`${pkg.name} built`);
  } else {
    fail(`${pkg.name} not built`);
  }
}

if (pkgExists === 0) {
  warn('No MCP packages found yet', 'Run: pnpm mcp:setup');
} else if (built === pkgExists) {
  pass(`${built}/${pkgExists} packages built`);
}

// Check key dependency (pnpm may hoist to workspace package node_modules)
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

console.log(`\n${DIM}MCPs installed${RESET} ${DIM}— External MCP servers${RESET}`);

// --- Discover MCP servers from all config sources ---
/** @type {Map<string, { config: any, label: string }>} */
const discoveredServers = new Map();

/** Read mcpServers from a JSON config file */
function collectServers(filePath, label) {
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
  collectServers(loc.path, loc.label);
}

// 2. Enabled Claude Code plugins that expose MCP servers
const userSettingsPath = resolve(home, '.claude', 'settings.json');
let enabledPlugins = {};
try {
  enabledPlugins = JSON.parse(readFileSync(userSettingsPath, 'utf-8')).enabledPlugins ?? {};
} catch { /* no settings */ }

// Scan plugin cache for enabled plugins with MCP servers
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

        // Find latest version directory
        const versions = readdirSync(pluginDir).filter((v) => {
          const vDir = resolve(pluginDir, v);
          return statSync(vDir).isDirectory();
        });
        if (versions.length === 0) continue;
        const latestDir = resolve(pluginDir, versions[versions.length - 1]);

        // Check .mcp.json at version root
        collectServers(resolve(latestDir, '.mcp.json'), 'plugin');

        // Check .claude-plugin/plugin.json for mcpServers
        const pluginJson = resolve(latestDir, '.claude-plugin', 'plugin.json');
        if (existsSync(pluginJson)) {
          collectServers(pluginJson, 'plugin');
        }
      }
    }
  } catch { /* skip unreadable plugin dirs */ }
}

// Also scan external_plugins — only collect if enabled via enabledMcpjsonServers
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

      // Check external_plugins — only if the server name is in enabledMcpjsonServers
      const extDir = resolve(mktDir, 'external_plugins');
      if (existsSync(extDir) && statSync(extDir).isDirectory()) {
        for (const plugin of readdirSync(extDir)) {
          if (!enabledMcpjsonServers.includes(plugin)) continue;
          const mcpFile = resolve(extDir, plugin, '.mcp.json');
          collectServers(mcpFile, 'plugin');
        }
      }
    }
  } catch { /* skip */ }
}

// --- Filter: only show servers that are enabled (not disabled, not empty) ---
// Remove disabled servers from display (user requested: don't show disabled)
for (const [name, { config }] of discoveredServers) {
  if (config.disabled === true) {
    discoveredServers.delete(name);
  }
}

if (discoveredServers.size === 0) {
  info('No MCP servers configured');
} else {
  // Get running processes once for all server checks
  const processLines = getRunningProcessCommandLines();

  for (const [name, { config, label }] of discoveredServers) {
    const { status, detail } = getMcpServerStatus(config, processLines);
    const suffix = detail ? ` (${detail})` : '';
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
        info(`${name} ${source} — unknown`);
        break;
    }
  }
}

// =========================================================================
// 3. aidd.md Framework
// =========================================================================
console.log(`\n${DIM}aidd.md Framework${RESET} ${DIM}— Content and structure${RESET}`);

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

// =========================================================================
// 4. Skills Validation
// =========================================================================
console.log(`\n${DIM}Skills Validation${RESET} ${DIM}— Frontmatter integrity${RESET}`);

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
      console.log(`      ${DIM}→ ${dir}: ${errs.join(', ')}${RESET}`);
    }
  }
} else {
  info('No skills to validate');
}

// =========================================================================
// 5. Cross-Reference Integrity
// =========================================================================
console.log(`\n${DIM}Cross-References${RESET} ${DIM}— AGENTS.md ↔ skills/${RESET}`);

if (existsSync(agentsPath) && skillDirs.length > 0) {
  try {
    const agentsContent = readFileSync(agentsPath, 'utf-8');
    // Extract skill dir refs like `skills/system-architect/` or `skills/system-architect/SKILL.md`
    const refs = [...agentsContent.matchAll(/skills\/([a-z0-9-]+)\/?/g)].map((m) => m[1]);
    const uniqueRefs = [...new Set(refs)];
    const missing = uniqueRefs.filter((ref) => !skillDirs.includes(ref));

    if (missing.length === 0) {
      pass(`AGENTS.md → skills/ (${uniqueRefs.length} refs, all valid)`);
    } else {
      warn(`AGENTS.md references ${missing.length} missing skill(s):`);
      for (const m of missing) {
        console.log(`      ${DIM}→ skills/${m}/ not found${RESET}`);
      }
    }
  } catch {
    warn('Could not check cross-references');
  }
} else {
  info('Skipping cross-reference check (missing AGENTS.md or skills/)');
}

// =========================================================================
// 6. Model Matrix
// =========================================================================
console.log(`\n${DIM}Model Matrix${RESET} ${DIM}— SSOT sync and freshness${RESET}`);

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

// =========================================================================
// 7. Project State (.aidd/)
// =========================================================================
console.log(`\n${DIM}Project State (.aidd/)${RESET} ${DIM}— Config, sessions, storage${RESET}`);

let needsAiddSetup = false;
const aiddDir = resolve(root, '.aidd');
if (existsSync(aiddDir)) {
  pass('.aidd/ directory found');

  // --- Config schema validation ---
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

      // Validate evolution sub-keys
      if (config.evolution) {
        const evo = config.evolution;
        if (typeof evo.autoApplyThreshold === 'number' && (evo.autoApplyThreshold < 0 || evo.autoApplyThreshold > 100)) {
          warn('config.json: evolution.autoApplyThreshold should be 0-100');
        }
        if (typeof evo.draftThreshold === 'number' && (evo.draftThreshold < 0 || evo.draftThreshold > 100)) {
          warn('config.json: evolution.draftThreshold should be 0-100');
        }
      }

      // Validate content.overrideMode
      if (config.content?.overrideMode && !['merge', 'project_only', 'bundled_only'].includes(config.content.overrideMode)) {
        warn(`config.json: content.overrideMode "${config.content.overrideMode}" invalid (merge|project_only|bundled_only)`);
      }
    } catch {
      fail('config.json invalid JSON');
    }
  } else {
    warn('config.json not found (using defaults)', 'Run: pnpm mcp:doctor to create');
  }

  // --- Subdirectory checks ---
  const requiredDirs = ['sessions', 'evolution', 'branches', 'drafts'];
  for (const sub of requiredDirs) {
    const subDir = resolve(aiddDir, sub);
    if (existsSync(subDir)) {
      pass(`${sub}/ exists`);
    } else {
      warn(`${sub}/ missing`, 'Run: pnpm mcp:setup');
    }
  }

  // --- Stale sessions ---
  const sessionsDir = resolve(aiddDir, 'sessions');
  if (existsSync(sessionsDir)) {
    try {
      const sessionFiles = readdirSync(sessionsDir).filter((f) => f.endsWith('.json'));
      if (sessionFiles.length > 0) {
        let pruneAfterDays = 90;
        try {
          const config = JSON.parse(readFileSync(resolve(aiddDir, 'config.json'), 'utf-8'));
          pruneAfterDays = config.memory?.pruneAfterDays ?? 90;
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

  // --- Disk usage ---
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

// =========================================================================
// 8. Installed Agents
// =========================================================================
console.log(`\n${DIM}Installed Agents${RESET} ${DIM}— Detected AI editors/CLIs${RESET}`);

/**
 * Check if a directory is a real agent install (not just a skills/ dir
 * created by the Vercel skills CLI installer).
 * Returns true if the dir has files or subdirs beyond just "skills/".
 */
function isRealAgentDir(dirPath) {
  if (!existsSync(dirPath)) return false;
  try {
    const st = statSync(dirPath);
    if (!st.isDirectory()) return true; // file existence = real
    const entries = readdirSync(dirPath);
    // If the directory only contains "skills", it was created by the skills installer
    if (entries.length === 1 && entries[0] === 'skills') return false;
    // If empty, not real
    if (entries.length === 0) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Agent registry. Each entry uses `require` files for strict detection:
 * - paths: directories to check (must pass isRealAgentDir)
 * - files: specific files whose existence confirms the agent (bypasses dir check)
 */
const agentRegistry = [
  { name: 'claude-code', displayName: 'Claude Code', category: 'CLI', paths: [resolve(home, '.claude')] },
  { name: 'cursor', displayName: 'Cursor', category: 'IDE', paths: [resolve(home, '.cursor')] },
  { name: 'windsurf', displayName: 'Windsurf', category: 'IDE', paths: [resolve(home, '.codeium', 'windsurf')], files: [resolve(home, '.codeium', 'windsurf', 'settings.json')] },
  { name: 'codex', displayName: 'Codex', category: 'CLI', paths: [resolve(home, '.codex')] },
  { name: 'gemini-cli', displayName: 'Gemini CLI', category: 'CLI', paths: [], files: [resolve(home, '.gemini', 'settings.json'), resolve(home, '.gemini', 'GEMINI.md')] },
  { name: 'github-copilot', displayName: 'GitHub Copilot', category: 'Extension', paths: [], files: [resolve(home, '.copilot', 'config.json'), resolve(root, '.github', 'copilot-instructions.md')] },
  { name: 'amp', displayName: 'Amp', category: 'CLI', paths: [resolve(home, '.config', 'amp')] },
  { name: 'cline', displayName: 'Cline', category: 'Extension', paths: [resolve(home, '.cline')] },
  { name: 'roo', displayName: 'Roo Code', category: 'Extension', paths: [resolve(home, '.roo')] },
  { name: 'kilo', displayName: 'Kilo Code', category: 'Extension', paths: [resolve(home, '.kilocode')] },
  { name: 'goose', displayName: 'Goose', category: 'CLI', paths: [resolve(home, '.config', 'goose')] },
  { name: 'opencode', displayName: 'OpenCode', category: 'CLI', paths: [resolve(home, '.config', 'opencode')] },
  { name: 'trae', displayName: 'Trae', category: 'IDE', paths: [resolve(home, '.trae')] },
  { name: 'continue', displayName: 'Continue', category: 'Extension', paths: [resolve(home, '.continue')], files: [resolve(home, '.continue', 'config.json')] },
  { name: 'kiro-cli', displayName: 'Kiro CLI', category: 'CLI', paths: [resolve(home, '.kiro')] },
  { name: 'droid', displayName: 'Droid', category: 'CLI', paths: [resolve(home, '.factory')] },
  { name: 'augment', displayName: 'Augment', category: 'Extension', paths: [resolve(home, '.augment')] },
  { name: 'junie', displayName: 'Junie', category: 'IDE', paths: [resolve(home, '.junie')] },
  { name: 'antigravity', displayName: 'Antigravity', category: 'Extension', paths: [resolve(home, '.gemini', 'antigravity')] },
  { name: 'openclaw', displayName: 'OpenClaw', category: 'CLI', paths: [resolve(home, '.openclaw'), resolve(home, '.clawdbot'), resolve(home, '.moltbot')] },
  { name: 'zencoder', displayName: 'Zencoder', category: 'Extension', paths: [resolve(home, '.zencoder')] },
  { name: 'neovate', displayName: 'Neovate', category: 'Extension', paths: [resolve(home, '.neovate')] },
  { name: 'openhands', displayName: 'OpenHands', category: 'CLI', paths: [resolve(home, '.openhands')] },
  { name: 'qwen-code', displayName: 'Qwen Code', category: 'CLI', paths: [resolve(home, '.qwen')] },
  { name: 'mistral-vibe', displayName: 'Mistral Vibe', category: 'CLI', paths: [resolve(home, '.vibe')] },
];

const installedAgents = agentRegistry.filter((a) => {
  // Check specific files first (strongest signal)
  if (a.files?.some((f) => existsSync(f))) return true;
  // Check directories (must have more than just skills/)
  return a.paths.some((p) => isRealAgentDir(p));
});

if (installedAgents.length === 0) {
  info('No AI agents detected');
} else {
  for (const agent of installedAgents) {
    pass(`${agent.displayName} ${DIM}(${agent.category})${RESET}`);
  }
}

// =========================================================================
// Summary
// =========================================================================
console.log();

if (issues === 0 && warnings === 0) {
  console.log(`${PREFIX} ${GREEN}All checks passed!${RESET}\n`);
} else if (issues === 0) {
  console.log(`${PREFIX} ${YELLOW}${warnings} warning(s) — everything works, some optional setup pending${RESET}\n`);
} else {
  console.log(`${PREFIX} ${RED}${issues} issue(s), ${warnings} warning(s)${RESET}\n`);
}

// =========================================================================
// Interactive: offer to create .aidd/
// =========================================================================
if (needsAiddSetup) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => {
    rl.question(`  ${YELLOW}→ Create .aidd/ directory structure now? (y/N) ${RESET}`, resolve);
  });
  rl.close();

  if (answer.trim().toLowerCase() === 'y') {
    const dirs = ['', 'sessions', 'evolution', 'branches', 'drafts'];
    for (const sub of dirs) {
      const dir = resolve(aiddDir, sub);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    }

    // Write default config.json
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
      console.log(`  ${GREEN}✅ config.json created with defaults${RESET}`);
    }

    // Auto-add .aidd/ to .gitignore if not already present
    const gitignorePath = resolve(root, '.gitignore');
    if (existsSync(gitignorePath)) {
      const gitignore = readFileSync(gitignorePath, 'utf-8');
      if (!gitignore.includes('.aidd/') && !gitignore.includes('.aidd\n')) {
        appendFileSync(gitignorePath, '\n# AIDD runtime state\n.aidd/\n');
        console.log(`  ${GREEN}✅ .aidd/ added to .gitignore${RESET}`);
      }
    }

    console.log(`  ${GREEN}✅ .aidd/ created with sessions/, evolution/, branches/, drafts/${RESET}\n`);
  } else {
    console.log(`  ${DIM}→ Skipped. Run pnpm mcp:setup later to initialize.${RESET}\n`);
  }
}

process.exit(issues > 0 ? 1 : 0);
